import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";

for (const envFile of [".env.local", ".env"]) {
  if (!fs.existsSync(envFile)) continue;
  for (const raw of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Missing server-only DATABASE_URL.");

const MARKER = "benchmark_10e4f";
const TOTAL = Math.max(1000, Number(process.env.PG10E4F_ROWS || 1000));
const BATCH = Math.max(1, Number(process.env.PG10E4F_BATCH || 500));
const WORKERS = Math.max(1, Math.min(4, Number(process.env.PG10E4F_WORKERS || 2)));
const RETRIES = Math.max(0, Number(process.env.PG10E4F_RETRIES || 2));
const PRODUCER_RATE = Math.max(0, Number(process.env.PG10E4F_PRODUCER_RATE || 0));
const BURST_RATE = Math.max(0, Number(process.env.PG10E4F_BURST_RATE || 0));
const BURST_AFTER_MS = Math.max(0, Number(process.env.PG10E4F_BURST_AFTER_MS || 0));
const BURST_DURATION_MS = Math.max(0, Number(process.env.PG10E4F_BURST_DURATION_MS || 0));
const SPOOL = path.join(os.tmpdir(), `matelematics-${MARKER}-${process.pid}.jsonl`);

type Sample = {
  company_id: string; vehicle_id: number; device_id: string | null; codec: number | null;
  raw_payload: unknown; io_values: unknown; can_payload: unknown; metadata: unknown;
  signal_strength: number | null; battery_voltage: number | null; ignition: boolean | null;
};
type QueueRow = Sample & { id: number; recorded_at: string; enqueued_at: number };

const pool = new Pool({ connectionString, max: WORKERS, idleTimeoutMillis: 30000, connectionTimeoutMillis: 15000, application_name: "matelematics_step10e4f" });
const sleep = (ms:number) => new Promise(r => setTimeout(r, ms));
const percentile = (a:number[], p:number) => a.length ? a[Math.min(a.length-1, Math.floor((a.length-1)*p))] : 0;

async function cleanup() {
  await pool.query("delete from public.telemetry where source=$1", [MARKER]);
  const r = await pool.query("select count(*)::int as n from public.telemetry where source=$1", [MARKER]);
  return Number(r.rows[0].n);
}

async function insertBatch(rows: QueueRow[]) {
  const cols = ["id","company_id","vehicle_id","device_id","codec","raw_payload","io_values","can_payload","metadata","signal_strength","battery_voltage","ignition","source","recorded_at"];
  const values:any[]=[]; const tuples:string[]=[];
  rows.forEach((r,ri)=>{
    const vals=[r.id,r.company_id,r.vehicle_id,r.device_id,r.codec,r.raw_payload,r.io_values,r.can_payload,r.metadata,r.signal_strength,r.battery_voltage,r.ignition,MARKER,r.recorded_at];
    const off=ri*cols.length; values.push(...vals);
    tuples.push("(" + vals.map((_,i)=>"$"+(off+i+1)).join(",") + ")");
  });
  await pool.query(`insert into public.telemetry (${cols.join(",")}) values ${tuples.join(",")}`, values);
}

async function main() {
  let produced=0, committed=0, retries=0, failed=0, peakDepth=0;
  const latencies:number[]=[]; let producerDone=false; let cursor=0; let queue:QueueRow[]=[];
  try {
    await cleanup();
    const s = await pool.query<Sample>("select company_id,vehicle_id,device_id,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition from public.telemetry where source is distinct from $1 limit 1",[MARKER]);
    if (!s.rows[0]) throw new Error("No telemetry sample available.");
    const sample=s.rows[0];

    const start=performance.now();
    const out=fs.createWriteStream(SPOOL,{flags:"wx"});
    let producerEnd=0;
    const producer=async()=>{
      const producerStart=performance.now();
      for(let i=0;i<TOTAL;i++){
        const elapsed=performance.now()-producerStart;
        const inBurst=BURST_RATE>0 && elapsed>=BURST_AFTER_MS && elapsed<(BURST_AFTER_MS+BURST_DURATION_MS);
        const rate=inBurst ? BURST_RATE : PRODUCER_RATE;
        const row:QueueRow={...sample,id:-(9_000_000_000+i+process.pid*10000),recorded_at:new Date(Date.now()+i).toISOString(),enqueued_at:Date.now()};
        out.write(JSON.stringify(row)+"\\n"); queue.push(row); produced++; peakDepth=Math.max(peakDepth,queue.length-cursor);
        if(rate>0) await sleep(1000/rate);
      }
      await new Promise<void>((resolve,reject)=>{out.end(resolve);out.on("error",reject)});
      producerDone=true;
      producerEnd=performance.now();
    };

    const worker=async()=>{
      while(!producerDone || cursor<queue.length){
        if(cursor>=queue.length){await sleep(2);continue;}
        const begin=cursor;
        const available=Math.min(BATCH, queue.length-begin);
        if(available<=0){await sleep(2);continue;}
        cursor+=available;
        const rows=queue.slice(begin,begin+available);
        let attempt=0;
        while(true){
          const t=performance.now();
          try { await insertBatch(rows); latencies.push(performance.now()-t); committed+=rows.length; break; }
          catch(e){ if(attempt++>=RETRIES){failed+=rows.length; throw e;} retries++; await sleep(100*attempt); }
        }
      }
    };

    const drainStart=performance.now();
    await Promise.all([producer(), ...Array.from({length:WORKERS},()=>worker())]);
    const drainMs=performance.now()-drainStart;
    const totalMs=performance.now()-start;
    const producerMs=Math.max(0,producerEnd-start);
    const postProducerDrainMs=Math.max(0,performance.now()-producerEnd);
    const sorted=[...latencies].sort((a,b)=>a-b);
    const endDepth=produced-committed-failed;
    const oldestAgeMs=endDepth>0 ? Date.now()-queue[Math.min(committed,queue.length-1)].enqueued_at : 0;
    console.log(JSON.stringify({event:"queue-worker-result",marker:MARKER,spool:SPOOL,total:TOTAL,batch:BATCH,workers:WORKERS,producerRate:PRODUCER_RATE,burstRate:BURST_RATE,burstAfterMs:BURST_AFTER_MS,burstDurationMs:BURST_DURATION_MS,produced,committed,failed,retries,enqueueRowsPerSecond:+(produced/(producerMs/1000)).toFixed(1),dbRowsPerSecond:+(committed/(drainMs/1000)).toFixed(1),peakDepth,endDepth,oldestAgeMs,producerMs:+producerMs.toFixed(2),postProducerDrainMs:+postProducerDrainMs.toFixed(2),drainMs:+drainMs.toFixed(2),totalMs:+totalMs.toFixed(2),p50Ms:+percentile(sorted,.5).toFixed(2),p95Ms:+percentile(sorted,.95).toFixed(2),maxMs:+Math.max(0,...sorted).toFixed(2)}));
  } finally {
    const remaining=await cleanup().catch(()=>-1);
    if(fs.existsSync(SPOOL)) fs.unlinkSync(SPOOL);
    console.log(JSON.stringify({event:"queue-worker-cleanup",remainingRows:remaining,spoolRemoved:!fs.existsSync(SPOOL)}));
    await pool.end();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1});
