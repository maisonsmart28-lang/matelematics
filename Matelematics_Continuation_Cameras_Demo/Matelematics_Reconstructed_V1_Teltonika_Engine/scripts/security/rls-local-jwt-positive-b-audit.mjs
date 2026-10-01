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
  assert.equal(url, "http://127.0.0.1:55321");
  assert.ok(key && !key.startsWith("sb_secret_"));
  const endpoint = execFileSync("docker", ["context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], {encoding:"utf8"}).trim();
  assert.ok(endpoint.startsWith("npipe://"), "Local Docker Desktop required");
  for (const label of ["A", "B"]) {
    stage = `connexion ${label}`;
    const client = createClient(url, key, {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    sessions.push({client,label});
    const login = await client.auth.signInWithPassword({
      email:process.env[`RLS_TEST_${label}_EMAIL`], password:process.env[`RLS_TEST_${label}_PASSWORD`],
    });
    assert.ok(!login.error && login.data.session);
    sessions.at(-1).token = login.data.session.access_token;
    const profile = await client.from("profiles").select("role,company_id").eq("id",login.data.user.id).single();
    assert.ok(!profile.error && profile.data?.role==="user");
    sessions.at(-1).company=uuid(profile.data.company_id);
  }
  const [a,b]=sessions;
  assert.notEqual(a.company,b.company);
  stage="creation des fixtures locales";
  cleanupRequired=true; // Includes a lost response after COMMIT.
  sql(`
DO $fixture$
DECLARE v jsonb; p jsonb; t jsonb; admin_id uuid;
BEGIN
 SELECT id INTO admin_id FROM public.profiles WHERE role='matelematics_admin' LIMIT 1;
 IF admin_id IS NULL THEN RAISE EXCEPTION 'Admin fixture missing'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 SELECT to_jsonb(x) INTO v FROM public.vehicles x LIMIT 1;
 SELECT to_jsonb(x) INTO p FROM public.positions x LIMIT 1;
 SELECT to_jsonb(x) INTO t FROM public.telemetry x LIMIT 1;
 IF v IS NULL OR p IS NULL OR t IS NULL THEN RAISE EXCEPTION 'Source rows missing'; END IF;
 IF EXISTS(SELECT 1 FROM public.positions WHERE id=${fixtureId})
 OR EXISTS(SELECT 1 FROM public.telemetry WHERE id=${fixtureId})
 THEN RAISE EXCEPTION 'Fixture collision'; END IF;
 INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles,v ||
 jsonb_build_object('id','${vehicle}','company_id','${b.company}','device_id',NULL,
 'name','RLS JWT POSITIVE ${vehicle}','registration','${vehicle}'))).*;
 INSERT INTO public.positions SELECT (jsonb_populate_record(NULL::public.positions,p ||
 jsonb_build_object('id',${fixtureId},'company_id','${b.company}','vehicle_id','${vehicle}',
 'device_id',NULL,'recorded_at',now(),'latitude',0,'longitude',0,'speed',0))).*;
 INSERT INTO public.telemetry SELECT (jsonb_populate_record(NULL::public.telemetry,t ||
 jsonb_build_object('id',${fixtureId},'company_id','${b.company}','vehicle_id','${vehicle}',
 'device_id',NULL,'recorded_at',now(),'source','rls-jwt-positive',
 'raw_payload',NULL,'io_values','{}'::jsonb,'can_payload',NULL,'metadata','{}'::jsonb))).*;
END $fixture$;`);
  for(const table of ["positions","telemetry"]) {
    for(const actor of [b,a]) {
      stage=`${table} lecture ${actor.label}`;
      const response=await request(`${table}?select=id,company_id&vehicle_id=eq.${vehicle}`,actor.token);
      assert.equal(response.status,200);
      const rows=await response.json();
      if(actor===b) {
        assert.equal(rows.length,1);
        assert.equal(rows[0].id,fixtureId);
        assert.equal(rows[0].company_id,b.company);
        console.log(`PASS: B lit sa fixture ${table} via JWT/API`);
      } else {
        assert.deepEqual(rows,[]);
        console.log(`PASS: A ne voit pas la fixture ${table} de B`);
      }
    }
  }
  console.log("LECTURES POSITIVES B ET REFUS A : 4 CONTROLES PASS; administrateurs et politiques ecriture non testes");
} catch {
  console.error(`FAIL: ${stage}; aucun secret ni releve brut affiche`);
  process.exitCode=1;
} finally {
  if(cleanupRequired) {
    try {
      sql(`
DO $cleanup$ BEGIN
 IF EXISTS(SELECT 1 FROM public.vehicles WHERE id='${vehicle}'
 AND name IS DISTINCT FROM 'RLS JWT POSITIVE ${vehicle}') THEN RAISE EXCEPTION 'Marker mismatch'; END IF;
 DELETE FROM public.telemetry WHERE id=${fixtureId} AND vehicle_id='${vehicle}';
 DELETE FROM public.positions WHERE id=${fixtureId} AND vehicle_id='${vehicle}';
 DELETE FROM public.vehicles WHERE id='${vehicle}' AND name='RLS JWT POSITIVE ${vehicle}';
 IF EXISTS(SELECT 1 FROM public.telemetry WHERE vehicle_id='${vehicle}')
 OR EXISTS(SELECT 1 FROM public.positions WHERE vehicle_id='${vehicle}')
 OR EXISTS(SELECT 1 FROM public.vehicles WHERE id='${vehicle}')
 THEN RAISE EXCEPTION 'Cleanup incomplete'; END IF;
END $cleanup$;`);
      console.log("PASS: fixtures positions/telemetry/vehicule supprimees et absence verifiee");
    } catch {
      console.error(`FAIL: nettoyage local; reprise ciblee requise vehicle=${vehicle}, fixtureId=${fixtureId}`);
      process.exitCode=1;
    }
  }
  for(const {client} of sessions) {
    try {const r=await client.auth.signOut({scope:"local"}); assert.ok(!r.error);}
    catch {console.error("FAIL: deconnexion locale"); process.exitCode=1;}
  }
}
