import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "matelematics_admin" | "partner_admin" | "client_admin" | "user";
type HistoryWindowHours = 1 | 6 | 24 | 168 | 720 | 2160 | 4320 | 8760;

type Profile = {
  id: string;
  role: Role;
  company_id: string | null;
  partner_id: string | null;
};

type HistoryRange = {
  mode: "preset" | "custom";
  hours: HistoryWindowHours | null;
  from: Date;
  to: Date;
};

type FuelHistoryRow = {
  recorded_at: string;
  fuel_level_percent: number | null;
  fuel_used_litres: number | null;
  odometer_km: number | null;
  raw_count: number;
  first_fuel_level_percent: number | null;
  last_fuel_level_percent: number | null;
  fuel_consumed_litres: number;
  distance_km: number;
  reset_count: number;
};

const ALLOWED_WINDOWS = new Set<number>([1, 6, 24, 168, 720, 2160, 4320, 8760]);
const DEFAULT_WINDOW: HistoryWindowHours = 24;
const MAX_POINTS = 400;

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function isRole(value: unknown): value is Role {
  return (
    value === "matelematics_admin" ||
    value === "partner_admin" ||
    value === "client_admin" ||
    value === "user"
  );
}

function getAdmin() {
  if (!supabaseUrl || !secretKey) {
    throw new Error("Configuration Supabase serveur absente.");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
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

function extractVehicleId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const index = parts.indexOf("vehicles");
  if (index === -1 || !parts[index + 1]) throw new Error("VEHICLE_ID_REQUIRED");
  return decodeURIComponent(parts[index + 1]);
}

function parseRange(request: NextRequest): HistoryRange {
  const now = new Date();
  const rawFrom = request.nextUrl.searchParams.get("from");
  const rawTo = request.nextUrl.searchParams.get("to");

  if (!rawFrom && !rawTo) {
    const rawHours = request.nextUrl.searchParams.get("hours");
    const value = rawHours ? Number(rawHours) : DEFAULT_WINDOW;
    if (!ALLOWED_WINDOWS.has(value)) throw new Error("INVALID_HISTORY_WINDOW");
    const hours = value as HistoryWindowHours;
    return {
      mode: "preset",
      hours,
      from: new Date(now.getTime() - hours * 60 * 60 * 1000),
      to: now,
    };
  }

  if (!rawFrom || !rawTo) throw new Error("CUSTOM_RANGE_BOTH_REQUIRED");
  if (request.nextUrl.searchParams.has("hours")) throw new Error("CUSTOM_RANGE_WITH_HOURS");

  const from = new Date(rawFrom);
  const to = new Date(rawTo);

  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    throw new Error("INVALID_CUSTOM_RANGE");
  }
  if (from.getTime() >= to.getTime()) throw new Error("INVALID_CUSTOM_RANGE_ORDER");
  if (to.getTime() > now.getTime()) throw new Error("CUSTOM_RANGE_IN_FUTURE");

  const earliestAllowed = new Date(now);
  earliestAllowed.setFullYear(earliestAllowed.getFullYear() - 1);
  if (from.getTime() < earliestAllowed.getTime()) throw new Error("CUSTOM_RANGE_TOO_OLD");

  return { mode: "custom", hours: null, from, to };
}

