import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { resolveHardwareCapabilities } from "../../../../server/hardware/capabilities";
import { calculateFleetHealth, type SmartHealthEvidence, type SmartHealthSeverity } from "../../../../server/smart/fleet-health";
import { buildSmartRecommendations } from "../../../../server/smart/recommendations";
import { buildSmartFleetInsights, type SmartFleetVehicle } from "../../../../server/smart/fleet-insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "matelematics_admin" | "partner_admin" | "client_admin" | "user";
type Profile = { id: string; role: Role; company_id: string | null; partner_id: string | null };

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function isRole(value: unknown): value is Role {
  return ["matelematics_admin","partner_admin","client_admin","user"].includes(String(value));
}

function getAdmin() {
  if (!supabaseUrl || !secretKey) throw new Error("SUPABASE_CONFIG");
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) throw new Error("AUTH_REQUIRED");

  const admin = getAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("AUTH_REQUIRED");

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,role,company_id,partner_id")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) throw new Error("PROFILE_REQUIRED");
  if (!isRole(profile.role)) throw new Error("FORBIDDEN");
  return { admin, profile: profile as Profile };
}

async function getAllowedCompanyIds(admin: ReturnType<typeof getAdmin>, profile: Profile) {
  if (profile.role === "client_admin" || profile.role === "user") {
    return profile.company_id ? [profile.company_id] : [];
  }
  if (profile.role === "partner_admin") {
    if (!profile.partner_id) return [];
    const { data, error } = await admin.from("companies").select("id").eq("partner_id", profile.partner_id);
    if (error) throw error;
    return (data ?? []).map((row) => row.id);
  }
  return null;
}

function normalizeSeverity(value: unknown): SmartHealthSeverity {
  if (value === "critical" || value === "high" || value === "warning" || value === "info") return value;
  if (value === "error") return "high";
  return "warning";
}

function extractSourceProfile(canPayload: unknown): string | null {
  if (!canPayload || typeof canPayload !== "object" || Array.isArray(canPayload)) return null;
  const source = (canPayload as { source?: unknown }).source;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const profile = (source as { profile?: unknown }).profile;
  return typeof profile === "string" ? profile : null;
}

export async function GET(request: NextRequest) {
  try {
    const { admin, profile } = await authenticate(request);
    const allowedCompanyIds = await getAllowedCompanyIds(admin, profile);

    let vehicleQuery = admin
      .from("vehicles")
      .select("id,company_id,name,registration")
      .order("name", { ascending: true });

    if (allowedCompanyIds !== null) {
      if (allowedCompanyIds.length === 0) {
        return NextResponse.json({ insights: buildSmartFleetInsights([]) });
      }
      vehicleQuery = vehicleQuery.in("company_id", allowedCompanyIds);
    }

    const { data: vehicles, error: vehiclesError } = await vehicleQuery;
    if (vehiclesError) throw vehiclesError;
    if (!vehicles?.length) return NextResponse.json({ insights: buildSmartFleetInsights([]) });

    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [devicesResult, telemetryResult, camerasResult, alertsResult] = await Promise.all([
      admin.from("devices").select("vehicle_id,manufacturer,model,last_seen_at").in("vehicle_id", vehicleIds).order("last_seen_at", { ascending: false }),
      admin.from("telemetry").select("vehicle_id,recorded_at,can_payload").in("vehicle_id", vehicleIds).order("recorded_at", { ascending: false }).limit(5000),
      admin.from("cameras").select("vehicle_id,status").in("vehicle_id", vehicleIds).eq("status", "active"),
      admin.from("alerts")
        .select("id,vehicle_id,alert_type,severity,message,triggered_at,resolved_at,status")
        .in("vehicle_id", vehicleIds)
        .or(`status.eq.active,resolved_at.gte.${sevenDaysAgo}`)
        .order("triggered_at", { ascending: false })
        .limit(5000),
    ]);

    if (devicesResult.error) throw devicesResult.error;
    if (telemetryResult.error) throw telemetryResult.error;
    if (camerasResult.error) throw camerasResult.error;
    if (alertsResult.error) throw alertsResult.error;

    const latestDevice = new Map<string, { manufacturer: string | null; model: string | null }>();
    for (const row of devicesResult.data ?? []) {
      if (row.vehicle_id && !latestDevice.has(row.vehicle_id)) {
        latestDevice.set(row.vehicle_id, { manufacturer: row.manufacturer ?? null, model: row.model ?? null });
      }
    }

    const latestTelemetry = new Map<string, unknown>();
    for (const row of telemetryResult.data ?? []) {
      if (row.vehicle_id && !latestTelemetry.has(row.vehicle_id)) {
        latestTelemetry.set(row.vehicle_id, row.can_payload);
      }
    }

    const cameraVehicles = new Set((camerasResult.data ?? []).map((row) => row.vehicle_id));
    const alertsByVehicle = new Map<string, SmartHealthEvidence[]>();

    for (const alert of alertsResult.data ?? []) {
      const evidence: SmartHealthEvidence = {
        source: "alert",
        sourceId: alert.id,
        key: alert.alert_type,
        severity: normalizeSeverity(alert.severity),
        observedAt: alert.triggered_at,
        resolvedAt: alert.status === "active" ? null : alert.resolved_at,
        message: alert.message ?? null,
      };
      const existing = alertsByVehicle.get(alert.vehicle_id) ?? [];
      existing.push(evidence);
      alertsByVehicle.set(alert.vehicle_id, existing);
    }

    const smartVehicles: SmartFleetVehicle[] = vehicles.map((vehicle) => {
      const device = latestDevice.get(vehicle.id);
      const sourceProfile = extractSourceProfile(latestTelemetry.get(vehicle.id));
      const capabilities = resolveHardwareCapabilities({
        manufacturer: device?.manufacturer ?? null,
        model: device?.model ?? null,
        sourceProfile,
        cameraConfigured: cameraVehicles.has(vehicle.id),
      });
      const health = calculateFleetHealth({
        capabilities,
        evidence: alertsByVehicle.get(vehicle.id) ?? [],
      });
      const recommendations = buildSmartRecommendations(health);

      return {
        vehicleId: vehicle.id,
        name: vehicle.name,
        registration: vehicle.registration,
        health,
        recommendations,
      };
    });

    return NextResponse.json({ insights: buildSmartFleetInsights(smartVehicles) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SERVER_ERROR";
    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    if (message === "PROFILE_REQUIRED" || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    console.error("[Smart Fleet Insights API]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
