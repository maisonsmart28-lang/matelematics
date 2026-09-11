import { createClient } from "@supabase/supabase-js";
import type { Gt06Position } from "./protocol";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[GT06] Missing required environment variable: ${name}`);
  return value;
}

let client: ReturnType<typeof createClient> | null = null;

function supabase() {
  if (!client) {
    client = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

export async function persistGt06Position(position: Gt06Position) {
  const { data: device, error: deviceError } = await supabase()
    .from("devices")
    .select("id,company_id,vehicle_id,imei")
    .eq("imei", position.imei)
    .maybeSingle();

  if (deviceError) throw new Error(`[GT06] Device lookup failed: ${deviceError.message}`);
  if (!device) throw new Error(`[GT06] Unknown Supabase device IMEI ${position.imei}`);
  if (!device.vehicle_id) throw new Error(`[GT06] Device ${position.imei} is not assigned to a vehicle`);

  const { error: positionError } = await supabase().from("positions").insert({
    company_id: device.company_id,
    vehicle_id: device.vehicle_id,
    device_id: device.id,
    latitude: position.latitude,
    longitude: position.longitude,
    altitude: 0,
    speed: position.speedKph,
    heading: position.angle,
    recorded_at: position.timestamp,
  });
  if (positionError) throw new Error(`[GT06] Position insert failed: ${positionError.message}`);

  const { error: telemetryError } = await supabase().from("telemetry").insert({
    company_id: device.company_id,
    vehicle_id: device.vehicle_id,
    device_id: device.id,
    recorded_at: position.timestamp,
    source: "gt06",
    codec: `GT06-${position.protocol.toString(16).padStart(2, "0").toUpperCase()}`,
    raw_payload: position.rawHex,
    io_values: {},
    can_payload: {},
    metadata: {
      imei: position.imei,
      protocol: position.protocol,
      serial: position.serial,
      satellites: position.satellites,
      gps_valid: position.gpsValid,
      tracker_family: "GT06",
      tracker_brand: "Accurate",
      simulator: process.env.GT06_SIMULATOR === "1",
    },
    signal_strength: null,
    battery_voltage: null,
    ignition: null,
  });
  if (telemetryError) throw new Error(`[GT06] Telemetry insert failed: ${telemetryError.message}`);

  const now = new Date().toISOString();
  const { error: updateError } = await supabase().from("devices").update({
    status: "online",
    last_seen_at: now,
    updated_at: now,
  }).eq("id", device.id);
  if (updateError) throw new Error(`[GT06] Device status update failed: ${updateError.message}`);

  return { deviceId: device.id, companyId: device.company_id, vehicleId: device.vehicle_id };
}
