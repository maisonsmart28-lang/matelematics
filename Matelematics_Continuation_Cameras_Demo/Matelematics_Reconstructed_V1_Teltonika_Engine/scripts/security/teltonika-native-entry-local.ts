import pg from "pg";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { persistAtomicPacket, type AtomicPacket } from "../../server/teltonika/atomic-storage";
import { persistTelemetry, closeAtomicStoragePool } from "../../server/teltonika/storage";
import { normalizeCanV2 } from "../../server/teltonika/can/normalizer";
import type { NormalizedTelemetry } from "../../server/teltonika/types";

// Fixed recovery lab; no .env loading, no remote URL accepted.
const pool=new pg.Pool({host:"127.0.0.1",port:55322,user:"supabase_admin",password:process.env.MATELEMATICS_LOCAL_DB_PASSWORD??"postgres",database:"postgres",max:2,connectionTimeoutMillis:5000,application_name:"matelematics-native-atomic-test"});
pool.on("error",()=>console.error("LOCAL PostgreSQL connection failed"));
const vid=randomUUID(),did=randomUUID(),run=randomUUID();
const schema="entry_test_"+run.replaceAll("-","");
const previousMode=process.env.TELTONIKA_STORAGE_MODE;
const previousUrl=process.env.TELTONIKA_DATABASE_URL;
const previousFleet=process.env.TELTONIKA_DEV_FLEET_COUNT;
process.env.TELTONIKA_STORAGE_MODE="atomic";
process.env.TELTONIKA_DEV_FLEET_COUNT="0";
process.env.TELTONIKA_DATABASE_URL="postgresql://supabase_admin:"+encodeURIComponent(process.env.MATELEMATICS_LOCAL_DB_PASSWORD??"postgres")+"@127.0.0.1:55322/postgres";
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
  async function persist(event:ReturnType<typeof input>) {
    return persistTelemetry(event.telemetry);
  }
  assert.equal((await persist(high)).duplicate,false);
  let alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1 AND alert_type='overspeed'",[vid]);
  assert.deepEqual(alerts.rows,[{status:"active"}]);
  assert.equal((await persist(high)).duplicate,true);
  assert.equal((await persist(normal)).duplicate,false);
  alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1 AND alert_type='overspeed'",[vid]);
  assert.deepEqual(alerts.rows,[{status:"resolved"}]);
  const before=await pool.query("SELECT last_seen_at FROM public.devices WHERE id=$1",[did]);
  // Fail late in the real entrypoint, after GPS, telemetry and alert mutations.
  const injection=await pool.connect();
  try {
   await injection.query("BEGIN");
   await injection.query("CREATE SCHEMA "+schema);
   await injection.query("REVOKE ALL ON SCHEMA "+schema+" FROM PUBLIC,anon,authenticated,service_role");
   await injection.query("CREATE FUNCTION "+schema+".fail_device() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $ BEGIN IF NEW.id='"+did+"'::uuid THEN RAISE EXCEPTION 'INJECT_DEVICE_UPDATE' USING ERRCODE='P1001'; END IF; RETURN NEW; END $");
   await injection.query("REVOKE ALL ON FUNCTION "+schema+".fail_device() FROM PUBLIC,anon,authenticated,service_role");
   await injection.query("CREATE TRIGGER "+schema+" BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION "+schema+".fail_device()");
   await injection.query("COMMIT");
  } catch(e){await injection.query("ROLLBACK");throw e;}finally{injection.release();}
  await assert.rejects(persist(failed),/INJECT_DEVICE_UPDATE/);
  const after=await pool.query("SELECT last_seen_at FROM public.devices WHERE id=$1",[did]);
  assert.equal(after.rows[0].last_seen_at.getTime(),before.rows[0].last_seen_at.getTime());
  const counts=await pool.query("SELECT (SELECT count(*)::int FROM public.positions WHERE device_id=$1) AS positions,(SELECT count(*)::int FROM public.telemetry WHERE device_id=$1) AS telemetry,(SELECT count(*)::int FROM public.alerts WHERE vehicle_id=$2) AS alerts",[did,vid]);
  assert.deepEqual(counts.rows[0],{positions:2,telemetry:2,alerts:1});
  alerts=await pool.query("SELECT status FROM public.alerts WHERE vehicle_id=$1",[vid]);
  assert.deepEqual(alerts.rows,[{status:"resolved"}]);
  console.log("NATIVE ENTRYPOINT PASS: persistTelemetry, SQL device lookup, alerts, duplicate and late rollback");
 }catch(e){
  console.error("NATIVE ENTRYPOINT FAIL: "+(e instanceof Error?e.message:"unknown"));
  process.exitCode=1;
 }finally{
  if(setup){
   const c=await pool.connect();
   try{
    await c.query("BEGIN");await c.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='20s'");
    await c.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:admin,role:"authenticated"})]);
    const own=await c.query("SELECT id FROM public.vehicles WHERE id=$1 AND name=$2",[vid,"NATIVE ATOMIC "+run]);assert.equal(own.rows.length,1);
    await c.query("DROP TRIGGER IF EXISTS "+schema+" ON public.devices");
    await c.query("DROP SCHEMA IF EXISTS "+schema+" CASCADE");
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
  await closeAtomicStoragePool();
  await pool.end();
  for (const [key,value] of [["TELTONIKA_STORAGE_MODE",previousMode],["TELTONIKA_DATABASE_URL",previousUrl],["TELTONIKA_DEV_FLEET_COUNT",previousFleet]] as const) {
    if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
 }
}
void main();
