import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[GT06 prepare] Missing required environment variable: ${name}`);
  return value;
}

function vehicleLabel(vehicle: Record<string, unknown>): string {
  const candidates = [
    vehicle.name,
    vehicle.plate_number,
    vehicle.registration_number,
    vehicle.registration,
    vehicle.license_plate,
    vehicle.vin,
  ];

  const readable = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return typeof readable === "string" ? readable : String(vehicle.id);
}

async function main() {
  loadLocalEnv();

  const supabase = createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const imei = process.env.GT06_SIM_IMEI ?? "864180070000001";

  const { data: existing, error: existingError } = await supabase
    .from("devices")
    .select("id,company_id,vehicle_id,imei,manufacturer,model")
    .eq("imei", imei)
    .maybeSingle();

  if (existingError) {
    throw new Error(`[GT06 prepare] Device lookup failed: ${existingError.message}`);
  }

  if (existing) {
    console.log(
      `[GT06 prepare] Simulator device already exists imei=${imei} vehicle=${existing.vehicle_id ?? "none"}`,
    );
    return;
  }

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(20);

  if (vehiclesError) {
    throw new Error(`[GT06 prepare] Vehicle lookup failed: ${vehiclesError.message}`);
  }

  if (!vehicles || vehicles.length === 0) {
    throw new Error("[GT06 prepare] No vehicle found. Create a test vehicle first.");
  }

  console.log("\nChoose the vehicle that will receive GT06 simulator telemetry:\n");

  vehicles.forEach((vehicle, index) => {
    console.log(
      `${index + 1}. ${vehicleLabel(vehicle as Record<string, unknown>)}  id=${vehicle.id}`,
    );
  });

  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(`\nVehicle [1-${vehicles.length}]: `);
    const choice = Number(answer.trim());

    if (!Number.isInteger(choice) || choice < 1 || choice > vehicles.length) {
      throw new Error("[GT06 prepare] Invalid vehicle choice");
    }

    const vehicle = vehicles[choice - 1];

    if (!vehicle.company_id) {
      throw new Error("[GT06 prepare] Selected vehicle has no company_id");
    }

    const { data: device, error: insertError } = await supabase
      .from("devices")
      .insert({
        company_id: vehicle.company_id,
        vehicle_id: vehicle.id,
        imei,
        manufacturer: "Accurate",
        model: "GT06 Simulator",
        serial_number: `SIM-${imei}`,
        status: "offline",
      })
      .select("id,company_id,vehicle_id,imei")
      .single();

    if (insertError) {
      throw new Error(`[GT06 prepare] Device insert failed: ${insertError.message}`);
    }

    console.log(
      `\n[GT06 prepare] READY imei=${device.imei} vehicle=${device.vehicle_id} device=${device.id}`,
    );
    console.log("[GT06 prepare] You can now run npm run gt06:server and npm run gt06:simulate");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
