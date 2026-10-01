import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const api = process.env.RLS_TEST_LOCAL_API_URL ?? "http://127.0.0.1:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
let stage = "configuration";
const clients = [];
const accounts = {};
async function request(path, token) {
  return fetch(api + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
}
try {
  assert.match(api, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
  assert.ok(url && key && !key.startsWith("sb_secret_"));
  for (const label of ["A", "B"]) {
    stage = `connexion compte ${label}`;
    const email = process.env[`RLS_TEST_${label}_EMAIL`];
    const password = process.env[`RLS_TEST_${label}_PASSWORD`];
    assert.ok(email && password);
    const client = createClient(url, key, { auth: {
      persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
    } });
    clients.push(client);
    const login = await client.auth.signInWithPassword({ email, password });
    assert.ok(!login.error && login.data.session);
    stage = `profil compte ${label}`;
    const profile = await client.from("profiles").select("role,company_id")
      .eq("id", login.data.user.id).single();
    assert.ok(!profile.error && profile.data?.role === "user" && profile.data.company_id);
    accounts[label] = { token: login.data.session.access_token, profile: profile.data, client };
  }
  assert.notEqual(accounts.A.profile.company_id, accounts.B.profile.company_id);
  stage = "vehicule propre du compte A";
  const vehicle = await accounts.A.client.from("vehicles").select("id")
    .eq("company_id", accounts.A.profile.company_id).limit(1).maybeSingle();
  assert.ok(!vehicle.error && vehicle.data?.id);
  const id = encodeURIComponent(vehicle.data.id);
  for (const [kind, path] of [
    ["live", `/api/vehicles/${id}/live`],
    ["historique", `/api/dashboard/vehicles/${id}/history?hours=24`],
  ]) {
    stage = `${kind} anonyme`;
    assert.equal((await request(path)).status, 401);
    console.log(`PASS: ${kind}, acces anonyme refuse (401)`);
    stage = `${kind} compte B etranger`;
    assert.equal((await request(path, accounts.B.token)).status, 403);
    console.log(`PASS: ${kind}, compte B etranger refuse (403)`);
    stage = `${kind} compte A autorise`;
    const response = await request(path, accounts.A.token);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.vehicle?.id, vehicle.data.id);
    if (kind === "live") {
      assert.equal(data.vehicle.company_id, accounts.A.profile.company_id);
      assert.ok(Object.hasOwn(data, "position") && Object.hasOwn(data, "telemetry"));
    } else {
      assert.ok(Array.isArray(data.points));
      assert.equal(data.count, data.points.length);
      assert.ok(data.points.length <= 500);
    }
    console.log(`PASS: ${kind}, compte A autorise (200), reponse verifiee`);
  }
  console.log("API LIVE/HISTORIQUE : SIX CONTROLES LECTURE PASS; performance RLS et roles admin non testes");
} catch {
  console.error(`API vehicle audit FAIL a l'etape : ${stage}; aucun identifiant, JWT ou releve brut affiche`);
  process.exitCode = 1;
} finally {
  for (const client of clients) {
    try {
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error) throw result.error;
    } catch {
      console.error("FAIL: deconnexion de la session de test");
      process.exitCode = 1;
    }
  }
}
