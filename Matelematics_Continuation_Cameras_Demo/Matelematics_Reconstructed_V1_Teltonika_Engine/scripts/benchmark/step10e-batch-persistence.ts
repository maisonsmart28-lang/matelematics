import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

type Row = Record<string, unknown>;
type Cell = { batch:number; workers:number; rows:number; committed:number; failedBatches:number; retries:number; elapsedMs:number; rowsPerSecond:number; p50Ms:number; p95Ms:number; maxMs:number };

const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.SUPABASE_SECRET_KEY??process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error("Missing Supabase benchmark environment variables.");
const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const marker="benchmark_10e4d";
const batches=(process.env.BATCH10E4D_SIZES??"100,250,500,1000").split(",").map(Number);
const workersList=(process.env.BATCH10E4D_WORKERS??"1,2,4").split(",").map(Number);
const targetRows=Math.max(1000,Number(process.env.BATCH10E4D_ROWS??5000));
const retryMax=Math.max(0,Number(process.env.BATCH10E4D_RETRIES??2));
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

function percentile(v:number[],p:number){const s=[...v].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.max(0,Math.ceil(p*s.length)-1))]??0;}
function transient(error:unknown){const s=JSON.stringify(error).toLowerCase();return /timeout|fetch|network|connection|502|503|504|too many|temporar/.test(s);}

async function cleanup(){
 for(;;){
  const {data,error}=await supabase.from("telemetry").select("id").eq("source",marker).limit(250);
  if(error) throw new Error("cleanup select: "+error.message);
  if(!data?.length) return;
  const {error:del}=await supabase.from("telemetry").delete().in("id",data.map(r=>r.id));
  if(del) throw new Error("cleanup delete: "+del.message);
 }
}
async function remaining(){const {count,error}=await supabase.from("telemetry").select("id",{count:"exact",head:true}).eq("source",marker);if(error)throw error;return count??0;}
async function samples(limit:number){
 const {data,error}=await supabase.from("telemetry").select("company_id,vehicle_id,device_id,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition").neq("source",marker).order("recorded_at",{ascending:false}).limit(limit);
 if(error)throw error;if(!data?.length)throw new Error("No telemetry source rows available");return data as Row[];
}

async function main(){
 console.log(JSON.stringify({event:"batch-persistence-start",readOnly:false,marker,batches,workers:workersList,targetRowsPerCell:targetRows,retryMax}));
 await cleanup();
 const source=await samples(Math.max(...batches));
 let seq=0; const cells:Cell[]=[];
 try{
  for(const batch of batches) for(const workers of workersList){
   const rounds=Math.max(1,Math.ceil(targetRows/(batch*workers)));
   const latencies:number[]=[];let committed=0,failedBatches=0,retries=0;
   const cellStart=performance.now();
   for(let round=0;round<rounds;round++){
    const payloads=Array.from({length:workers},()=>Array.from({length:batch},(_,i)=>{
     const s=source[i%source.length];seq++;
     return {id:(-7_000_000_000_000_000n+BigInt(seq)).toString(),...s,source:marker,recorded_at:new Date(Date.now()-seq).toISOString()};
    }));
    await Promise.all(payloads.map(async(rows,worker)=>{
     let attempt=0;
     for(;;){
      const t0=performance.now(); const {error}=await supabase.from("telemetry").insert(rows); const ms=performance.now()-t0;
      if(!error){latencies.push(ms);committed+=rows.length;return;}
      if(attempt>=retryMax||!transient(error)){failedBatches++;throw new Error(`batch=${batch} workers=${workers} worker=${worker+1}: ${error.message}`);}
      attempt++;retries++;await sleep(500*Math.pow(2,attempt-1));
     }
    }));
   }
   const elapsedMs=performance.now()-cellStart;
   const cell={batch,workers,rows:rounds*batch*workers,committed,failedBatches,retries,elapsedMs:Number(elapsedMs.toFixed(2)),rowsPerSecond:Number((committed/(elapsedMs/1000)).toFixed(1)),p50Ms:Number(percentile(latencies,.5).toFixed(2)),p95Ms:Number(percentile(latencies,.95).toFixed(2)),maxMs:Number(Math.max(...latencies).toFixed(2))};
   cells.push(cell);console.log(JSON.stringify({event:"batch-persistence-cell",...cell}));
   await cleanup();const residue=await remaining();console.log(JSON.stringify({event:"batch-persistence-cell-cleanup",batch,workers,remainingRows:residue}));if(residue!==0)throw new Error("Benchmark residue detected; stopping.");
  }
 } finally {
  await cleanup();console.log(JSON.stringify({event:"batch-persistence-final-cleanup",remainingRows:await remaining()}));
 }
 const demand=[{vehicles:1000,rps:77.78},{vehicles:10000,rps:777.78},{vehicles:50000,rps:3888.89},{vehicles:100000,rps:7777.78}];
 const best=cells.reduce((a,b)=>b.rowsPerSecond>a.rowsPerSecond?b:a,cells[0]);
 console.log(JSON.stringify({event:"batch-persistence-summary",best,headroom:demand.map(d=>({vehicles:d.vehicles,requiredRps:d.rps,headroomX:Number((best.rowsPerSecond/d.rps).toFixed(2))})),limitations:["Measures client/network/PostgREST/current-schema path, not pure PostgreSQL capacity.","Average-load headroom alone is not production approval.","Production-like Infomaniak queue/worker and database resource metrics remain required."]}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
