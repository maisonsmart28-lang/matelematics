import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

// Standalone tsx scripts do not automatically load Next.js .env.local.
// Node >=20.12 provides loadEnvFile(), so load the project env explicitly.
if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

type BatchResult = { batch: number; run: number; ms: number; rowsPerSecond: number };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const marker = "benchmark_10e2";
const batchSizes = (process.env.BENCH_BATCHES ?? "100,500,1000").split(",").map(Number);
const runs = Number(process.env.BENCH_RUNS ?? "5");

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1, Math.max(0, Math.ceil(p*sorted.length)-1))];
}

async function cleanup() {
  const { error } = await supabase.from("telemetry").delete().eq("source", marker);
  if (error) throw error;
}

async function sampleRows(limit: number) {
  const { data, error } = await supabase.from("telemetry")
    .select("company_id,vehicle_id,device_id,recorded_at,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition")
    .neq("source", marker).order("recorded_at", { ascending: false }).limit(limit);
  if (error) throw error;
  if (!data?.length) throw new Error("No telemetry source rows available");
  return data;
}

async function main() {
  await cleanup();
  const maxBatch = Math.max(...batchSizes);
  const source = await sampleRows(maxBatch);
  const results: BatchResult[] = [];
  let seq = 0;

  try {
    for (const batch of batchSizes) {
      for (let run=1; run<=runs; run++) {
        const rows = Array.from({length: batch}, (_,i) => {
          const s = source[i % source.length];
          seq++;
          return {
            id: -8_000_000_000_000_000_000n + BigInt(seq),
            ...s,
            source: marker,
            recorded_at: new Date(Date.now() - seq).toISOString(),
          };
        }).map(r => ({...r, id: r.id.toString()}));

        const t0 = performance.now();
        const { error } = await supabase.from("telemetry").insert(rows);
        const ms = performance.now() - t0;
        if (error) throw error;
        results.push({ batch, run, ms, rowsPerSecond: batch/(ms/1000) });
        await cleanup();
      }
    }

    for (const batch of batchSizes) {
      const rs = results.filter(r=>r.batch===batch);
      const ms = rs.map(r=>r.ms);
      const rps = rs.map(r=>r.rowsPerSecond);
      console.log(JSON.stringify({
        event:"persistence-benchmark",
        batch, runs:rs.length,
        p50Ms:Number(percentile(ms,.50).toFixed(2)),
        p95Ms:Number(percentile(ms,.95).toFixed(2)),
        p99Ms:Number(percentile(ms,.99).toFixed(2)),
        avgRowsPerSecond:Number((rps.reduce((a,b)=>a+b,0)/rps.length).toFixed(1)),
        minRowsPerSecond:Number(Math.min(...rps).toFixed(1)),
        maxRowsPerSecond:Number(Math.max(...rps).toFixed(1))
      }));
    }
  } finally {
    await cleanup();
    const { count, error } = await supabase.from("telemetry").select("id",{count:"exact",head:true}).eq("source",marker);
    if (error) throw error;
    console.log(JSON.stringify({event:"benchmark-cleanup",remainingRows:count ?? 0}));
  }
}
main().catch(e=>{ console.error(e); process.exitCode=1; });
