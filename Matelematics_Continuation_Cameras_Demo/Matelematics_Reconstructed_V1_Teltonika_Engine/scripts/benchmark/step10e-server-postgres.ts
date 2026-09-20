import { existsSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { loadEnvFile } from "node:process";
import pg from "pg";

if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

type Row = Record<string, unknown>;
type Cell = {
  batch: number;
  workers: number;
  rows: number;
  committed: number;
  failedBatches: number;
  retries: number;
  elapsedMs: number;
  rowsPerSecond: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Missing server-only DATABASE_URL.");

const marker = "benchmark_10e4e";
const batches = (process.env.PG10E4E_SIZES ?? "100,250,500,1000").split(",").map(Number);
const workersList = (process.env.PG10E4E_WORKERS ?? "1,2,4").split(",").map(Number);
const targetRows = Math.max(1000, Number(process.env.PG10E4E_ROWS ?? 5000));
const retryMax = Math.max(0, Number(process.env.PG10E4E_RETRIES ?? 2));
const maxWorkers = Math.max(...workersList);
const pool = new Pool({
  connectionString,
  max: maxWorkers,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  application_name: "matelematics_step10e4e",
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))] ?? 0;
}

function transient(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /timeout|connection|reset|terminated|too many|temporar|53300|57p01|57p02|57p03|0800/.test(message);
}

function connectionMode() {
  try {
    const u = new URL(connectionString!);
    if (u.port === "6543") return "transaction";
    if (u.hostname.includes("pooler.supabase.com")) return "session";
    if (u.hostname.startsWith("db.") && u.hostname.endsWith(".supabase.co")) return "direct";
    return "postgres";
  } catch {
    return "unknown";
  }
}

async function cleanup() {
  await pool.query("DELETE FROM public.telemetry WHERE source = $1", [marker]);
}

