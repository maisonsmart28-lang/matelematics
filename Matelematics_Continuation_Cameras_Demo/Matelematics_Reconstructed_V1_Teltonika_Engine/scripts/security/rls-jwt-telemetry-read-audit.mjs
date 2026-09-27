import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function setting(name) {
  if (process.env[name]) return process.env[name];
  if (!fs.existsSync('.env.local')) return null;
  const entry = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .find((line) => line.trim().startsWith(`${name}=`));
  return entry?.slice(entry.indexOf('=') + 1).trim().replace(/^("|')(.*)\1$/, '$2') ?? null;
}

const url = setting('NEXT_PUBLIC_SUPABASE_URL');
const key = setting('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
if (!url || !key || key.startsWith('sb_secret_')) throw new Error('Public Supabase configuration required');

async function login(label) {
  const email = process.env[`RLS_TEST_${label}_EMAIL`];
  const password = process.env[`RLS_TEST_${label}_PASSWORD`];
  if (!email || !password) throw new Error(`Account ${label} credentials missing`);
  const client = createClient(url, key, { auth: {
    persistSession: false, autoRefreshToken: false, detectSessionInUrl: false,
  } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Account ${label} login failed`);
  const profile = await client.from('profiles').select('role,company_id').eq('id', data.user.id).single();
  if (profile.error || profile.data?.role !== 'user' || !profile.data.company_id) {
    throw new Error(`Account ${label} must be a user assigned to a company`);
  }
  return { client, company: profile.data.company_id };
}

async function audit(label, own, other) {
  for (const table of ['devices', 'drivers', 'positions', 'telemetry']) {
    const ownRows = await own.client.from(table).select('company_id')
      .eq('company_id', own.company).limit(1);
    if (ownRows.error) throw new Error(`user ${label} ${table}: own read failed; code ${String(ownRows.error.code ?? 'unknown').replace(/[^A-Z0-9]/gi, '')}`);
    const otherRows = await own.client.from(table).select('company_id')
      .eq('company_id', other.company).limit(1);
    if (otherRows.error) throw new Error(`user ${label} ${table}: foreign read failed; code ${String(otherRows.error.code ?? 'unknown').replace(/[^A-Z0-9]/gi, '')}`);
    assert.equal(otherRows.data.length, 0, `${table}: foreign row visible`);
    console.log(`PASS: user ${label}, ${table}: foreign company hidden; own row ${ownRows.data.length ? 'visible' : 'absent'}`);
  }
}

try {
  const a = await login('A');
  const b = await login('B');
  assert.notEqual(a.company, b.company, 'Distinct company accounts required');
  await audit('A', a, b);
  await audit('B', b, a);
  console.log('RLS JWT telemetry isolation read-only PASS; only existing fixture rows tested');
} catch (error) {
  // Only messages generated above or by assert: never echo raw SDK errors, credentials or row data.
  const safe = String(error?.message ?? '').replace(/[^a-zA-Z0-9 :;-]/g, '').slice(0, 160);
  console.error(`RLS JWT telemetry audit FAIL: ${safe || 'unknown error'}; credentials not logged`);
  process.exitCode = 1;
}
