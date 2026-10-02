import net from "node:net";
import { once } from "node:events";
import { attachTeltonikaProtocol } from "../../server/teltonika/protocol";
import { registerDevice } from "../../server/teltonika/registry";
import { crc16Ibm } from "../../server/teltonika/crc16";
import { buildTelemetryIngestFingerprint } from "../../server/teltonika/telemetry-quality";
import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { persistAtomicPacket, type AtomicPacket } from "../../server/teltonika/atomic-storage";
import { syncCanAlertsInTransaction } from "../../server/teltonika/storage";
import { normalizeCanV2 } from "../../server/teltonika/can/normalizer";
import type { NormalizedTelemetry } from "../../server/teltonika/types";

// Fixed recovery lab; no .env loading, no remote URL accepted.
const pool=new pg.Pool({host:"127.0.0.1",port:55322,user:"supabase_admin",password:process.env.MATELEMATICS_LOCAL_DB_PASSWORD??"postgres",database:"postgres",max:2,connectionTimeoutMillis:5000,application_name:"matelematics-native-atomic-test"});
pool.on("error",()=>console.error("LOCAL PostgreSQL connection failed"));
const vid=randomUUID(),did=randomUUID(),run=randomUUID();
const imei="990"+BigInt("0x"+createHash("sha256").update(run).digest("hex").slice(0,10)).toString().padStart(12,"0");
let setup=false,admin="",cid="";
const borrow={async connect(){
 const c=await pool.connect();
 try{await c.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:admin,role:"authenticated"})]);return c;}
 catch(e){c.release(true);throw e;}
}};
function input(speed:number,offset:number){
 const timestamp=new Date(Date.now()-60000+offset*1000).toISOString();
 const telemetry:NormalizedTelemetry={imei,codec:142,receivedAt:new Date().toISOString(),timestamp,priority:0,latitude:33,longitude:-7,altitude:0,angle:0,satellites:8,speedKph:speed,eventId:0,io:{io_66:13000},raw:{timestamp,priority:0,gps:{latitude:33,longitude:-7,altitude:0,angle:0,satellites:8,speedKph:speed},eventId:0,io:[]}};
 const can=normalizeCanV2(telemetry,{});
 const packet:AtomicPacket={imei,fingerprint:createHash("sha256").update(run+offset).digest("hex"),recordedAt:timestamp,position:{latitude:33,longitude:-7,altitude:0,speed,heading:0},telemetry:{codec:"8E",raw_payload:JSON.stringify(telemetry.raw),io_values:telemetry.io,can_payload:can,metadata:{test_run:run},signal_strength:3,battery_voltage:13,ignition:true}};
 return {packet,telemetry,can};
}