async function remaining() {
  const result = await pool.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM public.telemetry WHERE source = $1",
    [marker],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function samples(limit: number) {
  const result = await pool.query<Row>(
    `SELECT company_id, vehicle_id, device_id, codec, raw_payload, io_values, can_payload,
            metadata, signal_strength, battery_voltage, ignition
       FROM public.telemetry
      WHERE source IS DISTINCT FROM $1
      ORDER BY recorded_at DESC
      LIMIT $2`,
    [marker, limit],
  );
  if (!result.rows.length) throw new Error("No telemetry source rows available.");
  return result.rows;
}

const columns = [
  "id", "company_id", "vehicle_id", "device_id", "codec", "raw_payload", "io_values",
  "can_payload", "metadata", "signal_strength", "battery_voltage", "ignition", "source", "recorded_at",
];

function buildInsert(rows: Row[]) {
  const values: unknown[] = [];
  const tuples = rows.map((row) => {
    const placeholders = columns.map((column) => {
      values.push(row[column]);
      return `$${values.length}`;
    });
    return `(${placeholders.join(",")})`;
  });
  return {
    text: `INSERT INTO public.telemetry (${columns.join(",")}) VALUES ${tuples.join(",")}`,
    values,
  };
}

async function databaseSnapshot() {
  const result = await pool.query<{
    max_connections: string;
    active_connections: string;
    database_bytes: string;
    telemetry_bytes: string;
  }>(`
    SELECT
      current_setting('max_connections') AS max_connections,
      (SELECT count(*)::text FROM pg_stat_activity WHERE datname = current_database()) AS active_connections,
      pg_database_size(current_database())::text AS database_bytes,
      pg_total_relation_size('public.telemetry')::text AS telemetry_bytes
  `);
  return result.rows[0];
}

async function main() {
  const client = await pool.connect();
  try {
    const identity = await client.query<{ database: string; server: string }>(
      "SELECT current_database() AS database, inet_server_addr()::text AS server",
    );
    console.log(JSON.stringify({
      event: "server-postgres-start",
      marker,
      path: "postgres-multi-row-insert",
      connectionMode: connectionMode(),
      database: identity.rows[0]?.database,
      serverAddressPresent: Boolean(identity.rows[0]?.server),
      batches,
      workers: workersList,
      targetRowsPerCell: targetRows,
      retryMax,
      poolMax: maxWorkers,
    }));
  } finally {
    client.release();
  }

  await cleanup();
  const source = await samples(Math.max(...batches));
  console.log(JSON.stringify({ event: "server-postgres-db-before", ...(await databaseSnapshot()) }));

  let seq = 0;
  const cells: Cell[] = [];
  try {
    for (const batch of batches) {
      for (const workers of workersList) {
        const rounds = Math.max(1, Math.ceil(targetRows / (batch * workers)));
        const latencies: number[] = [];
        let committed = 0;
        let failedBatches = 0;
        let retries = 0;
        const cellStart = performance.now();

        for (let round = 0; round < rounds; round++) {
          const payloads = Array.from({ length: workers }, () =>
            Array.from({ length: batch }, (_, index) => {
              const sample = source[index % source.length];
              seq++;
              return {
                id: (-8_000_000_000_000_000n + BigInt(seq)).toString(),
                ...sample,
                source: marker,
                recorded_at: new Date(Date.now() - seq).toISOString(),
              };
            }),
          );

          await Promise.all(payloads.map(async (rows, worker) => {
            let attempt = 0;
            for (;;) {
              const query = buildInsert(rows);
              const t0 = performance.now();
              try {
                await pool.query(query);
                const ms = performance.now() - t0;
                latencies.push(ms);
                committed += rows.length;
                return;
              } catch (error) {
                if (attempt >= retryMax || !transient(error)) {
                  failedBatches++;
                  const message = error instanceof Error ? error.message : String(error);
                  throw new Error(`batch=${batch} workers=${workers} worker=${worker + 1}: ${message}`);
                }
                attempt++;
                retries++;
                await sleep(500 * Math.pow(2, attempt - 1));
              }
            }
          }));
        }

        const elapsedMs = performance.now() - cellStart;
        const cell: Cell = {
          batch,
          workers,
          rows: rounds * batch * workers,
          committed,
          failedBatches,
          retries,
          elapsedMs: Number(elapsedMs.toFixed(2)),
          rowsPerSecond: Number((committed / (elapsedMs / 1000)).toFixed(1)),
          p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
          p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
          maxMs: Number(Math.max(...latencies).toFixed(2)),
        };
        cells.push(cell);
        console.log(JSON.stringify({ event: "server-postgres-cell", ...cell }));

        await cleanup();
        const residue = await remaining();
        console.log(JSON.stringify({ event: "server-postgres-cell-cleanup", batch, workers, remainingRows: residue }));
        if (residue !== 0) throw new Error("Benchmark residue detected; stopping.");
      }
    }
  } finally {
    await cleanup();
    console.log(JSON.stringify({
      event: "server-postgres-final-cleanup",
      remainingRows: await remaining(),
      ...(await databaseSnapshot()),
    }));
  }

  const demand = [
    { vehicles: 1000, rps: 77.78 },
    { vehicles: 10000, rps: 777.78 },
    { vehicles: 50000, rps: 3888.89 },
    { vehicles: 100000, rps: 7777.78 },
  ];
  const best = cells.reduce((a, b) => (b.rowsPerSecond > a.rowsPerSecond ? b : a), cells[0]);
  console.log(JSON.stringify({
    event: "server-postgres-summary",
    best,
    headroom: demand.map((d) => ({
      vehicles: d.vehicles,
      requiredRps: d.rps,
      headroomX: Number((best.rowsPerSecond / d.rps).toFixed(2)),
      candidateAt2x: best.rowsPerSecond >= d.rps * 2,
    })),
    limitations: [
      "Measures native PostgreSQL protocol from this benchmark client to the current Supabase database.",
      "Direct database credentials are server-only and this path is not a browser authorization path.",
      "Average-load headroom alone is not production approval.",
      "Production-like Infomaniak queue/worker, burst, database resource, failover and Morocco-compliance validation remain required.",
    ],
  }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
