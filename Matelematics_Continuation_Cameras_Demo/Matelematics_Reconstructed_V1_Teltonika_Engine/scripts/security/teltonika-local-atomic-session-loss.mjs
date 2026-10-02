import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import assert from "node:assert/strict";
const container="supabase_db_recovery-20261001-175031";
const run=randomUUID(), vid=randomUUID(), did=randomUUID(), tag="atomic-kill-"+run.slice(0,8);
const imei="990"+BigInt("0x"+createHash("sha256").update(did).digest("hex").slice(0,10)).toString().padStart(12,"0");
const fp=createHash("sha256").update(run).digest("hex");
const original=readFileSync(new URL("./teltonika-local-atomic-experiment.sql",import.meta.url),"utf8");
assert.equal(original.split("DO $tests$").length,2,"Unexpected candidate layout");
const sessions=[];
function start(app) {
 const child=spawn("docker",["exec","-i","-e","PGAPPNAME="+app,container,"psql","-X","-q","-t","-A","-U","supabase_admin","-d","postgres","-v","ON_ERROR_STOP=1"],{stdio:["pipe","pipe","pipe"],shell:false});
 const s={child,app,out:"",err:""};
 child.stdout.on("data",b=>s.out+=b.toString()); child.stderr.on("data",b=>s.err+=b.toString());
 child.stdin.on("error",()=>{});
 s.done=new Promise(resolve=>{child.on("error",e=>resolve({code:-1,err:e.message}));child.on("close",code=>resolve({code,out:s.out,err:s.err}));});
 sessions.push(s); return s;
}
async function sql(text,app=tag+"-control") {
 const s=start(app); s.child.stdin.end("SET statement_timeout='30s'; SET lock_timeout='15s';\n"+text);
 const r=await s.done; if(r.code!==0) throw Error(r.err||"Docker/psql failed"); return r.out.trim();
}
async function until(check,label) {
 const end=Date.now()+12000;
 while(Date.now()<end){if(await check())return;await new Promise(r=>setTimeout(r,150));}
 throw Error("Timeout: "+label);
}
const claims="SELECT set_config('request.jwt.claims',jsonb_build_object('sub',(SELECT id FROM public.profiles WHERE role='matelematics_admin' LIMIT 1),'role','authenticated')::text,true);\n";
const tele=JSON.stringify({codec:"8E",recorded_at:"2026-10-01T00:00:00Z",io_values:{},metadata:{},signal_strength:3,ignition:true});
const pos=JSON.stringify({recorded_at:"2026-10-01T00:00:00Z",latitude:0,longitude:0,altitude:0,speed:0,heading:0});
const call="SELECT matelematics_ingest_lab.persist('"+imei+"','"+fp+"','"+tele+"'::jsonb,'"+pos+"'::jsonb,true);\n";
let attempted=false,passed=false,owned=false;
try {
 attempted=true;
 await sql(original.split("DO $tests$")[0]+
 "CREATE TABLE matelematics_ingest_lab.test_run(id uuid PRIMARY KEY); REVOKE ALL ON matelematics_ingest_lab.test_run FROM PUBLIC,anon,authenticated,service_role; INSERT INTO matelematics_ingest_lab.test_run VALUES('"+run+"');\n"+claims+
 "INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles,to_jsonb(v)||jsonb_build_object('id','"+vid+"'::uuid,'device_id',NULL,'name','ATOMIC CONCURRENCY "+run+"','registration','"+vid+"'))).* FROM public.vehicles v LIMIT 1;\n"+
 "INSERT INTO public.devices(id,company_id,vehicle_id,imei,status,last_seen_at) SELECT '"+did+"'::uuid,company_id,id,'"+imei+"','offline','2001-01-01T00:00:00Z' FROM public.vehicles WHERE id='"+vid+"';\n"+
 "DO $check$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.devices WHERE id='"+did+"') THEN RAISE EXCEPTION 'Fixture missing'; END IF; END $check$; COMMIT;",
 "matelematics-local-atomic-audit");
 owned=true;
 console.log("PASS: candidate et fixture installees dans le laboratoire fixe");
 const a=start(tag+"-A");
 a.child.stdin.write("BEGIN ISOLATION LEVEL READ COMMITTED; SET LOCAL statement_timeout='30s'; SET LOCAL idle_in_transaction_session_timeout='30s';\n"+claims+call+"\\echo FIRST_READY\n");
 await until(()=>a.out.includes("FIRST_READY"),"session A ready");
 assert.deepEqual(JSON.parse(a.out.split(/\r?\n/).filter(l=>l.startsWith("{")&&l.includes('"result"')).at(-1)),{result:"inserted",alerts_pending:true});
 // The first session is idle with all candidate writes still uncommitted.
 const killed=await sql("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name='"+tag+"-A' AND state='idle in transaction' AND pid<>pg_backend_pid();");
 assert.equal(killed,"t","Expected exactly one interrupted test session");
 const ar=await a.done;
 assert.notEqual(ar.code,0,"Interrupted psql unexpectedly succeeded");
 await sql("DO $check$ BEGIN IF EXISTS(SELECT 1 FROM public.positions WHERE device_id='"+did+"') OR EXISTS(SELECT 1 FROM public.telemetry WHERE device_id='"+did+"') OR EXISTS(SELECT 1 FROM matelematics_ingest_lab.alert_work WHERE device_id='"+did+"') OR NOT EXISTS(SELECT 1 FROM public.devices WHERE id='"+did+"' AND status='offline' AND last_seen_at='2001-01-01T00:00:00Z') THEN RAISE EXCEPTION 'Partial write after session termination'; END IF; END $check$;");
 console.log("PASS: session interrompue avant COMMIT; aucune position, telemetrie ou tache; boitier inchange");
 const replay=await sql("BEGIN;\n"+claims+call+"COMMIT;\n",tag+"-B");
 const result=out=>JSON.parse(out.split(/\r?\n/).filter(l=>l.startsWith("{")&&l.includes('"result"')).at(-1));
 assert.deepEqual(result(replay),{result:"inserted",alerts_pending:true});
 const duplicate=await sql("BEGIN;\n"+claims+call+"COMMIT;\n",tag+"-B");
 assert.deepEqual(result(duplicate),{result:"duplicate",alerts_pending:true});
 await sql("DO $check$ BEGIN IF (SELECT count(*) FROM public.positions WHERE device_id='"+did+"')<>1 OR (SELECT count(*) FROM public.telemetry WHERE device_id='"+did+"')<>1 OR (SELECT count(*) FROM matelematics_ingest_lab.alert_work WHERE device_id='"+did+"' AND completed_at IS NULL)<>1 OR NOT EXISTS(SELECT 1 FROM public.devices WHERE id='"+did+"' AND status='online') THEN RAISE EXCEPTION 'Replay counts invalid'; END IF; END $check$;");
 passed=true;
 console.log("INTERRUPTION AVANT COMMIT ET REPRISE : PASS; inserted puis duplicate; 1 position / 1 telemetrie / 1 travail");
} catch(e) {console.error("INTERRUPTION FAIL: "+e.message);process.exitCode=1;}
finally {
 if(attempted) {
  try {
   await sql("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name IN ('"+tag+"-A','"+tag+"-B') AND pid<>pg_backend_pid();");
   await Promise.all(sessions.filter(s=>s.app===tag+"-A"||s.app===tag+"-B").map(s=>s.done));
   const exists=await sql("SELECT to_regnamespace('matelematics_ingest_lab') IS NOT NULL;");
   if(exists==="t") {
    // Marker prevents deleting another run's schema after a rejected setup.
    await sql("BEGIN; DO $guard$ BEGIN IF NOT EXISTS(SELECT 1 FROM matelematics_ingest_lab.test_run WHERE id='"+run+"') THEN RAISE EXCEPTION 'Cleanup ownership mismatch'; END IF; IF EXISTS(SELECT 1 FROM matelematics_ingest_lab.alert_work WHERE device_id<>'"+did+"') THEN RAISE EXCEPTION 'Unexpected work row'; END IF; END $guard$;\n"+claims+
    "DELETE FROM matelematics_ingest_lab.alert_work WHERE device_id='"+did+"'; DELETE FROM public.positions WHERE device_id='"+did+"'; DELETE FROM public.telemetry WHERE device_id='"+did+"'; DELETE FROM public.devices WHERE id='"+did+"' AND imei='"+imei+"'; DELETE FROM public.vehicles WHERE id='"+vid+"' AND name='ATOMIC CONCURRENCY "+run+"'; DROP INDEX public.telemetry_teltonika_lab_fingerprint_unique; DROP SCHEMA matelematics_ingest_lab CASCADE;\n"+
    "DO $check$ BEGIN IF EXISTS(SELECT 1 FROM public.positions WHERE device_id='"+did+"') OR EXISTS(SELECT 1 FROM public.telemetry WHERE device_id='"+did+"') OR EXISTS(SELECT 1 FROM public.devices WHERE id='"+did+"') OR EXISTS(SELECT 1 FROM public.vehicles WHERE id='"+vid+"') OR to_regnamespace('matelematics_ingest_lab') IS NOT NULL OR to_regclass('public.telemetry_teltonika_lab_fingerprint_unique') IS NOT NULL THEN RAISE EXCEPTION 'Cleanup incomplete'; END IF; END $check$; COMMIT;");
   } else if(owned) {throw Error("Owned candidate disappeared unexpectedly");}
   console.log("PASS: nettoyage fixture/schema/index verifie");
   if(passed)console.log("TEST ET NETTOYAGE PASS; crash processus/hote, ACK reseau, RPC et worker non testes");
  }catch(e){process.exitCode=1;console.error("NETTOYAGE FAIL: "+e.message+"; run="+run+" device="+did+" vehicle="+vid);}
 }
}