let server: net.Server | null = null;
const sockets = new Set<net.Socket>();
let blockCommit: Promise<void> | null = null;
let commitReached: (() => void) | null = null;
let dropAck = false, failAlerts = false;
let releaseCommit: (() => void) | null = null;
const transactionalPool = { async connect() {
 const client = await borrow.connect();
 return {
  async query(sql: string, values?: unknown[]) {
   if (sql === "COMMIT" && blockCommit) { commitReached?.(); await blockCommit; }
   return client.query(sql, values);
  },
  release(destroy?: boolean) { client.release(destroy); },
 };
}};
function frame(t: NormalizedTelemetry) {
 const b = Buffer.alloc(33);
 let p=0;
 b.writeBigUInt64BE(BigInt(Date.parse(t.timestamp)),p);p+=8;
 b.writeUInt8(t.priority,p++);
 b.writeInt32BE(Math.round(t.longitude*1e7),p);p+=4;
 b.writeInt32BE(Math.round(t.latitude*1e7),p);p+=4;
 b.writeInt16BE(t.altitude,p);p+=2;b.writeUInt16BE(t.angle,p);p+=2;
 b.writeUInt8(t.satellites,p++);b.writeUInt16BE(t.speedKph,p);p+=2;
 b.writeUInt8(66,p++);b.writeUInt8(1,p++); // event,total IO
 b.writeUInt8(0,p++); // N1
 b.writeUInt8(1,p++);b.writeUInt8(66,p++);b.writeUInt16BE(13000,p);p+=2; // N2
 b.writeUInt8(0,p++);b.writeUInt8(0,p++); // N4,N8
 assert.equal(p,b.length);
 const data=Buffer.concat([Buffer.from([8,1]),b,Buffer.from([1])]);
 const header=Buffer.alloc(8);header.writeUInt32BE(data.length,4);
 const crc=Buffer.alloc(4);crc.writeUInt32BE(crc16Ibm(data));
 return Buffer.concat([header,data,crc]);
}
async function until(check: () => boolean,label: string) {
 const end=Date.now()+5000;
 while(Date.now()<end) { if(check())return;await new Promise(r=>setTimeout(r,10)); }
 throw Error("TCP timeout: "+label);
}
async function client(port: number) {
 const socket=net.createConnection({host:"127.0.0.1",port});sockets.add(socket);
 let bytes=Buffer.alloc(0),closed=false;
 socket.on("data",b=>bytes=Buffer.concat([bytes,b]));
 socket.on("error",()=>{});
 socket.on("close",()=>{closed=true;sockets.delete(socket);});
 await once(socket,"connect");
 const login=Buffer.alloc(2);login.writeUInt16BE(imei.length);
 socket.write(Buffer.concat([login,Buffer.from(imei)]));
 async function read(n:number) {
  await until(()=>bytes.length>=n||closed,"response");
  if(bytes.length<n)throw Error("TCP_CLOSED_WITHOUT_ACK");
  const result=bytes.subarray(0,n);bytes=bytes.subarray(n);return result;
 }
 assert.equal((await read(1))[0],1);
 return {socket,read,buffered:()=>bytes.length,closed:()=>closed};
}
async function handle(t: NormalizedTelemetry) {
 const can=normalizeCanV2(t,{});
 const packet:AtomicPacket={imei:t.imei,fingerprint:buildTelemetryIngestFingerprint(t),recordedAt:t.timestamp,
 position:{latitude:t.latitude,longitude:t.longitude,altitude:t.altitude,speed:t.speedKph,heading:t.angle},
 telemetry:{codec:t.codec===142?"8E":"8",raw_payload:JSON.stringify(t.raw),io_values:t.io,can_payload:can,metadata:{test_run:run},signal_strength:3,battery_voltage:13,ignition:true}};
 return persistAtomicPacket(transactionalPool,packet,async(tx,d)=>{
  await syncCanAlertsInTransaction(tx,{companyId:d.company_id,vehicleId:d.vehicle_id,deviceId:d.id,recordedAt:t.timestamp,telemetry:t,canPayload:can});
  if(failAlerts)throw Error("INJECT_AFTER_REAL_ALERTS");
 });
}
async function main(){
 try{
  const c=await pool.connect();
  try{
   await c.query("BEGIN");
   await c.query("SET LOCAL statement_timeout='20s'; SET LOCAL lock_timeout='5s'");
   const check=await c.query("SELECT session_user AS u,current_database() AS db,inet_server_port() AS port,to_regnamespace('matelematics_rls_lab') IS NOT NULL AS lab,to_regclass('public.telemetry_teltonika_fingerprint_unique') IS NULL AS free");
   assert.deepEqual(check.rows[0],{u:"supabase_admin",db:"postgres",port:5432,lab:true,free:true});
   const a=await c.query("SELECT id FROM public.profiles WHERE role='matelematics_admin' LIMIT 1");
   assert.ok(a.rows[0]);admin=a.rows[0].id;
   await c.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:admin,role:"authenticated"})]);
   await c.query("CREATE UNIQUE INDEX telemetry_teltonika_fingerprint_unique ON public.telemetry(company_id,device_id,(metadata->>'ingest_fingerprint')) WHERE source='teltonika' AND device_id IS NOT NULL AND metadata ? 'ingest_fingerprint'");
   const v=await c.query("INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles,to_jsonb(v)||jsonb_build_object('id',$1::uuid,'device_id',NULL,'name',$2::text,'registration',$3::text))).* FROM public.vehicles v LIMIT 1 RETURNING company_id",[vid,"NATIVE ATOMIC "+run,vid]);
   assert.ok(v.rows[0]);cid=v.rows[0].company_id;
   await c.query("INSERT INTO public.devices(id,company_id,vehicle_id,imei,status) VALUES($1,$2,$3,$4,'offline')",[did,cid,vid,imei]);
   // Explicit vehicle rule makes the fixture independent of company thresholds.
   await c.query("INSERT INTO public.alert_settings(company_id,vehicle_id,rule_key,enabled,threshold_value,severity) VALUES($1,$2,'overspeed',true,120,'high')",[cid,vid]);
   await c.query("COMMIT");setup=true;
  }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}finally{c.release();}
  const high=input(150,0),normal=input(0,1),failed=input(150,2);
  registerDevice({imei,clientId:cid,vehicleId:vid,label:"TCP atomic test"});
  server=net.createServer(socket=>{
   sockets.add(socket);socket.on("error",()=>{});socket.on("close",()=>sockets.delete(socket));
   attachTeltonikaProtocol(socket,async({normalized})=>{
    for(const t of normalized)await handle(t);
    if(dropAck){dropAck=false;socket.destroy();}
   });
  });
  server.listen(0,"127.0.0.1");await once(server,"listening");
  const address=server.address();assert.ok(address&&typeof address!=="string");
  const first=await client(address.port);
  let release!:()=>void;
  blockCommit=new Promise<void>(r=>{release=r;releaseCommit=r;});
  const reached=new Promise<void>(r=>commitReached=r);
  dropAck=true;
  first.socket.write(frame(high.telemetry));
  await Promise.race([reached,new Promise<never>((_,reject)=>setTimeout(()=>reject(Error("COMMIT gate timeout")),5000).unref())]);
  await new Promise(r=>setTimeout(r,50));
  assert.equal(first.buffered(),0);
  const uncommitted=await pool.query("SELECT count(*)::int AS n FROM public.telemetry WHERE device_id=$1",[did]);
  assert.equal(uncommitted.rows[0].n,0);
  console.log("PASS: aucun ACK ni telemetrie visible avant COMMIT");
  release();blockCommit=null;
  await assert.rejects(first.read(4),/TCP_CLOSED_WITHOUT_ACK/);
  assert.equal(first.buffered(),0);
  let alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1 AND alert_type='overspeed'",[vid]);
  assert.deepEqual(alerts.rows,[{status:"active"}]);
  console.log("PASS: COMMIT effectue puis connexion coupee avant ACK AVL");
  const replay=await client(address.port);
  replay.socket.write(frame(high.telemetry));
  assert.equal((await replay.read(4)).readUInt32BE(),1);
  const one=await pool.query("SELECT count(*)::int AS n FROM public.telemetry WHERE device_id=$1",[did]);assert.equal(one.rows[0].n,1);
  console.log("PASS: retransmission TCP acquittee sans doublon");
  replay.socket.write(frame(normal.telemetry));
  assert.equal((await replay.read(4)).readUInt32BE(),1);
  alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1 AND alert_type='overspeed'",[vid]);
  assert.deepEqual(alerts.rows,[{status:"resolved"}]);
  const before=await pool.query("SELECT last_seen_at FROM public.devices WHERE id=$1",[did]);
  failAlerts=true;
  replay.socket.write(frame(failed.telemetry));
  await assert.rejects(replay.read(4),/TCP_CLOSED_WITHOUT_ACK/);
  assert.equal(replay.buffered(),0);
  console.log("PASS: panne transactionnelle ferme TCP sans ACK AVL");
  const after=await pool.query("SELECT last_seen_at FROM public.devices WHERE id=$1",[did]);
  assert.equal(after.rows[0].last_seen_at.getTime(),before.rows[0].last_seen_at.getTime());
  const counts=await pool.query("SELECT (SELECT count(*)::int FROM public.positions WHERE device_id=$1) AS positions,(SELECT count(*)::int FROM public.telemetry WHERE device_id=$1) AS telemetry,(SELECT count(*)::int FROM public.alerts WHERE vehicle_id=$2) AS alerts",[did,vid]);
  assert.deepEqual(counts.rows[0],{positions:2,telemetry:2,alerts:1});
  alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1",[vid]);
  assert.deepEqual(alerts.rows,[{status:"resolved"}]);
  console.log("TCP ATOMIC SQL PASS: real sockets, COMMIT-before-ACK, lost ACK replay, alerts and rollback");
 }catch(e){
  console.error("TCP ATOMIC SQL FAIL: "+(e instanceof Error?e.message:"unknown"));
  process.exitCode=1;
 }finally{
  releaseCommit?.(); blockCommit=null;
  for(const socket of sockets)socket.destroy();
  if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));
  if(setup){
   const c=await pool.connect();
   try{
    await c.query("BEGIN");await c.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='20s'");
    await c.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:admin,role:"authenticated"})]);
    const own=await c.query("SELECT id FROM public.vehicles WHERE id=$1 AND name=$2",[vid,"NATIVE ATOMIC "+run]);assert.equal(own.rows.length,1);
    await c.query("DELETE FROM public.alerts WHERE vehicle_id=$1",[vid]);
    await c.query("DELETE FROM public.alert_settings WHERE vehicle_id=$1",[vid]);
    await c.query("DELETE FROM public.positions WHERE device_id=$1",[did]);
    await c.query("DELETE FROM public.telemetry WHERE device_id=$1",[did]);
    await c.query("DELETE FROM public.devices WHERE id=$1 AND imei=$2",[did,imei]);
    await c.query("DELETE FROM public.vehicles WHERE id=$1",[vid]);
    await c.query("DROP INDEX public.telemetry_teltonika_fingerprint_unique");
    const remaining=await c.query("SELECT EXISTS(SELECT 1 FROM public.vehicles WHERE id=$1) OR EXISTS(SELECT 1 FROM public.devices WHERE id=$2) OR EXISTS(SELECT 1 FROM public.positions WHERE device_id=$2) OR EXISTS(SELECT 1 FROM public.telemetry WHERE device_id=$2) OR EXISTS(SELECT 1 FROM public.alerts WHERE vehicle_id=$1) OR EXISTS(SELECT 1 FROM public.alert_settings WHERE vehicle_id=$1) OR to_regclass('public.telemetry_teltonika_fingerprint_unique') IS NOT NULL AS remains",[vid,did]);
    assert.equal(remaining.rows[0].remains,false);
    await c.query("COMMIT");
    console.log("PASS: native SQL fixture and temporary index cleanup verified");
   }catch(e){await c.query("ROLLBACK").catch(()=>{});process.exitCode=1;console.error("CLEANUP FAIL: retain run="+run+" vehicle="+vid+" device="+did);}
   finally{c.release();}
  }
  await pool.end();
 }
}
void main();
