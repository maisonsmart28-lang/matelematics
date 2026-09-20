import { createClient } from "@supabase/supabase-js";
import { gzipSync, gunzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase server credentials");

const supabase = createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false } });
const sampleSize = Number(process.env.ARCHIVE_SAMPLE_ROWS ?? "5000");
const monthlyMessagesPerVehicle = 201_600;
const months = 12;

async function main() {
  console.log(JSON.stringify({event:"archive-benchmark-start",format:"jsonl+gzip",sampleSize}));
  const tFetch = performance.now();
  const { data, error } = await supabase.from("telemetry")
    .select("company_id,vehicle_id,device_id,recorded_at,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition,source")
    .neq("source","benchmark_10e2")
    .order("recorded_at",{ascending:false})
    .limit(sampleSize);
  if (error) throw error;
  if (!data?.length) throw new Error("No telemetry rows available");
  const fetchMs = performance.now()-tFetch;

  const jsonl = Buffer.from(data.map(row=>JSON.stringify(row)).join("\n")+"\n","utf8");
  const tZip = performance.now();
  const gz = gzipSync(jsonl,{level:6});
  const gzipMs = performance.now()-tZip;
  const tRead = performance.now();
  const restored = gunzipSync(gz);
  const gunzipMs = performance.now()-tRead;
  if (!restored.equals(jsonl)) throw new Error("Archive integrity check failed");

  const rawBpr = jsonl.length/data.length;
  const gzBpr = gz.length/data.length;
  const ratio = jsonl.length/gz.length;
  const vehicles=[1000,10000,50000,100000];
  const projections=vehicles.map(vehicleCount=>({
    vehicles:vehicleCount,
    twelveMonthTB:Number((gzBpr*monthlyMessagesPerVehicle*months*vehicleCount/1e12).toFixed(2))
  }));

  console.log(JSON.stringify({
    event:"archive-compression-benchmark",
    rows:data.length,
    fetchMs:Number(fetchMs.toFixed(1)),
    rawBytes:jsonl.length,
    compressedBytes:gz.length,
    rawBytesPerRow:Number(rawBpr.toFixed(1)),
    compressedBytesPerRow:Number(gzBpr.toFixed(1)),
    compressionRatio:Number(ratio.toFixed(2)),
    reductionPercent:Number(((1-gz.length/jsonl.length)*100).toFixed(2)),
    gzipMs:Number(gzipMs.toFixed(1)),
    gunzipMs:Number(gunzipMs.toFixed(1)),
    integrity:"ok",
    projections
  }));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
