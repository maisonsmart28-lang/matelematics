import { createClient } from "@supabase/supabase-js";
import type { Gt06Position } from "./protocol";

// Only this server-side test RPC is exposed to the GT06 storage module.
type Gt06TestDatabase = {
  public: {
    Tables: {};
    Views: {};
    Functions: {
      persist_gt06_test_packet: {
        Args: {
          p_imei: string;
          p_raw_hex: string;
          p_recorded_at: string;
          p_latitude: number;
          p_longitude: number;
          p_speed_kph: number;
          p_heading: number;
          p_protocol: number;
          p_serial: number;
          p_satellites: number;
        };
        Returns: { result: "inserted" | "duplicate" | "legacy_duplicate" };
      };
    };
    Enums: {};
    CompositeTypes: {};
  };
};

let client: ReturnType<typeof createClient<Gt06TestDatabase>> | null = null;

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("[GT06] Missing server-only Supabase settings");
  if (!client) {
    client = createClient<Gt06TestDatabase>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

export async function persistGt06Position(position: Gt06Position): Promise<{ result: string }> {
  if (process.env.GT06_ENABLE_TEST_WRITES !== "I_ACCEPT_TEST_ONLY_WRITES" ||
      position.imei !== "864180070000001" || !position.gpsValid) {
    throw new Error("[GT06] Synthetic-only write guard rejected packet");
  }
  const { data, error } = await supabase().rpc("persist_gt06_test_packet", {
    p_imei: position.imei,
    p_raw_hex: position.rawHex,
    p_recorded_at: position.timestamp,
    p_latitude: position.latitude,
    p_longitude: position.longitude,
    p_speed_kph: position.speedKph,
    p_heading: position.angle,
    p_protocol: position.protocol,
    p_serial: position.serial,
    p_satellites: position.satellites,
  });
  if (error) throw new Error(`[GT06] Atomic test RPC failed: ${error.message}`);
  const result = data?.result;
  if (!["inserted", "duplicate", "legacy_duplicate"].includes(result)) {
    throw new Error("[GT06] Unexpected test RPC response");
  }
  return { result };
}
