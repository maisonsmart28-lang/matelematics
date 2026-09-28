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
const actorRole = process.env.RLS_TEST_ACTOR_ROLE ?? "client_admin";
if (!["client_admin", "partner_admin"].includes(actorRole)) throw new Error("Unsupported actor role");
const actorPrefix = actorRole === "partner_admin" ? "PARTNER_ADMIN" : "CLIENT_ADMIN";
const actorEmail = process.env[`RLS_TEST_${actorPrefix}_EMAIL`];
const actorPassword = process.env[`RLS_TEST_${actorPrefix}_PASSWORD`];
const targetCompanyId = process.env.RLS_TEST_TARGET_COMPANY_ID;
if (!url || !publicKey || !secretKey || !actorEmail || !actorPassword) {
  throw new Error("Local Supabase configuration and test actor credentials required");
}
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api)) throw new Error("Loopback API required");
if (publicKey.startsWith("sb_secret_") || publicKey === secretKey) throw new Error("Publishable key required");
if (!/^(https:\/\/[^/]+\.supabase\.co)$/.test(url)) throw new Error("Expected Supabase project URL");

const authOptions = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const actor = createClient(url, publicKey, authOptions);
const admin = createClient(url, secretKey, authOptions);
const marker = randomUUID();
const email = `audit-user-${marker}@matelematics.local`;
const password = randomBytes(32).toString("base64url");
let createdId = null;
let stage = "preflight";
let cleanupPassed = false;

try {
  stage = "actor login";
  const signed = await actor.auth.signInWithPassword({ email: actorEmail, password: actorPassword });
  assert.ifError(signed.error);
  assert(signed.data.session && signed.data.user, "client_admin login failed");
  stage = "actor profile read";
  const actorProfile = await actor.from("profiles").select("role,company_id,partner_id")
    .eq("id", signed.data.user.id).single();
  assert.ifError(actorProfile.error);
  stage = "actor role";
  assert.equal(actorProfile.data.role, actorRole);
  const expectedCompanyId = actorRole === "client_admin"
    ? actorProfile.data.company_id : targetCompanyId;
  stage = "target company";
  assert(expectedCompanyId, "target company missing");
  if (actorRole === "partner_admin") {
    assert(actorProfile.data.partner_id, "partner_admin has no partner");
    stage = "partner company ownership";
    const company = await actor.from("companies").select("id,partner_id")
      .eq("id", expectedCompanyId).single();
    assert.ifError(company.error);
    assert.equal(company.data.partner_id, actorProfile.data.partner_id,
      "target company is outside actor's partner");
  } else if (targetCompanyId) {
    stage = "client company mismatch";
    assert.equal(targetCompanyId, expectedCompanyId, "target company mismatch");
  }

  stage = "create_user response";
  const response = await fetch(`${api}/api/admin`, {
    method: "POST", redirect: "manual",
    headers: { Authorization: `Bearer ${signed.data.session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_user", email, password,
      full_name: `RLS AUDIT USER ${marker}`, role: "user",
      company_id: actorRole === "partner_admin" ? expectedCompanyId : "00000000-0000-0000-0000-000000000000",
      partner_id: "00000000-0000-0000-0000-000000000000" }),
  });
  const payload = await response.json();
  if (response.status !== 200 || !payload.user?.id) throw new Error(`unexpected API status ${response.status}`);
  createdId = payload.user.id;
  assert.match(createdId, /^[0-9a-f-]{36}$/i);
  assert.equal(payload.user.role, "user");
  assert.equal(payload.user.company_id, expectedCompanyId);
  assert.equal(payload.user.partner_id, null);
  assert.equal(payload.user.email, email);

  stage = "new user JWT visibility";
  const newUser = createClient(url, publicKey, authOptions);
  const newSession = await newUser.auth.signInWithPassword({ email, password });
  assert.ifError(newSession.error);
  assert(newSession.data.user, "created user login failed");
  assert.equal(newSession.data.user.id, createdId);
  const ownProfile = await newUser.from("profiles").select("id,role,company_id,partner_id")
    .eq("id", createdId).single();
  assert.ifError(ownProfile.error);
  assert.equal(ownProfile.data.role, "user");
  assert.equal(ownProfile.data.company_id, expectedCompanyId);
  assert.equal(ownProfile.data.partner_id, null);
  const ownCompany = await newUser.from("companies").select("id")
    .eq("id", expectedCompanyId).single();
  assert.ifError(ownCompany.error);
  assert.equal(ownCompany.data.id, expectedCompanyId);
  const adminDenied = await fetch(`${api}/api/admin`, {
    headers: { Authorization: `Bearer ${newSession.data.session.access_token}` },
    redirect: "manual",
  });
  assert.equal(adminDenied.status, 403);
  console.log(JSON.stringify({ event: "admin-api-create-user", result: "PASS",
    userId: createdId, marker, actorRole, role: "user", companyId: expectedCompanyId,
    adminGetDenied: true }));
} catch (error) {
  console.error(`Admin API create-user audit FAIL at ${stage}: ${error instanceof assert.AssertionError ? "assertion failed" : "operation failed"}; no credentials logged`);
  process.exitCode = 1;
} finally {
  // A lost API response can still mean the user was created. Find only our random email.
  try {
    stage = "exact cleanup";
    if (!createdId) {
      for (let page = 1; page <= 10 && !createdId; page++) {
        const list = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        assert.ifError(list.error);
        createdId = list.data.users.find((user) => user.email === email)?.id ?? null;
        if (list.data.users.length < 1000) break;
      }
    }
    if (createdId) {
      const before = await admin.auth.admin.getUserById(createdId);
      assert.ifError(before.error);
      assert.equal(before.data.user?.email, email, "cleanup identity mismatch");
      const removed = await admin.auth.admin.deleteUser(createdId);
      assert.ifError(removed.error);
      const profile = await admin.from("profiles").select("id").eq("id", createdId);
      assert.ifError(profile.error);
      assert.equal(profile.data.length, 0, "profile remained after Auth deletion");
      cleanupPassed = true;
    }
    console.log(JSON.stringify({ event: "admin-api-create-user-cleanup",
      result: cleanupPassed ? "PASS" : "NO_USER_FOUND", marker, userId: createdId }));
  } catch {
    process.exitCode = 1;
    console.error(JSON.stringify({ event: "admin-api-create-user-cleanup",
      result: "FAILED_RETAIN_ID_FOR_EXACT_REVIEW", marker, userId: createdId }));
  }
}
