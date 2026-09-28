import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function publicSetting(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync(".env.local")) return null;
  const line = fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));
  const value = line?.slice(line.indexOf("=") + 1).trim();
  return value?.replace(/^(["'])(.*)\1$/, "$2") ?? null;
}
const url = publicSetting("NEXT_PUBLIC_SUPABASE_URL");
const key = publicSetting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const api = process.env.RLS_TEST_LOCAL_API_URL ?? "http://127.0.0.1:3000";
const foreignCompany = process.env.RLS_TEST_FOREIGN_COMPANY_ID;
const foreignPartner = process.env.RLS_TEST_FOREIGN_PARTNER_ID;
if (!url || !key || key.startsWith("sb_secret_")) throw new Error("Public Supabase configuration required");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api)) throw new Error("Only a loopback API URL is allowed");

let stage = "configuration";
async function login(label, expectedRole) {
  stage = `login ${label}`;
  const email = process.env[`RLS_TEST_${label}_EMAIL`];
  const password = process.env[`RLS_TEST_${label}_PASSWORD`];
  if (!email || !password) throw new Error("missing credentials");
  const client = createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
  } });
  const result = await client.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.session) throw new Error("login failed");
  const profile = await client.from("profiles").select("role,company_id,partner_id")
    .eq("id", result.data.user.id).single();
  if (profile.error || profile.data?.role !== expectedRole) throw new Error("unexpected role");
  return { client, token: result.data.session.access_token, profile: profile.data };
}
async function request(token, method, body, label) {
  stage = label;
  const response = await fetch(`${api}/api/admin`, {
    method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
  return response.status;
}
function noCreateBody(role, companyId) {
  return { action: "create_user", role, company_id: companyId,
    email: "invalid-email", password: "audit-only-not-a-password", full_name: "MUST NOT CREATE" };
}

try {
  const c = await login("CLIENT_ADMIN", "client_admin");
  const clientGet = await request(c.token, "GET", null, "client GET");
  assert.equal(clientGet, 200);
  assert.equal(await request(c.token, "POST", { action: "create_company", name: "" }, "client create_company"), 403);
  assert.equal(await request(c.token, "POST", noCreateBody("partner_admin", c.profile.company_id), "client elevate role"), 403);
  console.log("PASS: client_admin GET allowed; create_company and elevated role denied");

  const p = await login("PARTNER_ADMIN", "partner_admin");
  assert(p.profile.partner_id, "partner account missing partner");
  assert.equal(await request(p.token, "GET", null, "partner GET"), 200);
  assert.equal(await request(p.token, "POST", noCreateBody("matelematics_admin", null), "partner elevate role"), 403);
  if (foreignCompany) {
    stage = "foreign company fixture";
    assert.match(foreignCompany, /^[0-9a-f-]{36}$/i);
    if (foreignPartner) assert.match(foreignPartner, /^[0-9a-f-]{36}$/i);
    const listing = await fetch(`${api}/api/admin`, { headers: { Authorization: `Bearer ${p.token}` }, redirect: "manual" });
    assert.equal(listing.status, 200);
    const payload = await listing.json();
    assert.equal(payload.companies.some((company) => company.id === foreignCompany), false, "foreign company in admin GET");
    if (foreignPartner) assert.equal(payload.partners.some((partner) => partner.id === foreignPartner), false, "foreign partner in admin GET");
    const visible = await p.client.from("companies").select("id").eq("id", foreignCompany).limit(1);
    assert.ifError(visible.error);
    assert.equal(visible.data.length, 0, "foreign company visible through JWT");
    assert.equal(await request(p.token, "POST", noCreateBody("user", foreignCompany), "partner foreign create_user"), 403);
    console.log("PASS: partner_admin GET allowed; elevated role and foreign company creation denied");
  } else {
    console.log("PARTIAL PASS: partner_admin GET allowed; elevated role denied; foreign company test needs RLS_TEST_FOREIGN_COMPANY_ID");
  }
  console.log(foreignCompany && foreignPartner
    ? "Admin API elevated denial PASS including one-way partner isolation; successful writes and reverse partner direction remain untested"
    : "Admin API elevated denial PARTIAL PASS; successful writes and two-partner isolation remain untested");
} catch (error) {
  const status = error instanceof assert.AssertionError ? String(error.actual).replace(/[^0-9]/g, "") : "";
  console.error(`Admin API elevated audit FAIL at ${stage}${status ? ` (actual ${status})` : ""}; no credentials logged`);
  process.exitCode = 1;
}
