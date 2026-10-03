import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
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
const login="ingest_test_"+run.replaceAll("-","");
const secret=randomBytes(32).toString("hex");
const apply=readFileSync(new URL("./teltonika-native-schema-apply.sql",import.meta.url),"utf8");
const revert=readFileSync(new URL("./teltonika-native-schema-revert.sql",import.meta.url),"utf8");
let restricted: pg.Pool | null=null;
let setup=false,admin="",cid="";
const borrow={async connect(){ if(!restricted)throw Error("Restricted pool missing");return restricted.connect();}};
function input(speed:number,offset:number){
 const timestamp=new Date(Date.now()-60000+offset*1000).toISOString();
 const telemetry:NormalizedTelemetry={imei,codec:142,receivedAt:new Date().toISOString(),timestamp,priority:0,latitude:33,longitude:-7,altitude:0,angle:0,satellites:8,speedKph:speed,eventId:0,io:{io_66:13000},raw:{timestamp,priority:0,gps:{latitude:33,longitude:-7,altitude:0,angle:0,satellites:8,speedKph:speed},eventId:0,io:[]}};
 const can=normalizeCanV2(telemetry,{});
 const packet:AtomicPacket={imei,fingerprint:createHash("sha256").update(run+offset).digest("hex"),recordedAt:timestamp,position:{latitude:33,longitude:-7,altitude:0,speed,heading:0},telemetry:{codec:"8E",raw_payload:JSON.stringify(telemetry.raw),io_values:telemetry.io,can_payload:can,metadata:{test_run:run},signal_strength:3,battery_voltage:13,ignition:true}};
 return {packet,telemetry,can};
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
   await c.query(apply);
   await c.query("CREATE ROLE "+login+" LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '"+secret+"'");
   await c.query("GRANT matelematics_ingest_native TO "+login);
   await c.query("GRANT CONNECT ON DATABASE postgres TO "+login);
   const v=await c.query("INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles,to_jsonb(v)||jsonb_build_object('id',$1::uuid,'device_id',NULL,'name',$2::text,'registration',$3::text))).* FROM public.vehicles v LIMIT 1 RETURNING company_id",[vid,"NATIVE ATOMIC "+run,vid]);
   assert.ok(v.rows[0]);cid=v.rows[0].company_id;
   await c.query("INSERT INTO public.devices(id,company_id,vehicle_id,imei,status) VALUES($1,$2,$3,$4,'offline')",[did,cid,vid,imei]);
   // Explicit vehicle rule makes the fixture independent of company thresholds.
   await c.query("INSERT INTO public.alert_settings(company_id,vehicle_id,rule_key,enabled,threshold_value,severity) VALUES($1,$2,'overspeed',true,120,'high')",[cid,vid]);
   await c.query("COMMIT");setup=true;
  }catch(e){await c.query("ROLLBACK").catch(()=>{});throw e;}finally{c.release();}
  restricted=new pg.Pool({host:"127.0.0.1",port:55322,user:login,password:secret,database:"postgres",max:2,connectionTimeoutMillis:5000,application_name:"matelematics-ingest-restricted-test"});
  restricted.on("error",()=>console.error("Restricted local connection failed"));
  const identity=await restricted.query("SELECT session_user AS name,current_user AS active_role,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolreplication FROM pg_roles WHERE rolname=current_user");
  assert.deepEqual(identity.rows[0],{name:login,active_role:login,rolsuper:false,rolbypassrls:false,rolcreaterole:false,rolcreatedb:false,rolreplication:false});
  console.log("PASS: dedicated LOGIN authenticated without superuser or RLS bypass");
  const denials=[
    ["profile read","SELECT id FROM public.profiles LIMIT 1"],
    ["profile role change","UPDATE public.profiles SET role='matelematics_admin' WHERE false"],
    ["device company change","UPDATE public.devices SET company_id=company_id WHERE false"],
    ["vehicle name change","UPDATE public.vehicles SET name=name WHERE false"],
    ["positions delete","DELETE FROM public.positions WHERE false"],
    ["telemetry delete","DELETE FROM public.telemetry WHERE false"],
    ["alerts delete","DELETE FROM public.alerts WHERE false"],
    ["alert settings update","UPDATE public.alert_settings SET enabled=enabled WHERE false"],
    ["telemetry raw read","SELECT raw_payload FROM public.telemetry LIMIT 1"],
  ];
  for(const [name,query] of denials) {
    await assert.rejects(restricted.query(query), (e: unknown)=> (e as {code?:string}).code==="42501");
    console.log("PASS: denied "+name+" (42501)");
  }
  const high=input(150,0),normal=input(0,1),failed=input(150,2);
  async function persist(event:ReturnType<typeof input>,inject=false){
   return persistAtomicPacket(borrow,event.packet,async(client,d)=>{
    await syncCanAlertsInTransaction(client,{companyId:d.company_id,vehicleId:d.vehicle_id,deviceId:d.id,recordedAt:event.packet.recordedAt,telemetry:event.telemetry,canPayload:event.can});
    if(inject)throw Error("INJECT_AFTER_REAL_ALERTS");
   });
  }
  assert.equal((await persist(high)).duplicate,false);
  let alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1 AND alert_type='overspeed'",[vid]);
  assert.deepEqual(alerts.rows,[{status:"active"}]);
  assert.equal((await persist(high)).duplicate,true);
  assert.equal((await persist(normal)).duplicate,false);
  alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1 AND alert_type='overspeed'",[vid]);
  assert.deepEqual(alerts.rows,[{status:"resolved"}]);
  const before=await pool.query("SELECT last_seen_at FROM public.devices WHERE id=$1",[did]);
  await assert.rejects(persist(failed,true),/INJECT_AFTER_REAL_ALERTS/);
  const after=await pool.query("SELECT last_seen_at FROM public.devices WHERE id=$1",[did]);
  assert.equal(after.rows[0].last_seen_at.getTime(),before.rows[0].last_seen_at.getTime());
  const counts=await pool.query("SELECT (SELECT count(*)::int FROM public.positions WHERE device_id=$1) AS positions,(SELECT count(*)::int FROM public.telemetry WHERE device_id=$1) AS telemetry,(SELECT count(*)::int FROM public.alerts WHERE vehicle_id=$2) AS alerts",[did,vid]);
  assert.deepEqual(counts.rows[0],{positions:2,telemetry:2,alerts:1});
  alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1",[vid]);
  assert.deepEqual(alerts.rows,[{status:"resolved"}]);
  console.log("RESTRICTED INGEST LOGIN PASS: real SQL/alerts/replay/rollback and 9 forbidden operations");
 }catch(e){
  console.error("RESTRICTED INGEST LOGIN FAIL: "+(e instanceof Error?e.message:"unknown"));
  process.exitCode=1;
 }finally{
  if(restricted)await restricted.end();
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
    await c.query("REVOKE matelematics_ingest_native FROM "+login);
    await c.query("REVOKE CONNECT ON DATABASE postgres FROM "+login);
    await c.query("DROP ROLE "+login);
    await c.query(revert);
    const remaining=await c.query("SELECT EXISTS(SELECT 1 FROM public.vehicles WHERE id=$1) OR EXISTS(SELECT 1 FROM public.devices WHERE id=$2) OR EXISTS(SELECT 1 FROM public.positions WHERE device_id=$2) OR EXISTS(SELECT 1 FROM public.telemetry WHERE device_id=$2) OR EXISTS(SELECT 1 FROM public.alerts WHERE vehicle_id=$1) OR EXISTS(SELECT 1 FROM public.alert_settings WHERE vehicle_id=$1) OR to_regclass('public.telemetry_teltonika_fingerprint_unique') IS NOT NULL AS remains",[vid,did]);
    assert.equal(remaining.rows[0].remains,false);
    const roles=await c.query("SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ($1,'matelematics_ingest_native')",[login]);
    assert.equal(roles.rows[0].n,0);
    const policies=await c.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'native_ingest_%'");assert.equal(policies.rows[0].n,0);
    await c.query("COMMIT");
    console.log("PASS: fixtures, LOGIN, ingestion role, policies and index removed");
   }catch(e){await c.query("ROLLBACK").catch(()=>{});process.exitCode=1;console.error("CLEANUP FAIL: retain run="+run+" vehicle="+vid+" device="+did);}
   finally{c.release();}
  }
  await pool.end();
 }
}
void main();
