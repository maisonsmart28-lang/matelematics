import assert from "node:assert/strict";
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
try {
  assert.equal(url, "http://127.0.0.1:55321");
  assert.ok(key && !key.startsWith("sb_secret_"));
  for (const label of ["A", "B"]) {
    stage = `connexion ${label}`;
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    sessions.push({ client, label });
    const login = await client.auth.signInWithPassword({
      email: process.env[`RLS_TEST_${label}_EMAIL`],
      password: process.env[`RLS_TEST_${label}_PASSWORD`],
    });
    assert.ok(!login.error && login.data.session);
    Object.assign(sessions.at(-1), { token: login.data.session.access_token });
    const profile = await client.from("profiles").select("role,company_id").eq("id", login.data.user.id).single();
    assert.ok(!profile.error && profile.data?.role === "user" && profile.data.company_id);
    sessions.at(-1).company = profile.data.company_id;
  }
  const [a, b] = sessions;
  assert.notEqual(a.company, b.company);
  for (const table of ["positions", "telemetry"]) {
    stage = `${table} lecture A`;
    let start = performance.now();
    let response = await request(`${table}?select=id,company_id,recorded_at&company_id=eq.${a.company}&limit=100`, a.token);
    assert.equal(response.status, 200);
    const own = await response.json();
    assert.ok(Array.isArray(own) && own.length > 0 && own.length <= 100);
    assert.ok(own.every(row => row.company_id === a.company));
    console.log(`PASS: ${table} A lit ses ${own.length} lignes; ${Math.round(performance.now()-start)} ms HTTP`);
    stage = `${table} lecture etrangere B`;
    start = performance.now();
    response = await request(`${table}?select=id&company_id=eq.${a.company}&limit=1`, b.token);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
    console.log(`PASS: ${table} B ne lit aucune ligne de A; ${Math.round(performance.now()-start)} ms HTTP`);
    for (const actor of sessions) {
      stage = `${table} PATCH ${actor.label}`;
      response = await request(`${table}?id=eq.${own[0].id}`, actor.token, "PATCH", { recorded_at: own[0].recorded_at });
      assert.equal(response.status, 403);
      stage = `${table} INSERT ${actor.label}`;
      response = await request(table, actor.token, "POST", {});
      assert.equal(response.status, 403);
      // DELETE targets an absent sentinel only: never risk removing restored data.
      stage = `${table} DELETE ${actor.label}`;
      response = await request(`${table}?id=eq.-9223372036854775808`, actor.token, "DELETE");
      assert.equal(response.status, 403);
      console.log(`PASS: ${table} ${actor.label}, INSERT/PATCH/DELETE refuses (403); DELETE sur identifiant sentinelle`);
    }
  }
  console.log("JWT/API SUPABASE LOCAL : 4 LECTURES ET 12 REFUS ACL PASS; roles admin, fixtures B positives et politiques ecriture non testes");
} catch {
  console.error(`FAIL: ${stage}; aucune cle, aucun JWT ou releve brut affiche`);
  process.exitCode = 1;
} finally {
  for (const { client } of sessions) {
    try { const result = await client.auth.signOut({ scope: "local" }); if (result.error) throw result.error; }
    catch { console.error("FAIL: deconnexion locale"); process.exitCode = 1; }
  }
}
