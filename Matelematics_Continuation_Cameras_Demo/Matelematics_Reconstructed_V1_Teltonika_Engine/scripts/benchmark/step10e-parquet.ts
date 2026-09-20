import { createClient } from "@supabase/supabase-js";
import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { loadEnvFile } from "node:process";
import { existsSync, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import parquet from "parquetjs-lite";

if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase server credentials");

const supabase = createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false } });
const sampleSize = Number(process.env.ARCHIVE_SAMPLE_ROWS ?? "5000");
const monthlyMessagesPerVehicle = 201_600;
const months = 12;

async function fetchRows() {
  const tFetch = performance.now();
  const pageSize = Math.min(1000, sampleSize);
  const data: Record<string, unknown>[] = [];
  for (let from = 0; from < sampleSize; from += pageSize) {
    const to = Math.min(from + pageSize, sampleSize) - 1;
    const { data: page, error } = await supabase.from("telemetry")
      .select("company_id,vehicle_id,device_id,recorded_at,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition,source")
      .neq("source","benchmark_10e2")
      .order("recorded_at",{ascending:false})
      .range(from,to);
    if (error) throw error;
    if (!page?.length) break;
    data.push(...page);
    if (page.length < to - from + 1) break;
  }
  if (!data.length) throw new Error("No telemetry rows available");
  return { data, fetchMs: performance.now()-tFetch };
}

function json(value: unknown) {
  return value == null ? null : JSON.stringify(value);
}

async function main() {
  console.log(JSON.stringify({event:"archive-format-benchmark-start",sampleSize,formats:["jsonl+gzip","parquet+snappy"]}));

  const { data, fetchMs } = await fetchRows();

  const jsonl = Buffer.from(data.map(row=>JSON.stringify(row)).join("\n")+"\n","utf8");
  const tGzip = performance.now();
  const gz = gzipSync(jsonl,{level:6});
  const gzipMs = performance.now()-tGzip;

  const schema = new parquet.ParquetSchema({
    company_id: { type: "UTF8", optional: true },
    vehicle_id: { type: "UTF8", optional: true },
    device_id: { type: "UTF8", optional: true },
    recorded_at: { type: "UTF8", optional: true },
    codec: { type: "UTF8", optional: true },
    raw_payload: { type: "UTF8", optional: true },
    io_values: { type: "UTF8", optional: true },
    can_payload: { type: "UTF8", optional: true },
    metadata: { type: "UTF8", optional: true },
    signal_strength: { type: "DOUBLE", optional: true },
    battery_voltage: { type: "DOUBLE", optional: true },
    ignition: { type: "BOOLEAN", optional: true },
    source: { type: "UTF8", optional: true }
  });

  const parquetPath = join(tmpdir(), `matelematics-step10e-${process.pid}.parquet`);
  const tParquet = performance.now();
  const writer = await parquet.ParquetWriter.openFile(schema, parquetPath, { useDataPageV2: false, compression: "SNAPPY" });
  try {
    for (const row of data) {
      await writer.appendRow({
        company_id: row.company_id ?? null,
        vehicle_id: row.vehicle_id ?? null,
        device_id: row.device_id ?? null,
        recorded_at: row.recorded_at ?? null,
        codec: row.codec == null ? null : String(row.codec),
        raw_payload: json(row.raw_payload),
        io_values: json(row.io_values),
        can_payload: json(row.can_payload),
        metadata: json(row.metadata),
        signal_strength: typeof row.signal_strength === "number" ? row.signal_strength : null,
        battery_voltage: typeof row.battery_voltage === "number" ? row.battery_voltage : null,
        ignition: typeof row.ignition === "boolean" ? row.ignition : null,
        source: row.source ?? null
      });
    }
    await writer.close();
  } catch (e) {
    try { await writer.close(); } catch {}
    throw e;
  }
  const parquetMs = performance.now()-tParquet;
  const parquetBytes = (await fs.stat(parquetPath)).size;

  let parquetRows = 0;
  const tRead = performance.now();
  const reader = await parquet.ParquetReader.openFile(parquetPath);
  try {
    const cursor = reader.getCursor();
    while (await cursor.next()) parquetRows++;
  } finally {
    await reader.close();
    await fs.unlink(parquetPath).catch(()=>{});
  }
  const parquetReadMs = performance.now()-tRead;
  if (parquetRows !== data.length) throw new Error(`Parquet integrity check failed: expected ${data.length}, got ${parquetRows}`);

  const jsonlGzipBpr = gz.length/data.length;
  const parquetBpr = parquetBytes/data.length;
  const vehicles=[1000,10000,50000,100000];

  const projections = vehicles.map(vehicleCount=>({
    vehicles: vehicleCount,
    jsonlGzipTwelveMonthTB: Number((jsonlGzipBpr*monthlyMessagesPerVehicle*months*vehicleCount/1e12).toFixed(2)),
    parquetTwelveMonthTB: Number((parquetBpr*monthlyMessagesPerVehicle*months*vehicleCount/1e12).toFixed(2))
  }));

  console.log(JSON.stringify({
    event:"archive-format-benchmark",
    rows:data.length,
    fetchMs:Number(fetchMs.toFixed(1)),
    jsonlGzip:{
      bytes:gz.length,
      bytesPerRow:Number(jsonlGzipBpr.toFixed(1)),
      writeMs:Number(gzipMs.toFixed(1))
    },
    parquetSnappy:{
      bytes:parquetBytes,
      bytesPerRow:Number(parquetBpr.toFixed(1)),
      writeMs:Number(parquetMs.toFixed(1)),
      readMs:Number(parquetReadMs.toFixed(1)),
      integrity:"ok"
    },
    sizeDeltaPercentVsJsonlGzip:Number(((parquetBytes/gz.length-1)*100).toFixed(2)),
    projections
  }));
}

main().catch(e=>{ console.error(e); process.exitCode=1; });
