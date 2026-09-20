import { createClient } from "@supabase/supabase-js";
import { performance } from "node:perf_hooks";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

// Standalone tsx scripts do not automatically load Next.js .env.local.
// Node >=20.12 provides loadEnvFile(), so load the project env explicitly.
if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

type BatchResult = { batch: number; run: number; ms: number; rowsPerSecond: number };

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const marker = "benchmark_10e2";
const batchSizes = (process.env.BENCH_BATCHES ?? "100,500,1000").split(",").map(Number);
const runs = Number(process.env.BENCH_RUNS ?? "5");
const concurrencies = (process.env.BENCH_CONCURRENCY ?? "8").split(",").map(Number);
const concurrentBatch = Number(process.env.BENCH_CONCURRENT_BATCH ?? "250");
const retryAttempts = Number(process.env.BENCH_RETRY_ATTEMPTS ?? "3");

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1, Math.max(0, Math.ceil(p*sorted.length)-1))];
}

async function withRetry<T>(label: string, fn: () => Promise<T & { error?: unknown }>) {
  let lastError: unknown;
  for (let attempt=1; attempt<=retryAttempts; attempt++) {
    try {
      const result = await fn();
      if (!result.error) return result;
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < retryAttempts) await new Promise(r => setTimeout(r, 1000 * attempt));
  }
  throw new Error(`${label} failed after ${retryAttempts} attempts: ${JSON.stringify(lastError)}`);
}

async function cleanup() {
  for (;;) {
    const { data, error } = await supabase
      .from("telemetry")
      .select("id")
      .eq("source", marker)
      .limit(250);
    if (error) throw error;
    if (!data?.length) return;
    const ids = data.map((row) => row.id);
    await withRetry("cleanup-page", () =>
      supabase.from("telemetry").delete().in("id", ids)
    );
  }
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
  console.log(JSON.stringify({event:"benchmark-start",concurrency:concurrencies,batchPerWorker:concurrentBatch,runs}));
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
            id: -8_000_000_000_000_000n + BigInt(seq),
            ...s,
            source: marker,
            recorded_at: new Date(Date.now() - seq).toISOString(),
          };
        }).map(r => ({...r, id: r.id.toString()}));

        const t0 = performance.now();
        await withRetry(`sequential insert batch=${batch} run=${run}`, () => supabase.from("telemetry").insert(rows));
        const ms = performance.now() - t0;
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

    // 10E-2B: controlled concurrent writers against the same real telemetry path.
    for (const concurrency of concurrencies) {
      const runResults: number[] = [];
      for (let run=1; run<=runs; run++) {
        const payloads = Array.from({length: concurrency}, () =>
          Array.from({length: concurrentBatch}, (_,i) => {
            const s = source[i % source.length];
            seq++;
            return {
              id: (-8_000_000_000_000_000n + BigInt(seq)).toString(),
              ...s,
              source: marker,
              recorded_at: new Date(Date.now() - seq).toISOString(),
            };
          })
        );
        const totalRows = concurrency * concurrentBatch;
        const t0 = performance.now();
        await Promise.all(payloads.map((rows, worker) =>
          withRetry(`concurrent insert c=${concurrency} run=${run} worker=${worker+1}`, () => supabase.from("telemetry").insert(rows))
        ));
        const ms = performance.now() - t0;
        runResults.push(totalRows / (ms / 1000));
        await cleanup();
      }
      console.log(JSON.stringify({
        event:"persistence-concurrency-benchmark",
        concurrency,
        batchPerWorker:concurrentBatch,
        rowsPerRun:concurrency*concurrentBatch,
        runs,
        avgRowsPerSecond:Number((runResults.reduce((a,b)=>a+b,0)/runResults.length).toFixed(1)),
        minRowsPerSecond:Number(Math.min(...runResults).toFixed(1)),
        maxRowsPerSecond:Number(Math.max(...runResults).toFixed(1))
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
