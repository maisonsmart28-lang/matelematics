import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role =
  | "matelematics_admin"
  | "partner_admin"
  | "client_admin"
  | "user";

type Profile = {
  id: string;
  role: Role;
  company_id: string | null;
  partner_id: string | null;
};

type HistoryWindowHours = 1 | 6 | 24 | 168 | 720 | 2160 | 4320 | 8760;

type TripRow = {
  trip_key: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  distance_km: number;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  point_count: number;
  avg_speed: number;
  max_speed: number;
  total_count: number;
};

const DEFAULT_HISTORY_WINDOW_HOURS: HistoryWindowHours = 24;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const ALLOWED_HISTORY_WINDOWS = new Set<number>([
  1,
  6,
  24,
  168,
  720,
  2160,
  4320,
  8760,
]);

function isRole(value: unknown): value is Role {
  return (
    value === "matelematics_admin" ||
    value === "partner_admin" ||
    value === "client_admin" ||
    value === "user"
  );
}

function parseWindow(request: NextRequest): HistoryWindowHours {
  const raw = request.nextUrl.searchParams.get("hours");

  if (!raw) {
    return DEFAULT_HISTORY_WINDOW_HOURS;
  }

  const value = Number(raw);

  if (ALLOWED_HISTORY_WINDOWS.has(value)) {
    return value as HistoryWindowHours;
  }

  throw new Error("INVALID_HISTORY_WINDOW");
}

function parsePositiveInteger(raw: string | null, fallback: number) {
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("INVALID_PAGINATION");
  }

  return value;
}

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

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
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const admin = getAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);

  if (userError || !userData.user) {
    throw new Error("AUTH_REQUIRED");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,role,company_id,partner_id")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("PROFILE_REQUIRED");
  }

  if (!isRole(profile.role)) {
    throw new Error("FORBIDDEN");
  }

  return { admin, profile: profile as Profile };
}

function extractVehicleId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/").filter(Boolean);
  const vehicleIndex = parts.indexOf("vehicles");

  if (vehicleIndex === -1 || !parts[vehicleIndex + 1]) {
    throw new Error("VEHICLE_ID_REQUIRED");
  }

  return decodeURIComponent(parts[vehicleIndex + 1]);
}

export async function GET(request: NextRequest) {
  try {
    const { admin, profile } = await authenticate(request);
    const vehicleId = extractVehicleId(request);
    const historyWindowHours = parseWindow(request);
    const page = parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1);
    const requestedPageSize = parsePositiveInteger(
      request.nextUrl.searchParams.get("pageSize"),
      DEFAULT_PAGE_SIZE,
    );
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);
    const offset = (page - 1) * pageSize;

    const { data: vehicle, error: vehicleError } = await admin
      .from("vehicles")
      .select("id,company_id,name,registration")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehicleError) {
      throw vehicleError;
    }

    if (!vehicle) {
      return NextResponse.json(
        { error: "Véhicule introuvable." },
        { status: 404 },
      );
    }

    if (
      (profile.role === "client_admin" || profile.role === "user") &&
      profile.company_id !== vehicle.company_id
    ) {
      return NextResponse.json(
        { error: "Accès à ce véhicule refusé." },
        { status: 403 },
      );
    }

    if (profile.role === "partner_admin") {
      if (!profile.partner_id) {
        return NextResponse.json(
          { error: "Partenaire utilisateur introuvable." },
          { status: 403 },
        );
      }

      const { data: company, error: companyError } = await admin
        .from("companies")
        .select("id,partner_id")
        .eq("id", vehicle.company_id)
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (!company || company.partner_id !== profile.partner_id) {
        return NextResponse.json(
          { error: "Accès à ce véhicule refusé." },
          { status: 403 },
        );
      }
    }

    const to = new Date();
    const from = new Date(
      to.getTime() - historyWindowHours * 60 * 60 * 1000,
    );

    const { data, error: tripsError } = await admin.rpc(
      "matelematics_vehicle_trip_summaries",
      {
        p_vehicle_id: vehicleId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_limit: pageSize,
        p_offset: offset,
      },
    );

    if (tripsError) {
      throw tripsError;
    }

    const rows = (data ?? []) as TripRow[];
    const total = rows[0]?.total_count ?? 0;
    const trips = rows.map((row) => ({
      id: row.trip_key,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSeconds: Number(row.duration_seconds),
      distanceKm: Number(row.distance_km),
      start: {
        lat: Number(row.start_lat),
        lng: Number(row.start_lng),
      },
      end: {
        lat: Number(row.end_lat),
        lng: Number(row.end_lng),
      },
      pointCount: Number(row.point_count),
      avgSpeed: Number(row.avg_speed),
      maxSpeed: Number(row.max_speed),
    }));

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        registration: vehicle.registration,
      },
      window: {
        hours: historyWindowHours,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      trips,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
      segmentation: {
        movingSpeedThresholdKmh: 2,
        stopGapMinutes: 5,
        minimumDistanceKm: 0.1,
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "UNKNOWN_ERROR";

    if (message === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 },
      );
    }

    if (message === "PROFILE_REQUIRED" || message === "FORBIDDEN") {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    if (message === "VEHICLE_ID_REQUIRED") {
      return NextResponse.json(
        { error: "Identifiant véhicule requis." },
        { status: 400 },
      );
    }

    if (message === "INVALID_HISTORY_WINDOW") {
      return NextResponse.json(
        {
          error:
            "Période d'historique invalide. Valeurs autorisées : 1 h, 6 h, 24 h, 7 j, 30 j, 90 j, 180 j ou 1 an.",
        },
        { status: 400 },
      );
    }

    if (message === "INVALID_PAGINATION") {
      return NextResponse.json(
        { error: "Pagination invalide." },
        { status: 400 },
      );
    }

    console.error("[Dashboard vehicle trips]", cause);
    return NextResponse.json(
      { error: "Impossible de charger les trajets du véhicule." },
      { status: 500 },
    );
  }
}
