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

const DEFAULT_HISTORY_WINDOW_HOURS: HistoryWindowHours = 24;
const MAX_HISTORY_POINTS = 500;
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

function parseHistoryWindow(request: NextRequest): HistoryWindowHours {
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
    const historyWindowHours = parseHistoryWindow(request);

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

    const { data: positionRows, error: positionsError } = await admin
      .from("positions")
      .select("latitude,longitude,speed,heading,recorded_at")
      .eq("vehicle_id", vehicleId)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .gte("recorded_at", from.toISOString())
      .lte("recorded_at", to.toISOString())
      .order("recorded_at", { ascending: false })
      .limit(MAX_HISTORY_POINTS);

    if (positionsError) {
      throw positionsError;
    }

    const points = (positionRows ?? [])
      .slice()
      .reverse()
      .map((position) => ({
        lat: position.latitude,
        lng: position.longitude,
        speed: position.speed ?? null,
        heading: position.heading ?? null,
        recordedAt: position.recorded_at,
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
      points,
      count: points.length,
      truncated: points.length === MAX_HISTORY_POINTS,
      maxPoints: MAX_HISTORY_POINTS,
    });
  } catch (error) {
    console.error("[Dashboard Vehicle History API]", error);

    const message = error instanceof Error ? error.message : "Erreur serveur.";

    if (message === "AUTH_REQUIRED") {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 },
      );
    }

    if (message === "PROFILE_REQUIRED" || message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Profil utilisateur introuvable." },
        { status: 403 },
      );
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

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
