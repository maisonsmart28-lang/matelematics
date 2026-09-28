import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function setting(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync(".env.local")) return null;
  const entry = fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .find((line) => line.trim().startsWith(`${name}=`));
  return entry?.slice(entry.indexOf("=") + 1).trim().replace(/^(["'])(.*)\1$/, "$2") ?? null;
}
const url = setting("NEXT_PUBLIC_SUPABASE_URL");
const key = setting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const api = process.env.RLS_TEST_LOCAL_API_URL ?? "http://127.0.0.1:3000";
if (!url || !key || key.startsWith("sb_secret_")) throw new Error("Public Supabase config required");
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api)) throw new Error("Only loopback local API is allowed");

const email = process.env.RLS_TEST_PARTNER_ADMIN_EMAIL;
const password = process.env.RLS_TEST_PARTNER_ADMIN_PASSWORD;
if (!email || !password) throw new Error("Partner admin test credentials required");
const client = createClient(url, key, { auth: {
  persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
} });
let stage = "login";
let createdId = null;
try {
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error || !login.data.session) throw new Error("login failed");
  const own = await client.from("profiles").select("role,partner_id")
    .eq("id", login.data.user.id).single();
  if (own.error || own.data?.role !== "partner_admin" || !own.data.partner_id) {
    throw new Error("Account must be partner_admin with partner_id");
  }
  const marker = `RLS AUDIT API COMPANY ${randomUUID()}`;
  stage = "POST create_company";
  const response = await fetch(`${api}/api/admin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${login.data.session.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create_company", name: marker,
      // Deliberately try to override; the route must force the actor's partner.
      partner_id: "00000000-0000-0000-0000-000000000000" }),
    redirect: "manual",
  });
  if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  createdId = payload.company?.id ?? null;
  console.log(JSON.stringify({ event: "admin-api-audit-created-fixture", companyId: createdId, marker }));
  stage = "validate created company";
  assert(createdId && /^[0-9a-f-]{36}$/i.test(createdId), "missing company id");
  assert.equal(payload.company.partner_id, own.data.partner_id, "partner override was accepted");
  assert.equal(payload.company.name, marker, "company name mismatch");
  const visible = await client.from("companies").select("id,partner_id,name").eq("id", createdId).single();
  assert.ifError(visible.error);
  assert.equal(visible.data?.partner_id, own.data.partner_id, "company not visible to owner");
  assert.equal(visible.data?.name, marker);
  console.log("PASS: partner_admin can create a company; supplied foreign partner_id ignored; own JWT sees it");
  console.log("Fixture remains for exact cleanup using companyId and marker above");
} catch (error) {
  // Do not log SDK errors, tokens or credentials. A created fixture ID was logged immediately above.
  const status = /^HTTP \d+$/.test(String(error?.message)) ? String(error.message) : "";
  console.error(`Admin API allowed-write audit FAIL at ${stage}${status ? ` (${status})` : ""}; credentials not logged`);
  process.exitCode = 1;
}