export async function GET(request: NextRequest) {
  try {
    const { admin, profile } = await authenticate(request);
    const vehicleId = extractVehicleId(request);
    const range = parseRange(request);

    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("id,company_id,name,registration")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) throw vehicleError;
    if (!vehicle) {
      return NextResponse.json({ error: "Véhicule introuvable." }, { status: 404 });
    }

    if (
      (profile.role === "client_admin" || profile.role === "user") &&
      profile.company_id !== vehicle.company_id
    ) {
      return NextResponse.json({ error: "Accès à ce véhicule refusé." }, { status: 403 });
    }

    if (profile.role === "partner_admin") {
      if (!profile.partner_id) {
        return NextResponse.json({ error: "Partenaire utilisateur introuvable." }, { status: 403 });
      }

      const { data: company, error: companyError } = await admin
        .from("companies")
        .select("id,partner_id")
        .eq("id", vehicle.company_id)
        .maybeSingle();

      if (companyError) throw companyError;
      if (!company || company.partner_id !== profile.partner_id) {
        return NextResponse.json({ error: "Accès à ce véhicule refusé." }, { status: 403 });
      }
    }

    const { data, error } = await admin.rpc("matelematics_vehicle_fuel_history", {
      p_vehicle_id: vehicleId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_max_points: MAX_POINTS,
    });

    if (error) throw error;

    const rows = (data ?? []) as FuelHistoryRow[];
    const first = rows[0] ?? null;
    const distanceKm = first ? Number(first.distance_km) : 0;
    const fuelConsumedLitres = first ? Number(first.fuel_consumed_litres) : 0;
    const averageConsumptionL100km =
      distanceKm > 0 && fuelConsumedLitres >= 0
        ? (fuelConsumedLitres / distanceKm) * 100
        : null;

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        registration: vehicle.registration,
      },
      window: {
        mode: range.mode,
        hours: range.hours,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      summary: {
        rawCount: first ? Number(first.raw_count) : 0,
        firstFuelLevelPercent: first?.first_fuel_level_percent ?? null,
        lastFuelLevelPercent: first?.last_fuel_level_percent ?? null,
        fuelConsumedLitres,
        distanceKm,
        averageConsumptionL100km,
        counterResetCount: first ? Number(first.reset_count) : 0,
      },
      points: rows.map((row) => ({
        recordedAt: row.recorded_at,
        fuelLevelPercent: row.fuel_level_percent,
        fuelUsedLitres: row.fuel_used_litres,
        odometerKm: row.odometer_km,
      })),
      sampling: {
        returnedPoints: rows.length,
        rawCount: first ? Number(first.raw_count) : 0,
        maxPoints: MAX_POINTS,
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "UNKNOWN_ERROR";

    if (message === "AUTH_REQUIRED") {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    if (message === "PROFILE_REQUIRED" || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
    if (message === "VEHICLE_ID_REQUIRED") {
      return NextResponse.json({ error: "Identifiant véhicule requis." }, { status: 400 });
    }
    if (message === "INVALID_HISTORY_WINDOW") {
      return NextResponse.json(
        { error: "Période invalide. Valeurs autorisées : 1 h, 6 h, 24 h, 7 j, 30 j, 3 mois, 6 mois ou 1 an." },
        { status: 400 },
      );
    }
    if (message === "CUSTOM_RANGE_BOTH_REQUIRED") {
      return NextResponse.json({ error: "Les dates de début et de fin sont toutes les deux requises." }, { status: 400 });
    }
    if (message === "CUSTOM_RANGE_WITH_HOURS") {
      return NextResponse.json({ error: "Utilisez soit une période prédéfinie, soit une période personnalisée." }, { status: 400 });
    }
    if (message === "INVALID_CUSTOM_RANGE") {
      return NextResponse.json({ error: "Période personnalisée invalide." }, { status: 400 });
    }
    if (message === "INVALID_CUSTOM_RANGE_ORDER") {
      return NextResponse.json({ error: "La date de début doit être antérieure à la date de fin." }, { status: 400 });
    }
    if (message === "CUSTOM_RANGE_IN_FUTURE") {
      return NextResponse.json({ error: "La période personnalisée ne peut pas se terminer dans le futur." }, { status: 400 });
    }
    if (message === "CUSTOM_RANGE_TOO_OLD") {
      return NextResponse.json({ error: "La période personnalisée doit rester dans les 12 derniers mois." }, { status: 400 });
    }

    console.error("[Vehicle fuel history API]", cause);
    return NextResponse.json({ error: "Impossible de charger l'historique carburant." }, { status: 500 });
  }
}
