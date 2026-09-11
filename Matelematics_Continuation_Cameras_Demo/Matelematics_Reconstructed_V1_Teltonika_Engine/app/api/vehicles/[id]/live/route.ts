import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  resolveHardwareCapabilities,
} from "../../../../../server/hardware/capabilities";

export const runtime = "nodejs";

type Role =
  | "matelematics_admin"
  | "partner_admin"
  | "client_admin"
  | "user";

function isRole(
  value: unknown,
): value is Role {
  return (
    value === "matelematics_admin" ||
    value === "partner_admin" ||
    value === "client_admin" ||
    value === "user"
  );
}

type Profile = {
  id: string;
  role: Role;
  company_id: string | null;
  partner_id: string | null;
};

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const secretKey =
  process.env.SUPABASE_SECRET_KEY;

function getAdmin() {
  if (
    !supabaseUrl ||
    !secretKey
  ) {
    throw new Error(
      "Configuration Supabase serveur absente.",
    );
  }

  return createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

async function authenticate(
  request: NextRequest,
) {
  const authorization =
    request.headers.get(
      "authorization",
    );

  const token =
    authorization?.startsWith(
      "Bearer ",
    )
      ? authorization.slice(7)
      : null;

  if (!token) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const admin =
    getAdmin();

  const {
    data: userData,
    error: userError,
  } =
    await admin.auth.getUser(
      token,
    );

  if (
    userError ||
    !userData.user
  ) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }

  const {
    data: profile,
    error: profileError,
  } =
    await admin
      .from("profiles")
      .select(
        "id,role,company_id,partner_id",
      )
      .eq(
        "id",
        userData.user.id,
      )
      .single();

  if (
    profileError ||
    !profile
  ) {
    throw new Error(
      "PROFILE_REQUIRED",
    );
  }

  if (!isRole(profile.role)) {
    throw new Error(
      "FORBIDDEN",
    );
  }

  return {
    admin,
    profile:
      profile as Profile,
  };
}

function extractVehicleId(
  request: NextRequest,
) {
  const parts =
    request.nextUrl.pathname
      .split("/")
      .filter(Boolean);

  const vehicleIndex =
    parts.indexOf(
      "vehicles",
    );

  if (
    vehicleIndex === -1 ||
    !parts[
      vehicleIndex + 1
    ]
  ) {
    throw new Error(
      "VEHICLE_ID_REQUIRED",
    );
  }

  return decodeURIComponent(
    parts[
      vehicleIndex + 1
    ],
  );
}

function extractSourceProfile(
  canPayload: unknown,
): string | null {
  if (
    !canPayload ||
    typeof canPayload !== "object"
  ) {
    return null;
  }

  const source =
    (canPayload as {
      source?: unknown;
    }).source;

  if (
    !source ||
    typeof source !== "object"
  ) {
    return null;
  }

  const profile =
    (source as {
      profile?: unknown;
    }).profile;

  return typeof profile === "string"
    ? profile
    : null;
}

