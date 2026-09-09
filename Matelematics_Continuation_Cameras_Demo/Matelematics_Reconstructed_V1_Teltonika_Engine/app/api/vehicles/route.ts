import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  if (!supabaseUrl || !secretKey) {
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
    request.headers.get("authorization");

  const token =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const admin = getAdmin();

  const {
    data: userData,
    error: userError,
  } =
    await admin.auth.getUser(token);

  if (
    userError ||
    !userData.user
  ) {
    throw new Error("AUTH_REQUIRED");
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
      .eq("id", userData.user.id)
      .single();

  if (
    profileError ||
    !profile
  ) {
    throw new Error("PROFILE_REQUIRED");
  }

  if (!isRole(profile.role)) {
    throw new Error("FORBIDDEN");
  }

  return {
    admin,
    profile: profile as Profile,
  };
}

export async function GET(
  request: NextRequest,
) {
  try {
    const {
      admin,
      profile,
    } =
      await authenticate(request);

    /*
     * -------------------------------------------------------
     * DETERMINER LES ENTREPRISES AUTORISEES
     * -------------------------------------------------------
     */

    let allowedCompanyIds:
      string[] | null = null;

    if (
      profile?.role === "client_admin" ||
      profile?.role === "user"
    ) {
      allowedCompanyIds =
        profile.company_id
          ? [profile.company_id]
          : [];
    }

    if (
      profile?.role === "partner_admin"
    ) {
      if (!profile.partner_id) {
        allowedCompanyIds = [];
      } else {
        const {
          data: partnerCompanies,
          error,
        } =
          await admin
            .from("companies")
            .select("id")
            .eq(
              "partner_id",
              profile.partner_id,
            );

        if (error) {
          throw error;
        }

        allowedCompanyIds =
          (partnerCompanies ?? []).map(
            (company) => company.id,
          );
      }
    }

    /*
     * -------------------------------------------------------
     * VEHICULES
     * -------------------------------------------------------
     */

    let vehicleQuery =
      admin
        .from("vehicles")
        .select(
          "id,company_id,name,registration,brand,model,year,device_id,status,created_at",
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

    if (allowedCompanyIds !== null) {
      if (allowedCompanyIds.length === 0) {
        return NextResponse.json({
          vehicles: [],
        });
      }

      vehicleQuery =
        vehicleQuery.in(
          "company_id",
          allowedCompanyIds,
        );
    }

    const {
      data: vehicles,
      error: vehicleError,
    } =
      await vehicleQuery;

    if (vehicleError) {
      throw vehicleError;
    }

    const vehicleRows =
      vehicles ?? [];

    if (vehicleRows.length === 0) {
      return NextResponse.json({
        vehicles: [],
      });
    }

    /*
     * -------------------------------------------------------
     * ENTREPRISES
     * -------------------------------------------------------
     */

    const companyIds =
      Array.from(
        new Set(
          vehicleRows.map(
            (vehicle) =>
              vehicle.company_id,
          ),
        ),
      );

    const {
      data: companies,
      error: companyError,
    } =
      await admin
        .from("companies")
        .select("id,name")
        .in("id", companyIds);

    if (companyError) {
      throw companyError;
    }

    const companyMap =
      new Map<string, string>();

    for (
      const company of
      companies ?? []
    ) {
      companyMap.set(
        company.id,
        company.name,
      );
    }

    /*
     * -------------------------------------------------------
     * TRACKERS
     *
     * IMPORTANT :
     *
     * La relation réelle est :
     *
     * devices.vehicle_id -> vehicles.id
     *
     * et NON :
     *
     * vehicles.device_id -> devices.id
     *
     * vehicles.device_id contient actuellement des valeurs
     * legacy telles que DEMO-FMC125-A.
     * -------------------------------------------------------
     */

    const vehicleIds =
      vehicleRows.map(
        (vehicle) =>
          vehicle.id,
      );

    const {
      data: devices,
      error: deviceError,
    } =
      await admin
        .from("devices")
        .select(
          "id,vehicle_id,imei,manufacturer,model,status,last_seen_at",
        )
        .in(
          "vehicle_id",
          vehicleIds,
        )
        .order(
          "last_seen_at",
          {
            ascending: false,
          },
        );

    if (deviceError) {
      throw deviceError;
    }

    const deviceMap =
      new Map<
        string,
        {
          id: string;
          imei: string | null;
          manufacturer: string | null;
          model: string | null;
          status: string | null;
          last_seen_at: string | null;
        }
      >();

    for (
      const device of
      devices ?? []
    ) {
      if (
        device.vehicle_id &&
        !deviceMap.has(
          device.vehicle_id,
        )
      ) {
        deviceMap.set(
          device.vehicle_id,
          {
            id: device.id,
            imei:
              device.imei ??
              null,
            manufacturer:
              device.manufacturer ??
              null,
            model:
              device.model ??
              null,
            status:
              device.status ??
              null,
            last_seen_at:
              device.last_seen_at ??
              null,
          },
        );
      }
    }

    /*
     * -------------------------------------------------------
     * FORMAT COMPATIBLE AVEC VEHICLES/PAGE.TSX
     * -------------------------------------------------------
     */

    const result =
      vehicleRows.map(
        (vehicle) => {
          const device =
            deviceMap.get(
              vehicle.id,
            );

          let displayStatus =
            "Hors ligne";

          if (
            device?.status ===
            "online"
          ) {
            displayStatus =
              "En ligne";
          } else if (
            vehicle.status ===
            "active"
          ) {
            displayStatus =
              device
                ? "En ligne"
                : "Actif";
          }

          return {
            /*
             * CET ID EST LE VRAI UUID VEHICLE.
             * C'est lui qui sera envoyé à :
             * /dashboard/vehicle/[id]
             */
            id: vehicle.id,

            companyId:
              vehicle.company_id,

            companyName:
              companyMap.get(
                vehicle.company_id,
              ) ??
              "Client",

            name:
              vehicle.name,

            registration:
              vehicle.registration,

            brand:
              vehicle.brand,

            model:
              vehicle.model,

            year:
              vehicle.year,

            status:
              displayStatus,

            deviceModel:
              device?.model ??
              "Non assigné",

            trackerImei:
              device?.imei ??
              "Non assigné",

            trackerId:
              device?.id ??
              null,

            trackerStatus:
              device?.status ??
              null,

            lastSeenAt:
              device?.last_seen_at ??
              null,

            /*
             * Conducteurs pas encore reliés au schéma réel.
             */
            driver:
              "Non affecté",
          };
        },
      );

    console.log(
      `[Vehicles API] ${result.length} véhicule(s) chargé(s).`,
    );

    return NextResponse.json({
      vehicles: result,
    });
  } catch (error) {
    console.error(
      "[Vehicles API]",
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
      "PROFILE_REQUIRED" ||
      message ===
      "FORBIDDEN"
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