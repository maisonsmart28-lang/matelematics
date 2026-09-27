import assert from "node:assert/strict";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Only read the two public values. Never load server secrets from .env.local.
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
if (!url || !key || key.startsWith("sb_secret_")) {
  throw new Error("Public Supabase URL and publishable key required; no secret key is accepted");
}

async function login(label) {
  const email = process.env[`RLS_TEST_${label}_EMAIL`];
  const password = process.env[`RLS_TEST_${label}_PASSWORD`];
  if (!email || !password) throw new Error(`Test account ${label} is missing`);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) throw new Error(`Test account ${label} could not sign in`);
  const profile = await client.from("profiles").select("id,role,company_id")
    .eq("id", data.user.id).single();
  if (profile.error || !profile.data || profile.data.role !== "user" || !profile.data.company_id) {
    throw new Error(`Test account ${label} needs an accessible user profile and company`);
  }
  return { client, id: data.user.id, company: profile.data.company_id };
}

async function check(label, own, other) {
  const foreignProfile = await own.client.from("profiles").select("id")
    .eq("id", other.id).maybeSingle();
  if (foreignProfile.error) throw foreignProfile.error;
  assert.equal(foreignProfile.data, null, `User ${label} read another company's profile`);

  const foreignCompany = await own.client.from("companies").select("id")
    .eq("id", other.company).maybeSingle();
  if (foreignCompany.error) throw foreignCompany.error;
  assert.equal(foreignCompany.data, null, `User ${label} read another company`);

  const ownCompany = await own.client.from("companies").select("id")
    .eq("id", own.company).maybeSingle();
  if (ownCompany.error) throw ownCompany.error;
  assert(ownCompany.data, `User ${label} cannot read their company`);

  const partners = await own.client.from("partners").select("id").limit(1);
  if (partners.error) throw partners.error;
  assert.equal(partners.data?.length, 0, `User ${label} unexpectedly sees a partner`);

  const vehicles = await own.client.from("vehicles").select("id,company_id").limit(1000);
  if (vehicles.error) throw vehicles.error;
  assert(vehicles.data?.every((vehicle) => vehicle.company_id === own.company),
    `User ${label} read vehicles outside their company`);
  const foreignVehicles = await own.client.from("vehicles").select("id")
    .eq("company_id", other.company).limit(1);
  if (foreignVehicles.error) throw foreignVehicles.error;
  assert.equal(foreignVehicles.data?.length, 0, `User ${label} read another company's vehicles`);
  console.log(`PASS: user ${label} reads only their company (visible vehicles: ${vehicles.data.length})`);
}

try {
  const a = await login("A");
  const b = await login("B");
  assert.notEqual(a.id, b.id, "Two distinct test users required");
  assert.notEqual(a.company, b.company, "Two distinct companies required");
  await check("A", a, b);
  await check("B", b, a);
  console.log("RLS JWT company isolation read-only PASS; partner-to-partner and writes remain untested");
} catch {
  // Do not print SDK errors, URLs, emails, access tokens or database identifiers.
  console.error("RLS JWT read-only audit FAIL: inspect the test accounts and policies locally; no credentials logged");
  process.exitCode = 1;
}