export async function GET(
  request: NextRequest,
) {
  try {
    const {
      admin,
      profile,
    } =
      await authenticate(
        request,
      );

    const vehicleId =
      extractVehicleId(
        request,
      );

    const {
      data: vehicle,
      error: vehicleError,
    } =
      await admin
        .from("vehicles")
        .select(
          "id,company_id,name,registration,brand,model,year,device_id,status",
        )
        .eq(
          "id",
          vehicleId,
        )
        .maybeSingle();

    if (vehicleError) {
      throw vehicleError;
    }

    if (!vehicle) {
      return NextResponse.json(
        {
          error:
            "Véhicule introuvable.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * ---------------------------------------------------------
     * CONTROLE DU PERIMETRE
     * ---------------------------------------------------------
     */

    if (
      (
        profile.role ===
          "client_admin" ||
        profile.role ===
          "user"
      ) &&
      profile.company_id !==
        vehicle.company_id
    ) {
      return NextResponse.json(
        {
          error:
            "Accès à ce véhicule refusé.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      profile.role ===
      "partner_admin"
    ) {
      if (!profile.partner_id) {
        return NextResponse.json(
          {
            error:
              "Partenaire utilisateur introuvable.",
          },
          {
            status: 403,
          },
        );
      }

      const {
        data: company,
        error: companyError,
      } =
        await admin
          .from("companies")
          .select(
            "id,partner_id",
          )
          .eq(
            "id",
            vehicle.company_id,
          )
          .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      if (
        !company ||
        company.partner_id !==
          profile.partner_id
      ) {
        return NextResponse.json(
          {
            error:
              "Véhicule hors de votre périmètre partenaire.",
          },
          {
            status: 403,
          },
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * ENTREPRISE
     * ---------------------------------------------------------
     */

    const {
      data: company,
    } =
      await admin
        .from("companies")
        .select(
          "id,name",
        )
        .eq(
          "id",
          vehicle.company_id,
        )
        .maybeSingle();

    /*
     * ---------------------------------------------------------
     * DEVICE
     * ---------------------------------------------------------
     */

    const {
      data: device,
      error: deviceError,
    } =
      await admin
        .from("devices")
        .select(
          "id,imei,manufacturer,model,status,last_seen_at",
        )
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .order(
          "last_seen_at",
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle();

    if (deviceError) {
      throw deviceError;
    }

    /*
     * ---------------------------------------------------------
     * CAMERA INSTALLEE / CONFIGUREE
     * ---------------------------------------------------------
     */

    const {
      data: activeCamera,
      error: cameraError,
    } =
      await admin
        .from("cameras")
        .select("id")
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .eq(
          "company_id",
          vehicle.company_id,
        )
        .eq(
          "status",
          "active",
        )
        .limit(1)
        .maybeSingle();

    if (cameraError) {
      throw cameraError;
    }

    /*
     * ---------------------------------------------------------
     * DERNIERE POSITION GPS
     * ---------------------------------------------------------
     */

    const {
      data: position,
      error: positionError,
    } =
      await admin
        .from("positions")
        .select(
          "latitude,longitude,altitude,speed,heading,recorded_at",
        )
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .order(
          "recorded_at",
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle();

    if (positionError) {
      throw positionError;
    }

    /*
     * ---------------------------------------------------------
     * DERNIERE TELEMETRIE
     * ---------------------------------------------------------
     */

    const {
      data: telemetry,
      error: telemetryError,
    } =
      await admin
        .from("telemetry")
        .select(
          "recorded_at,codec,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition",
        )
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .order(
          "recorded_at",
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle();

    if (telemetryError) {
      throw telemetryError;
    }

    const sourceProfile =
      extractSourceProfile(
        telemetry?.can_payload,
      );

    const hardware =
      resolveHardwareCapabilities({
        manufacturer:
          device?.manufacturer ??
          null,
        model:
          device?.model ??
          null,
        sourceProfile,
        cameraConfigured:
          Boolean(activeCamera),
      });

    /*
     * ---------------------------------------------------------
     * STATS GPS 24H
     * ---------------------------------------------------------
     */

    const since =
      new Date(
        Date.now() -
        24 *
        60 *
        60 *
        1000,
      ).toISOString();

    const {
      data: recentPositions,
      error: recentError,
    } =
      await admin
        .from("positions")
        .select(
          "speed,recorded_at",
        )
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .gte(
          "recorded_at",
          since,
        )
        .order(
          "recorded_at",
          {
            ascending: false,
          },
        )
        .limit(1000);

    if (recentError) {
      throw recentError;
    }

    const speeds =
      (
        recentPositions ??
        []
      )
        .map(
          (row) =>
            row.speed,
        )
        .filter(
          (
            value,
          ): value is number =>
            typeof value ===
            "number",
        );

    const averageSpeed =
      speeds.length
        ? speeds.reduce(
            (
              total,
              value,
            ) =>
              total + value,
            0,
          ) /
          speeds.length
        : null;

    const maxSpeed =
      speeds.length
        ? Math.max(
            ...speeds,
          )
        : null;

    return NextResponse.json({
      vehicle: {
        ...vehicle,

        company_name:
          company?.name ??
          null,
      },

      device:
        device ?? null,

      hardware: {
        family:
          hardware.family,
        source_profile:
          sourceProfile,
        camera_configured:
          Boolean(activeCamera),
        capabilities:
          hardware.capabilities,
      },

      position:
        position ?? null,

      telemetry:
        telemetry ?? null,

      stats: {
        average_speed_24h:
          averageSpeed,

        max_speed_24h:
          maxSpeed,

        gps_points_24h:
          recentPositions
            ?.length ??
          0,
      },
    });
  } catch (error) {
    console.error(
      "[Vehicle Live API]",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Erreur serveur.";

    if (
      message ===
      "AUTH_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Authentification requise.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      message ===
      "PROFILE_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Profil utilisateur introuvable.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      message ===
      "FORBIDDEN"
    ) {
      return NextResponse.json(
        {
          error:
            "Acces refuse.",
        },
        {
          status: 403,
        },
      );
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}
