import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function publicSetting(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync(".env.local")) return null;
  const entry = fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .find((line) => line.trim().startsWith(`${name}=`));
  const value = entry?.slice(entry.indexOf("=") + 1).trim();
  return value?.replace(/^(["'])(.*)\1$/, "$2") ?? null;
}
const url = publicSetting("NEXT_PUBLIC_SUPABASE_URL");
const key = publicSetting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const api = process.env.RLS_TEST_LOCAL_API_URL ?? "http://127.0.0.1:3000";
if (!url || !key || key.startsWith("sb_secret_")) throw new Error("Public Supabase configuration required");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api)) {
  throw new Error("Only a loopback local API URL is allowed");
}

let stage = "configuration";
async function audit(label) {
  stage = `login ${label}`;
  const email = process.env[`RLS_TEST_${label}_EMAIL`];
  const password = process.env[`RLS_TEST_${label}_PASSWORD`];
  if (!email || !password) throw new Error(`Missing account ${label}`);
  const client = createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
  } });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw new Error(`Login ${label} failed`);
  stage = `profile ${label}`;
  const profile = await client.from("profiles").select("role")
    .eq("id", login.data.user.id).single();
  if (profile.error || profile.data?.role !== "user") throw new Error(`Account ${label} must have user role`);
  const authorization = { Authorization: `Bearer ${login.data.session.access_token}` };
  stage = `GET ${label}`;
  const get = await fetch(`${api}/api/admin`, { headers: authorization, redirect: "manual" });
  assert.equal(get.status, 403, `GET user ${label} should return 403`);
  stage = `POST ${label}`;
  const post = await fetch(`${api}/api/admin`, {
    method: "POST", headers: { ...authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_company", name: "MUST-NOT-BE-CREATED" }),
    redirect: "manual",
  });
  assert.equal(post.status, 403, `POST user ${label} should return 403`);
  console.log(`PASS: /api/admin GET and POST deny user ${label} (403)`);
}

try {
  stage = "anonymous GET";
  const anonymous = await fetch(`${api}/api/admin`, { redirect: "manual" });
  assert.equal(anonymous.status, 401, "Anonymous GET should return 401");
  await audit("A");
  await audit("B");
  console.log("Admin API JWT user deny audit PASS; elevated role and cross-partner cases remain untested");
} catch (error) {
  // Only print a local stage and numeric HTTP status; no URLs, credentials, JWTs or SDK errors.
  const status = error instanceof assert.AssertionError ? String(error.actual).replace(/[^0-9]/g, "") : "";
  console.error(`Admin API JWT audit FAIL at ${stage}${status ? ` (HTTP ${status})` : ""}; credentials not logged`);
  process.exitCode = 1;
}
