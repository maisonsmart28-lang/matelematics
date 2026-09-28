import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function setting(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync(".env.local")) return null;
  const line = fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));
  return line?.slice(line.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2") ?? null;
}
const url = setting("NEXT_PUBLIC_SUPABASE_URL");
const publicKey = setting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = setting("SUPABASE_SECRET_KEY");
const api = process.env.RLS_TEST_LOCAL_API_URL ?? "http://127.0.0.1:3000";
const email1 = process.env.RLS_TEST_PARTNER_ADMIN_EMAIL;
const password1 = process.env.RLS_TEST_PARTNER_ADMIN_PASSWORD;
const company1 = process.env.RLS_TEST_TARGET_COMPANY_ID;
if (!url || !publicKey || !secretKey || !email1 || !password1 || !company1)
  throw new Error("Local configuration and partner_admin test credentials required");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api)) throw new Error("Loopback API required");
if (!/^https:\/\/[^/]+\.supabase\.co$/.test(url)) throw new Error("Expected Supabase URL");
if (publicKey.startsWith("sb_secret_") || publicKey === secretKey) throw new Error("Publishable key required");
assert.match(company1, /^[0-9a-f-]{36}$/i);

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, secretKey, options);
const first = createClient(url, publicKey, options);
const second = createClient(url, publicKey, options);
const marker = randomUUID();
const partner2 = randomUUID();
const company2 = randomUUID();
const email2 = `audit-partner-${marker}@matelematics.local`;
const password2 = randomBytes(32).toString("base64url");
const partnerName = `RLS AUDIT PARTNER ${marker}`;
const companyName = `RLS AUDIT COMPANY ${marker}`;
const profileName = `RLS AUDIT PARTNER ADMIN ${marker}`;
let authId = null;
let stage = "preflight";
let passed = false;
let cleanupPassed = false;

async function getAdmin(client, token) {
  const res = await fetch(`${api}/api/admin`, {
    headers: { Authorization: `Bearer ${token}` }, redirect: "manual",
  });
  assert.equal(res.status, 200);
  return res.json();
}
async function deniedCreate(token, targetCompany) {
  const res = await fetch(`${api}/api/admin`, {
    method: "POST", redirect: "manual",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_user", role: "user", company_id: targetCompany,
      email: "invalid-email", password: "audit-only-not-a-password", full_name: "MUST NOT CREATE" }),
  });
  assert.equal(res.status, 403);
}
async function visible(client, table, id) {
  const res = await client.from(table).select("id").eq("id", id).limit(1);
  assert.ifError(res.error);
  return res.data.length;
}

