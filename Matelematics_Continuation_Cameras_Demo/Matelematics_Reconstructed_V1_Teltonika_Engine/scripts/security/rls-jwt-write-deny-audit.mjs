import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function publicSetting(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync(".env.local")) return null;
  const line = fs.readFileSync(".env.local", "utf8").split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${name}=`));
  const value = line?.slice(line.indexOf("=") + 1).trim();
  return value?.replace(/^(['"])(.*)\1$/, "$2") ?? null;
}

const url = publicSetting("NEXT_PUBLIC_SUPABASE_URL");
const key = publicSetting("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
if (!url || !key || key.startsWith("sb_secret_")) {
  throw new Error("Public Supabase URL and publishable key required");
}

async function login(label) {
  const email = process.env[`RLS_TEST_${label}_EMAIL`];
  const password = process.env[`RLS_TEST_${label}_PASSWORD`];
  if (!email || !password) throw new Error(`Missing test account ${label}`);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Test account ${label} could not sign in`);
  const profile = await client.from("profiles").select("role,company_id")
    .eq("id", data.user.id).single();
  if (profile.error || profile.data?.role !== "user" || !profile.data.company_id) {
    throw new Error(`Account ${label} must be a user in a test company`);
  }
  return { client, company: profile.data.company_id };
}

async function main() {
  const a = await login("A");
  const b = await login("B");
  assert.notEqual(a.company, b.company, "Separate test companies required");
  const { data: vehicles, error } = await a.client.from("vehicles")
    .select("id,name,company_id").eq("company_id", a.company).limit(1);
  if (error || !vehicles?.length) throw new Error("Account A needs a visible test vehicle");
  const vehicle = vehicles[0];
  // Same-value update: even if RLS is misconfigured, this does not change the name.
  // A user must have zero UPDATE rights, including for vehicles they can read.
  const attempted = await a.client.from("vehicles").update({ name: vehicle.name })
    .eq("id", vehicle.id).select("id");
  if (attempted.error && !["42501", "PGRST301"].includes(attempted.error.code)) {
    throw new Error("Unexpected update error; inspect locally");
  }
  assert.equal(attempted.data?.length ?? 0, 0, "User A can update a vehicle");
  const reread = await a.client.from("vehicles").select("name").eq("id", vehicle.id).single();
  assert.equal(reread.data?.name, vehicle.name, "Vehicle name changed");
  console.log("PASS: user A cannot update a visible vehicle; original name intact");
  console.log("RLS JWT write audit PARTIAL PASS: profile role/company changes and admin allow cases remain untested");
}
try {
  await main();
} catch {
  console.error("RLS JWT no-op write audit FAIL; check policies and test accounts locally (no credentials logged)");
  process.exitCode = 1;
}
