import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKER_FRESHNESS_MS = 120_000;

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

function isTrackerFresh(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  const timestamp = new Date(lastSeenAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const ageMs = Date.now() - timestamp;
  return ageMs >= 0 && ageMs <= TRACKER_FRESHNESS_MS;
}

function getMotionStatus(connectivityStatus: string, speed: number | null) {
  if (connectivityStatus !== "En ligne") {
    return "Hors ligne" as const;
  }

  return (speed ?? 0) > 2 ? ("En mouvement" as const) : ("À l'arrêt" as const);
}

export async function GET(request: NextRequest) {
  try {
    const { admin, profile } = await authenticate(request);

    let allowedCompanyIds: string[] | null = null;

    if (profile.role === "client_admin" || profile.role === "user") {
      allowedCompanyIds = profile.company_id ? [profile.company_id] : [];
    } else if (profile.role === "partner_admin") {
      if (!profile.partner_id) {
        allowedCompanyIds = [];
      } else {
        const { data: companies, error: companiesError } = await admin
          .from("companies")
          .select("id")
          .eq("partner_id", profile.partner_id);

        if (companiesError) {
          throw companiesError;
        }

        allowedCompanyIds = (companies ?? []).map((company) => company.id);
      }
    }

    let vehicleQuery = admin
      .from("vehicles")
      .select("id,company_id,name,registration,status,created_at")
      .order("created_at", { ascending: false });

    if (allowedCompanyIds !== null) {
      if (allowedCompanyIds.length === 0) {
        return NextResponse.json({ vehicles: [] });
      }

      vehicleQuery = vehicleQuery.in("company_id", allowedCompanyIds);
    }

    const { data: vehicleRows, error: vehiclesError } = await vehicleQuery;

    if (vehiclesError) {
      throw vehiclesError;
    }

    const vehicles = vehicleRows ?? [];

    if (vehicles.length === 0) {
      return NextResponse.json({ vehicles: [] });
    }

    const vehicleIds = vehicles.map((vehicle) => vehicle.id);

    const [devicesResult, positionsResult] = await Promise.all([
      admin
        .from("devices")
        .select("id,vehicle_id,status,last_seen_at")
        .in("vehicle_id", vehicleIds)
        .order("last_seen_at", { ascending: false }),
      admin
        .from("positions")
        .select("vehicle_id,latitude,longitude,speed,heading,recorded_at")
        .in("vehicle_id", vehicleIds)
        .order("recorded_at", { ascending: false })
        .limit(1000),
    ]);

    if (devicesResult.error) {
      throw devicesResult.error;
    }

    if (positionsResult.error) {
      throw positionsResult.error;
    }

    const latestDevice = new Map<
      string,
      {
        id: string;
        status: string | null;
        last_seen_at: string | null;
      }
    >();

    for (const device of devicesResult.data ?? []) {
      if (device.vehicle_id && !latestDevice.has(device.vehicle_id)) {
        latestDevice.set(device.vehicle_id, {
          id: device.id,
          status: device.status ?? null,
          last_seen_at: device.last_seen_at ?? null,
        });
      }
    }

    const latestPosition = new Map<
      string,
      {
        latitude: number | null;
        longitude: number | null;
        speed: number | null;
        heading: number | null;
        recorded_at: string;
      }
    >();

    for (const position of positionsResult.data ?? []) {
      if (!latestPosition.has(position.vehicle_id)) {
        latestPosition.set(position.vehicle_id, {
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed ?? null,
          heading: position.heading ?? null,
          recorded_at: position.recorded_at,
        });
      }
    }

    const result = vehicles.map((vehicle) => {
      const device = latestDevice.get(vehicle.id);
      const position = latestPosition.get(vehicle.id);
      const speed = position?.speed ?? null;
      const trackerFresh = isTrackerFresh(device?.last_seen_at ?? null);

      let connectivityStatus = "Hors ligne";

      if (device && trackerFresh) {
        connectivityStatus = "En ligne";
      } else if (!device && vehicle.status === "active") {
        connectivityStatus = "Actif";
      }

      return {
        id: vehicle.id,
        companyId: vehicle.company_id,
        name: vehicle.name,
        registration: vehicle.registration,
        driver: "Non affecté",
        status: connectivityStatus,
        motionStatus: getMotionStatus(connectivityStatus, speed),
        trackerId: device?.id ?? null,
        trackerStatus: device?.status ?? null,
        lastSeenAt: device?.last_seen_at ?? null,
        position: position
          ? {
              lat: position.latitude,
              lng: position.longitude,
              speed,
              heading: position.heading,
              recordedAt: position.recorded_at,
            }
          : null,
      };
    });

    return NextResponse.json({ vehicles: result });
  } catch (error) {
    console.error("[Dashboard Fleet API]", error);

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

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
