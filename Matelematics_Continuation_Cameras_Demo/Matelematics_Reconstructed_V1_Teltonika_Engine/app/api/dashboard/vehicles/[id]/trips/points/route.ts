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

type TripPointRow = {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
  raw_point_count: number;
};

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const MAX_MAP_POINTS = 1000;

function isRole(value: unknown): value is Role {
  return (
    value === "matelematics_admin" ||
    value === "partner_admin" ||
    value === "client_admin" ||
    value === "user"
  );
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

function parseRange(request: NextRequest) {
  const rawFrom = request.nextUrl.searchParams.get("from");
  const rawTo = request.nextUrl.searchParams.get("to");

  if (!rawFrom || !rawTo) {
    throw new Error("RANGE_REQUIRED");
  }

  const from = new Date(rawFrom);
  const to = new Date(rawTo);
  const fromMs = from.getTime();
  const toMs = to.getTime();

  if (
    !Number.isFinite(fromMs) ||
    !Number.isFinite(toMs) ||
    toMs <= fromMs ||
    toMs - fromMs > MAX_RANGE_MS
  ) {
    throw new Error("INVALID_RANGE");
  }

  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    const { admin, profile } = await authenticate(request);
    const vehicleId = extractVehicleId(request);
    const { from, to } = parseRange(request);

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

    const { data, error: pointsError } = await admin.rpc(
      "matelematics_vehicle_trip_points",
      {
        p_vehicle_id: vehicleId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_max_points: MAX_MAP_POINTS,
      },
    );

    if (pointsError) {
      throw pointsError;
    }

    const rows = (data ?? []) as TripPointRow[];
    const rawPointCount = Number(rows[0]?.raw_point_count ?? 0);
    const points = rows.map((row) => ({
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      speed: row.speed === null ? null : Number(row.speed),
      heading: row.heading === null ? null : Number(row.heading),
      recordedAt: row.recorded_at,
    }));

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        name: vehicle.name,
        registration: vehicle.registration,
      },
      range: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      points,
      sampling: {
        rawPointCount,
        returnedPointCount: points.length,
        sampled: rawPointCount > points.length,
        maxMapPoints: MAX_MAP_POINTS,
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

    if (message === "RANGE_REQUIRED") {
      return NextResponse.json(
        { error: "Les dates de début et de fin du trajet sont requises." },
        { status: 400 },
      );
    }

    if (message === "INVALID_RANGE") {
      return NextResponse.json(
        { error: "Période de trajet invalide ou supérieure à un an." },
        { status: 400 },
      );
    }

    console.error("[Dashboard vehicle trip points]", cause);
    return NextResponse.json(
      { error: "Impossible de charger le tracé du trajet." },
      { status: 500 },
    );
  }
}