try {
  const login1 = await first.auth.signInWithPassword({ email: email1, password: password1 });
  assert.ifError(login1.error);
  assert(login1.data.session && login1.data.user);
  const profile1 = await first.from("profiles").select("role,partner_id")
    .eq("id", login1.data.user.id).single();
  assert.ifError(profile1.error);
  assert.equal(profile1.data.role, "partner_admin");
  assert(profile1.data.partner_id);
  const ownCompany = await first.from("companies").select("partner_id").eq("id", company1).single();
  assert.ifError(ownCompany.error);
  assert.equal(ownCompany.data.partner_id, profile1.data.partner_id);
  assert.equal(await visible(admin, "partners", partner2), 0);
  assert.equal(await visible(admin, "companies", company2), 0);

  stage = "create fixtures";
  const createdPartner = await admin.from("partners")
    .insert({ id: partner2, name: partnerName }).select("id").single();
  assert.ifError(createdPartner.error);
  const createdCompany = await admin.from("companies")
    .insert({ id: company2, name: companyName, partner_id: partner2 }).select("id").single();
  assert.ifError(createdCompany.error);
  const createdAuth = await admin.auth.admin.createUser({
    email: email2, password: password2, email_confirm: true,
    user_metadata: { full_name: profileName },
  });
  assert.ifError(createdAuth.error);
  assert(createdAuth.data.user);
  authId = createdAuth.data.user.id;
  const createdProfile = await admin.from("profiles").insert({
    id: authId, full_name: profileName, role: "partner_admin", partner_id: partner2,
    company_id: null,
  });
  assert.ifError(createdProfile.error);

  stage = "JWT isolation both directions";
  const login2 = await second.auth.signInWithPassword({ email: email2, password: password2 });
  assert.ifError(login2.error);
  assert(login2.data.session && login2.data.user?.id === authId);
  const profile2 = await second.from("profiles").select("role,partner_id,company_id")
    .eq("id", authId).single();
  assert.ifError(profile2.error);
  assert.equal(profile2.data.role, "partner_admin");
  assert.equal(profile2.data.partner_id, partner2);
  assert.equal(profile2.data.company_id, null);

  const token1 = login1.data.session.access_token;
  const token2 = login2.data.session.access_token;
  const get1 = await getAdmin(first, token1);
  const get2 = await getAdmin(second, token2);
  assert(get1.partners.some((item) => item.id === profile1.data.partner_id));
  assert(get1.companies.some((item) => item.id === company1));
  assert(!get1.partners.some((item) => item.id === partner2));
  assert(!get1.companies.some((item) => item.id === company2));
  assert(get2.partners.some((item) => item.id === partner2));
  assert(get2.companies.some((item) => item.id === company2));
  assert(!get2.partners.some((item) => item.id === profile1.data.partner_id));
  assert(!get2.companies.some((item) => item.id === company1));
  assert(!get1.users.some((item) => item.id === authId));
  assert(!get2.users.some((item) => item.id === login1.data.user.id));
  assert.equal(await visible(first, "partners", partner2), 0);
  assert.equal(await visible(first, "companies", company2), 0);
  assert.equal(await visible(second, "partners", profile1.data.partner_id), 0);
  assert.equal(await visible(second, "companies", company1), 0);
  assert.equal(await visible(second, "partners", partner2), 1);
  assert.equal(await visible(second, "companies", company2), 1);
  await deniedCreate(token1, company2);
  await deniedCreate(token2, company1);
  passed = true;
  console.log(JSON.stringify({ event: "admin-api-two-partner", result: "PASS",
    marker, partner2, company2, userId: authId,
    jwtReadBothDirections: true, apiGetBothDirections: true, apiPostDeniedBothDirections: true }));
} catch (error) {
  process.exitCode = 1;
  console.error(`Admin API two-partner audit FAIL at ${stage}: ${error instanceof assert.AssertionError ? "assertion failed" : "operation failed"}; no credentials logged`);
} finally {
  stage = "cleanup";
  try {
    // Never delete an existing unrelated row. Each target carries a unique ID and marker.
    if (!authId) {
      for (let page = 1; page <= 10 && !authId; page++) {
        const listed = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        assert.ifError(listed.error);
        authId = listed.data.users.find((user) => user.email === email2)?.id ?? null;
        if (listed.data.users.length < 1000) break;
      }
    }
    if (authId) {
      const check = await admin.auth.admin.getUserById(authId);
      assert.ifError(check.error);
      assert.equal(check.data.user?.email, email2);
      const removed = await admin.auth.admin.deleteUser(authId);
      assert.ifError(removed.error);
      assert.equal(await visible(admin, "profiles", authId), 0);
    }
    const companyRow = await admin.from("companies").select("name").eq("id", company2).maybeSingle();
    assert.ifError(companyRow.error);
    if (companyRow.data) {
      assert.equal(companyRow.data.name, companyName);
      const deleted = await admin.from("companies").delete().eq("id", company2).eq("name", companyName).select("id");
      assert.ifError(deleted.error);
      assert.equal(deleted.data.length, 1);
    }
    const partnerRow = await admin.from("partners").select("name").eq("id", partner2).maybeSingle();
    assert.ifError(partnerRow.error);
    if (partnerRow.data) {
      assert.equal(partnerRow.data.name, partnerName);
      const deleted = await admin.from("partners").delete().eq("id", partner2).eq("name", partnerName).select("id");
      assert.ifError(deleted.error);
      assert.equal(deleted.data.length, 1);
    }
    assert.equal(await visible(admin, "companies", company2), 0);
    assert.equal(await visible(admin, "partners", partner2), 0);
    cleanupPassed = true;
    console.log(JSON.stringify({ event: "admin-api-two-partner-cleanup", result: "PASS",
      marker, partner2, company2, userId: authId, passed }));
  } catch {
    process.exitCode = 1;
    console.error(JSON.stringify({ event: "admin-api-two-partner-cleanup",
      result: "FAILED_RETAIN_IDS_FOR_EXACT_REVIEW", marker, partner2, company2, userId: authId }));
  }
}
