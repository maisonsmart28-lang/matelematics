import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.RLS_LOCAL_URL;
const key = process.env.RLS_LOCAL_PUBLIC_KEY;
let stage = "configuration";
const sessions = [];
async function request(path, token, method = "GET", body) {
  return fetch(url + "/rest/v1/" + path, {
    method, redirect: "manual", signal: AbortSignal.timeout(12000),
    headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const container = "supabase_db_recovery-20261001-175031";
const vehicle = randomUUID();
const foreignVehicle = randomUUID();
const foreignPartner = randomUUID();
const foreignCompany = randomUUID();
const fixtureId = -Date.now();
let cleanupRequired = false;
const uuid = value => { assert.match(value, /^[0-9a-f-]{36}$/i); return value; };
function sql(body) {
  return execFileSync("docker", ["exec", "-i", "-e", "PGAPPNAME=matelematics-jwt-positive-fixture", container,
    "psql", "-X", "-qAt", "-U", "supabase_admin", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: `BEGIN;
SET LOCAL statement_timeout='15s';
DO $guard$ BEGIN
IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
 OR inet_server_addr() IS NOT NULL OR to_regprocedure('matelematics_rls_lab.company_ids()') IS NULL
THEN RAISE EXCEPTION 'Local optimized lab required'; END IF;
END $guard$;
${body}
COMMIT;`, encoding: "utf8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"],
  });
}

try {
 assert.equal(url,"http://127.0.0.1:55321");
 assert.ok(key && !key.startsWith("sb_secret_"));
 const endpoint=execFileSync("docker",["context","inspect","--format","{{.Endpoints.docker.Host}}"],{encoding:"utf8"}).trim();
 assert.ok(endpoint.startsWith("npipe://"));
 stage="connexion matelematics_admin";
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 sessions.push({client});
 const login=await client.auth.signInWithPassword({email:process.env.RLS_TEST_A_EMAIL,password:process.env.RLS_TEST_A_PASSWORD});
 assert.ok(!login.error && login.data.session);
 const token=login.data.session.access_token;
 const profile=await client.from("profiles").select("role,company_id").eq("id",login.data.user.id).single();
 assert.ok(!profile.error && profile.data?.role==="matelematics_admin");
 const ownCompany=uuid(profile.data.company_id);
 stage="preparation fixtures";
 cleanupRequired=true;
 sql(`
DO $fixture$
DECLARE v jsonb; p jsonb; t jsonb; admin_id uuid; own_company uuid; side integer; cid uuid; vid uuid; rid bigint;
BEGIN
 SELECT id INTO admin_id FROM public.profiles WHERE role='matelematics_admin' LIMIT 1;
 IF admin_id IS NULL THEN RAISE EXCEPTION 'Admin fixture missing'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 SELECT id INTO own_company FROM public.companies WHERE id='${ownCompany}' LIMIT 1;
 SELECT to_jsonb(x) INTO v FROM public.vehicles x LIMIT 1;
 SELECT to_jsonb(x) INTO p FROM public.positions x LIMIT 1;
 SELECT to_jsonb(x) INTO t FROM public.telemetry x LIMIT 1;
 IF own_company IS NULL OR v IS NULL OR p IS NULL OR t IS NULL THEN RAISE EXCEPTION 'Sources missing'; END IF;
 INSERT INTO public.partners(id,name) VALUES('${foreignPartner}','RLS JWT PARTNER ${foreignPartner}');
 INSERT INTO public.companies(id,name,partner_id) VALUES('${foreignCompany}','RLS JWT PARTNER ${foreignCompany}','${foreignPartner}');
 FOR side IN 1..2 LOOP
  cid:=CASE WHEN side=1 THEN own_company ELSE '${foreignCompany}'::uuid END;
  vid:=CASE WHEN side=1 THEN '${vehicle}'::uuid ELSE '${foreignVehicle}'::uuid END;
  rid:=${fixtureId}-side;
  IF EXISTS(SELECT 1 FROM public.positions WHERE id=rid) OR EXISTS(SELECT 1 FROM public.telemetry WHERE id=rid)
  THEN RAISE EXCEPTION 'Collision'; END IF;
  INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles,v ||
   jsonb_build_object('id',vid,'company_id',cid,'device_id',NULL,'name','RLS JWT PARTNER '||vid,'registration',vid::text))).*;
  INSERT INTO public.positions SELECT (jsonb_populate_record(NULL::public.positions,p ||
   jsonb_build_object('id',rid,'company_id',cid,'vehicle_id',vid,'device_id',NULL,'recorded_at',now(),
   'latitude',0,'longitude',0,'speed',0))).*;
  INSERT INTO public.telemetry SELECT (jsonb_populate_record(NULL::public.telemetry,t ||
   jsonb_build_object('id',rid,'company_id',cid,'vehicle_id',vid,'device_id',NULL,'recorded_at',now(),
   'source','rls-jwt-partner','raw_payload',NULL,'io_values','{}'::jsonb,'can_payload',NULL,'metadata','{}'::jsonb))).*;
 END LOOP;
END $fixture$;`);
 for(const table of ["positions","telemetry"]) {
  for(const [vid,own] of [[vehicle,true],[foreignVehicle,false]]) {
   stage=table+(own ? " lecture propre" : " refus partenaire etranger");
   const response=await request(`${table}?select=id&vehicle_id=eq.${vid}`,token);
   assert.equal(response.status,200);
   const rows=await response.json();
   assert.deepEqual(rows,[{id:fixtureId-(own ? 1 : 2)}]);
   console.log(`PASS: matelematics_admin ${table}, ${own ? "fixture entreprise rattachee visible" : "fixture autre partenaire visible"}`);
  }
 }
 console.log("ADMINISTRATEUR GLOBAL JWT LOCAL : 4 LECTURES PASS; politiques ecriture et retour arriere non testes");
} catch {
 console.error(`FAIL: ${stage}; aucun secret ni releve brut affiche`);
 process.exitCode=1;
} finally {
 if(cleanupRequired) {
  try {
   sql(`
DO $cleanup$
DECLARE vid uuid; rid bigint; side integer;
BEGIN
 FOR side IN 1..2 LOOP
  vid:=CASE WHEN side=1 THEN '${vehicle}'::uuid ELSE '${foreignVehicle}'::uuid END;
  rid:=${fixtureId}-side;
  IF EXISTS(SELECT 1 FROM public.vehicles WHERE id=vid AND name IS DISTINCT FROM 'RLS JWT PARTNER '||vid)
  THEN RAISE EXCEPTION 'Vehicle marker mismatch'; END IF;
  DELETE FROM public.telemetry WHERE id=rid AND vehicle_id=vid;
  DELETE FROM public.positions WHERE id=rid AND vehicle_id=vid;
  DELETE FROM public.vehicles WHERE id=vid AND name='RLS JWT PARTNER '||vid;
  IF EXISTS(SELECT 1 FROM public.telemetry WHERE vehicle_id=vid)
  OR EXISTS(SELECT 1 FROM public.positions WHERE vehicle_id=vid)
  OR EXISTS(SELECT 1 FROM public.vehicles WHERE id=vid) THEN RAISE EXCEPTION 'Cleanup incomplete'; END IF;
 END LOOP;
 DELETE FROM public.companies WHERE id='${foreignCompany}' AND name='RLS JWT PARTNER ${foreignCompany}' AND partner_id='${foreignPartner}';
 DELETE FROM public.partners WHERE id='${foreignPartner}' AND name='RLS JWT PARTNER ${foreignPartner}';
 IF EXISTS(SELECT 1 FROM public.companies WHERE id='${foreignCompany}')
 OR EXISTS(SELECT 1 FROM public.partners WHERE id='${foreignPartner}') THEN RAISE EXCEPTION 'Cleanup incomplete'; END IF;
END $cleanup$;`);
   console.log("PASS: deux positions, deux telemetries, deux vehicules, entreprise et partenaire fictifs supprimes; absence verifiee");
  } catch {
   console.error(JSON.stringify({event:"cleanup-failed",vehicle,foreignVehicle,foreignCompany,foreignPartner,fixtureId}));
   process.exitCode=1;
  }
 }
 for(const {client} of sessions) {
  try {const r=await client.auth.signOut({scope:"local"});assert.ok(!r.error);}
  catch {console.error("FAIL: deconnexion locale");process.exitCode=1;}
 }
}
