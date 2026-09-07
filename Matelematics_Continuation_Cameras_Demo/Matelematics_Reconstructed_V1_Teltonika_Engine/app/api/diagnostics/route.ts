import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  getJ1939RealClearProfile,
  canTransmitRealJ1939Clear,
} from "../../../server/teltonika/can/j1939-real-clear-profile";

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

type JsonMap = Record<string, unknown>;

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const secretKey =
  process.env.SUPABASE_SECRET_KEY;

function getAdmin() {
  if (!supabaseUrl || !secretKey) {
    throw new Error("SUPABASE_CONFIG");
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

async function authenticate(request: NextRequest) {
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

  if (userError || !userData.user) {
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

  if (profileError || !profile) {
    throw new Error("PROFILE_REQUIRED");
  }

  return {
    admin,
    profile: profile as Profile,
  };
}

async function getAllowedCompanyIds(
  admin: ReturnType<typeof getAdmin>,
  profile: Profile,
) {
  if (
    profile.role === "client_admin" ||
    profile.role === "user"
  ) {
    return profile.company_id
      ? [profile.company_id]
      : [];
  }

  if (profile.role === "partner_admin") {
    if (!profile.partner_id) {
      return [];
    }

    const {
      data,
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

    return (data ?? []).map(
      (row) => row.id,
    );
  }

  return null;
}

async function getVisibleVehicles(
  admin: ReturnType<typeof getAdmin>,
  profile: Profile,
) {
  const allowedCompanyIds =
    await getAllowedCompanyIds(
      admin,
      profile,
    );

  let query =
    admin
      .from("vehicles")
      .select(
        "id,company_id,name,registration,brand,model,status",
      )
      .order("name");

  if (allowedCompanyIds !== null) {
    if (allowedCompanyIds.length === 0) {
      return [];
    }

    query =
      query.in(
        "company_id",
        allowedCompanyIds,
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

function asObject(
  value: unknown,
): JsonMap | null {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as JsonMap;
  }

  return null;
}

function isHidden(
  metadata: unknown,
) {
  const object =
    asObject(metadata);

  return (
    typeof object?.matelematics_hidden_at ===
    "string"
  );
}

function diagnosticArray(
  payload: unknown,
  key: "active" | "stored",
) {
  const can =
    asObject(payload);

  const diagnostics =
    asObject(
      can?.diagnostics,
    );

  const value =
    diagnostics?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const item =
        asObject(entry);

      if (
        !item ||
        typeof item.code !== "string"
      ) {
        return null;
      }

      return {
        code:
          item.code,

        source:
          typeof item.source === "string"
            ? item.source
            : null,

        status:
          typeof item.status === "string"
            ? item.status
            : key,
      };
    })
    .filter(
      (
        item,
      ): item is {
        code: string;
        source: string | null;
        status: string;
      } =>
        item !== null,
    );
}

function getProfile(
  payload: unknown,
) {
  const can =
    asObject(payload);

  const source =
    asObject(can?.source);

  return typeof source?.profile ===
    "string"
    ? source.profile
    : null;
}

function getCheckEngine(
  payload: unknown,
) {
  const can =
    asObject(payload);

  const warnings =
    asObject(can?.warnings);

  return typeof warnings?.checkEngine ===
    "boolean"
    ? warnings.checkEngine
    : null;
}

function getSimulatorFlag(
  payload: unknown,
) {
  const can =
    asObject(
      payload,
    );

  const source =
    asObject(
      can?.source,
    );

  return source?.simulator ===
    true;
}

function wait(
  ms: number,
) {
  return new Promise<void>(
    (
      resolve,
    ) => {
      setTimeout(
        resolve,
        ms,
      );
    },
  );
}


function diagnosticCodes(
  payload: unknown,
) {
  const active =
    diagnosticArray(
      payload,
      "active",
    );

  const stored =
    diagnosticArray(
      payload,
      "stored",
    );

  return {
    active,

    stored,

    all:
      Array.from(
        new Set(
          [
            ...active.map(
              (
                item,
              ) =>
                item.code,
            ),

            ...stored.map(
              (
                item,
              ) =>
                item.code,
            ),
          ],
        ),
      ),
  };
}


async function waitForCleanTelemetry(
  admin: ReturnType<typeof getAdmin>,
  input: {
    vehicleId: string;
    after: string;
    timeoutMs?: number;
  },
) {
  const timeoutMs =
    input.timeoutMs ??
    15_000;

  const deadline =
    Date.now() +
    timeoutMs;

  let lastSeen:
    {
      recordedAt: string;
      activeCodes: string[];
      storedCodes: string[];
      checkEngine: boolean | null;
    } |
    null =
      null;


  while (
    Date.now() <
    deadline
  ) {
    const {
      data,
      error,
    } =
      await admin
        .from("telemetry")
        .select(
          "recorded_at,can_payload",
        )
        .eq(
          "vehicle_id",
          input.vehicleId,
        )
        .gt(
          "recorded_at",
          input.after,
        )
        .order(
          "recorded_at",
          {
            ascending:
              false,
          },
        )
        .limit(1)
        .maybeSingle();


    if (
      error
    ) {
      throw error;
    }


    if (
      data
    ) {
      const diagnostics =
        diagnosticCodes(
          data.can_payload,
        );

      const checkEngine =
        getCheckEngine(
          data.can_payload,
        );


      lastSeen = {
        recordedAt:
          data.recorded_at,

        activeCodes:
          diagnostics.active.map(
            (
              item,
            ) =>
              item.code,
          ),

        storedCodes:
          diagnostics.stored.map(
            (
              item,
            ) =>
              item.code,
          ),

        checkEngine,
      };


      const clean =
        diagnostics.active.length ===
          0 &&
        diagnostics.stored.length ===
          0 &&
        checkEngine !==
          true;


      if (
        clean
      ) {
        return {
          verified:
            true as const,

          recordedAt:
            data.recorded_at,

          activeCodes:
            [] as string[],

          storedCodes:
            [] as string[],

          checkEngine,
        };
      }
    }


    await wait(
      750,
    );
  }


  return {
    verified:
      false as const,

    recordedAt:
      lastSeen?.recordedAt ??
      null,

    activeCodes:
      lastSeen?.activeCodes ??
      [],

    storedCodes:
      lastSeen?.storedCodes ??
      [],

    checkEngine:
      lastSeen?.checkEngine ??
      null,
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

    const vehicles =
      await getVisibleVehicles(
        admin,
        profile,
      );

    if (vehicles.length === 0) {
      return NextResponse.json({
        vehicles: [],
        events: [],
        metrics: {
          activeDtc: 0,
          activeCheckEngine: 0,
          storedDtc: 0,
          affectedVehicles: 0,
        },
      });
    }

    const vehicleIds =
      vehicles.map(
        (vehicle) => vehicle.id,
      );

    const companyIds =
      Array.from(
        new Set(
          vehicles.map(
            (vehicle) =>
              vehicle.company_id,
          ),
        ),
      );

    const [
      companiesResult,
      devicesResult,
      alertsResult,
      telemetryResult,
    ] =
      await Promise.all([
        admin
          .from("companies")
          .select("id,name")
          .in("id", companyIds),

        admin
          .from("devices")
          .select(
            "id,vehicle_id,imei,manufacturer,model,status,last_seen_at",
          )
          .in(
            "vehicle_id",
            vehicleIds,
          ),

        admin
          .from("alerts")
          .select(
            "id,vehicle_id,alert_type,severity,title,message,status,triggered_at,resolved_at,metadata",
          )
          .in(
            "vehicle_id",
            vehicleIds,
          )
          .order(
            "triggered_at",
            {
              ascending: false,
            },
          )
          .limit(1500),

        admin
          .from("telemetry")
          .select(
            "vehicle_id,recorded_at,can_payload",
          )
          .in(
            "vehicle_id",
            vehicleIds,
          )
          .order(
            "recorded_at",
            {
              ascending: false,
            },
          )
          .limit(1500),
      ]);

    if (companiesResult.error) {
      throw companiesResult.error;
    }

    if (devicesResult.error) {
      throw devicesResult.error;
    }

    if (alertsResult.error) {
      throw alertsResult.error;
    }

    if (telemetryResult.error) {
      throw telemetryResult.error;
    }

    const companyMap =
      new Map(
        (companiesResult.data ?? []).map(
          (company) => [
            company.id,
            company.name,
          ],
        ),
      );

    const deviceMap =
      new Map(
        (devicesResult.data ?? []).map(
          (device) => [
            device.vehicle_id,
            device,
          ],
        ),
      );

    const latestTelemetry =
      new Map<
        string,
        {
          recorded_at: string;
          can_payload: unknown;
        }
      >();

    for (
      const row of
      telemetryResult.data ?? []
    ) {
      if (
        !latestTelemetry.has(
          row.vehicle_id,
        )
      ) {
        latestTelemetry.set(
          row.vehicle_id,
          {
            recorded_at:
              row.recorded_at,

            can_payload:
              row.can_payload,
          },
        );
      }
    }

    const diagnosticAlerts =
      (
        alertsResult.data ??
        []
      ).filter(
        (alert) =>
          (
            alert.alert_type ===
              "check_engine" ||
            alert.alert_type.startsWith(
              "diagnostic_dtc_",
            )
          ) &&
          !isHidden(
            alert.metadata,
          ),
      );

    const recurrence =
      new Map<string, number>();

    for (
      const alert of
      diagnosticAlerts
    ) {
      const key =
        `${alert.vehicle_id}:${alert.alert_type}`;

      recurrence.set(
        key,
        (
          recurrence.get(key) ??
          0
        ) + 1,
      );
    }

    const vehicleMap =
      new Map(
        vehicles.map(
          (vehicle) => [
            vehicle.id,
            vehicle,
          ],
        ),
      );

    const events =
      diagnosticAlerts.map(
        (alert) => {
          const vehicle =
            vehicleMap.get(
              alert.vehicle_id,
            );

          const latest =
            latestTelemetry.get(
              alert.vehicle_id,
            );

          const isDtc =
            alert.alert_type.startsWith(
              "diagnostic_dtc_",
            );

          return {
            id:
              alert.id,

            vehicleId:
              alert.vehicle_id,

            vehicleName:
              vehicle?.name ??
              "Vehicle",

            registration:
              vehicle?.registration ??
              "-",

            companyName:
              vehicle
                ? companyMap.get(
                    vehicle.company_id,
                  ) ??
                  "Client"
                : "Client",

            kind:
              isDtc
                ? "dtc"
                : "check_engine",

            code:
              isDtc
                ? alert.alert_type.replace(
                    "diagnostic_dtc_",
                    "",
                  )
                : null,

            title:
              alert.title,

            message:
              alert.message,

            severity:
              alert.severity,

            status:
              alert.status,

            triggeredAt:
              alert.triggered_at,

            resolvedAt:
              alert.resolved_at,

            recurrenceCount:
              recurrence.get(
                `${alert.vehicle_id}:${alert.alert_type}`,
              ) ??
              1,

            profile:
              latest
                ? getProfile(
                    latest.can_payload,
                  )
                : null,
          };
        },
      );

    type DtcHistoryItem = {
      vehicleId: string;
      code: string;
      title: string | null;
      firstSeenAt: string;
      lastSeenAt: string;
      recurrenceCount: number;
      lastClearAt: string | null;
      returnedAfterClear: boolean;
      returnedAt: string | null;
      returnDelaySeconds: number | null;
      currentStatus: "active" | "resolved";
    };


    const dtcHistoryMap =
      new Map<
        string,
        {
          vehicleId: string;
          code: string;
          title: string | null;
          alerts: typeof diagnosticAlerts;
        }
      >();


    for (
      const alert of diagnosticAlerts
    ) {
      if (
        !alert.alert_type.startsWith(
          "diagnostic_dtc_",
        )
      ) {
        continue;
      }

      const code =
        alert.alert_type.replace(
          "diagnostic_dtc_",
          "",
        );

      const key =
        `${alert.vehicle_id}:${code}`;

      const current =
        dtcHistoryMap.get(
          key,
        );

      if (
        current
      ) {
        current.alerts.push(
          alert,
        );
      } else {
        dtcHistoryMap.set(
          key,
          {
            vehicleId:
              alert.vehicle_id,

            code,

            title:
              alert.title ??
              null,

            alerts: [
              alert,
            ],
          },
        );
      }
    }


    const dtcHistory: DtcHistoryItem[] =
      Array.from(
        dtcHistoryMap.values(),
      ).map(
        (
          group,
        ) => {
          const sorted =
            [...group.alerts].sort(
              (
                a,
                b,
              ) =>
                new Date(
                  a.triggered_at,
                ).getTime() -
                new Date(
                  b.triggered_at,
                ).getTime(),
            );

          const first =
            sorted[0];

          const last =
            sorted[
              sorted.length - 1
            ];

          let lastClearAt:
            string |
            null =
              null;

          for (
            const alert of sorted
          ) {
            const metadata =
              asObject(
                alert.metadata,
              );

            const dtcClear =
              asObject(
                metadata?.dtc_clear,
              );

            const verifiedAt =
              typeof dtcClear?.verified_at ===
                "string"
                ? dtcClear.verified_at
                : typeof dtcClear?.verification_recorded_at ===
                    "string"
                  ? dtcClear.verification_recorded_at
                  : null;

            if (
              verifiedAt &&
              (
                !lastClearAt ||
                new Date(
                  verifiedAt,
                ).getTime() >
                new Date(
                  lastClearAt,
                ).getTime()
              )
            ) {
              lastClearAt =
                verifiedAt;
            }
          }


          const returnedAlert =
            lastClearAt
              ? sorted.find(
                  (
                    alert,
                  ) =>
                    new Date(
                      alert.triggered_at,
                    ).getTime() >
                    new Date(
                      lastClearAt as string,
                    ).getTime(),
                )
              : undefined;


          const returnedAfterClear =
            Boolean(
              returnedAlert,
            );


          const returnDelaySeconds =
            returnedAlert &&
            lastClearAt
              ? Math.max(
                  0,
                  Math.round(
                    (
                      new Date(
                        returnedAlert.triggered_at,
                      ).getTime() -
                      new Date(
                        lastClearAt,
                      ).getTime()
                    ) /
                    1000,
                  ),
                )
              : null;


          const hasActive =
            sorted.some(
              (
                alert,
              ) =>
                alert.status ===
                "active",
            );


          return {
            vehicleId:
              group.vehicleId,

            code:
              group.code,

            title:
              group.title,

            firstSeenAt:
              first.triggered_at,

            lastSeenAt:
              last.triggered_at,

            recurrenceCount:
              sorted.length,

            lastClearAt,

            returnedAfterClear,

            returnedAt:
              returnedAlert?.triggered_at ??
              null,

            returnDelaySeconds,

            currentStatus:
              hasActive
                ? "active"
                : "resolved",
          };
        },
      );
    const vehicleStates =
      vehicles.map(
        (vehicle) => {
          const latest =
            latestTelemetry.get(
              vehicle.id,
            );

          const device =
            deviceMap.get(
              vehicle.id,
            );

          const profileName =
            latest
              ? getProfile(
                  latest.can_payload,
                )
              : null;

          const trackerModel =
            (
              device?.model ??
              ""
            ).toUpperCase();

          const supportedLightClearModels =
            [
              "FMC125",
              "FMM125",
              "FMB125",
            ];

          const simulatorFlag =
            latest
              ? getSimulatorFlag(
                  latest.can_payload,
                )
              : false;

          const j1939SimulatorImei =
            process.env
              .TELTONIKA_J1939_SIM_IMEI ??
            "356307042441650";

          const lightClearSupported =
            Boolean(
              device &&
              profileName !==
                "j1939_fms" &&
              supportedLightClearModels.includes(
                trackerModel,
              ),
            );

          /*
           * J1939 button is enabled ONLY on
           * our dedicated FMC650 simulator.
           */
          const j1939SimulatorClearSupported =
            Boolean(
              device &&
              trackerModel ===
                "FMC650" &&
              profileName ===
                "j1939_fms" &&
              simulatorFlag ===
                true &&
              device.imei ===
                j1939SimulatorImei,
            );

          /*
           * REAL FMC650 profile.
           *
           * Simulator is deliberately excluded.
           */
          const j1939RealProfile =
            device &&
            trackerModel ===
              "FMC650" &&
            profileName ===
              "j1939_fms" &&
            simulatorFlag ===
              false
              ? getJ1939RealClearProfile(
                  device.imei,
                )
              : null;


          /*
           * HARD LOCK V1 means a real profile
           * can NEVER enable the clear button yet.
           */
          const realJ1939ClearAllowed =
            j1939RealProfile
              ? canTransmitRealJ1939Clear(
                  j1939RealProfile,
                )
              : false;


          const clearSupported =
            lightClearSupported ||
            j1939SimulatorClearSupported ||
            realJ1939ClearAllowed;

          return {
            id:
              vehicle.id,

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

            device:
              device
                ? {
                    id:
                      device.id,

                    imei:
                      device.imei,

                    manufacturer:
                      device.manufacturer,

                    model:
                      device.model,

                    status:
                      device.status,

                    lastSeenAt:
                      device.last_seen_at,
                  }
                : null,

            telemetryAt:
              latest?.recorded_at ??
              null,

            profile:
              latest
                ? getProfile(
                    latest.can_payload,
                  )
                : null,

            checkEngine:
              latest
                ? getCheckEngine(
                    latest.can_payload,
                  )
                : null,

            activeDtc:
              latest
                ? diagnosticArray(
                    latest.can_payload,
                    "active",
                  )
                : [],

            storedDtc:
              latest
                ? diagnosticArray(
                    latest.can_payload,
                    "stored",
                  )
                : [],

            j1939RealProfile,

            clearCapability: {
              supported:
                clearSupported,

              reason:
                !device
                  ? "NO_TRACKER"
                  : j1939SimulatorClearSupported
                    ? "READY_J1939_SIMULATOR"
                    : j1939RealProfile
                      ? "J1939_REAL_HARD_LOCK_V1"
                      : profileName === "j1939_fms"
                        ? "J1939_CLEAR_PROFILE_NOT_VERIFIED"
                        : clearSupported
                          ? "READY"
                          : "TRACKER_CLEAR_NOT_SUPPORTED",
            },
          };
        },
      );

    const activeDtc =
      vehicleStates.reduce(
        (
          total,
          vehicle,
        ) =>
          total +
          vehicle.activeDtc.length,
        0,
      );

    const activeCheckEngine =
      vehicleStates.filter(
        (vehicle) =>
          vehicle.checkEngine === true,
      ).length;

    const storedDtc =
      vehicleStates.reduce(
        (
          total,
          vehicle,
        ) =>
          total +
          vehicle.storedDtc.length,
        0,
      );

    const affectedVehicles =
      new Set(
        events.map(
          (event) =>
            event.vehicleId,
        ),
      ).size;

    return NextResponse.json({
      vehicles:
        vehicleStates,

      events,

      dtcHistory,

      metrics: {
        activeDtc,
        activeCheckEngine,
        storedDtc,
        affectedVehicles,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "SERVER_ERROR";

    if (
      message ===
      "AUTH_REQUIRED"
    ) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
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
            "User profile unavailable.",
        },
        {
          status: 403,
        },
      );
    }

    console.error(
      "[Diagnostics GET]",
      error,
    );

    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
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


    const body =
      await request.json() as {
        action?: string;
        vehicleId?: string;
      };


    if (
      body.action !==
        "clear_dtc" ||
      !body.vehicleId
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action.",
        },
        {
          status: 400,
        },
      );
    }


    const vehicles =
      await getVisibleVehicles(
        admin,
        profile,
      );


    const vehicle =
      vehicles.find(
        (
          item,
        ) =>
          item.id ===
          body.vehicleId,
      );


    if (
      !vehicle
    ) {
      return NextResponse.json(
        {
          error:
            "Vehicle unavailable.",
        },
        {
          status: 404,
        },
      );
    }


    const {
      data: device,
      error: deviceError,
    } =
      await admin
        .from("devices")
        .select(
          "id,imei,model,status,vehicle_id",
        )
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .maybeSingle();


    if (
      deviceError
    ) {
      throw deviceError;
    }


    if (
      !device
    ) {
      return NextResponse.json(
        {
          error:
            "Aucun tracker affecte a ce vehicule.",
        },
        {
          status: 409,
        },
      );
    }


    /*
     * Snapshot diagnostic BEFORE clear.
     */
    const {
      data: beforeTelemetry,
      error: beforeTelemetryError,
    } =
      await admin
        .from("telemetry")
        .select(
          "recorded_at,can_payload",
        )
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .order(
          "recorded_at",
          {
            ascending:
              false,
          },
        )
        .limit(1)
        .maybeSingle();


    if (
      beforeTelemetryError
    ) {
      throw beforeTelemetryError;
    }


    if (
      !beforeTelemetry
    ) {
      return NextResponse.json(
        {
          error:
            "Aucune telemetrie disponible pour verifier le diagnostic.",
        },
        {
          status: 409,
        },
      );
    }


    const profileName =
      getProfile(
        beforeTelemetry.can_payload,
      );


    const simulatorFlag =
      getSimulatorFlag(
        beforeTelemetry.can_payload,
      );


    const trackerModel =
      (
        device.model ??
        ""
      ).toUpperCase();


    const beforeDiagnostics =
      diagnosticCodes(
        beforeTelemetry.can_payload,
      );


    const beforeCheckEngine =
      getCheckEngine(
        beforeTelemetry.can_payload,
      );


    if (
      beforeDiagnostics.all.length ===
        0 &&
      beforeCheckEngine !==
        true
    ) {
      return NextResponse.json(
        {
          error:
            "Aucun code defaut a effacer.",
        },
        {
          status: 409,
        },
      );
    }


    /*
     * Select clear strategy.
     */
    const lightModels =
      [
        "FMC125",
        "FMM125",
        "FMB125",
      ];


    const j1939SimulatorImei =
      process.env
        .TELTONIKA_J1939_SIM_IMEI ??
      "356307042441650";


    let command:
      string;

    let clearStrategy:
      string;

    let trackerSuccess:
      (
        response: string,
      ) => boolean;


    if (
      profileName ===
      "j1939_fms"
    ) {
      /*
       * Safety barrier:
       * J1939 clear V1 is simulator-only.
       *
       * Real FMC650 remains forbidden until
       * a verified Manual CAN profile exists.
       */
      const j1939SimulatorAllowed =
        trackerModel ===
          "FMC650" &&
        simulatorFlag ===
          true &&
        device.imei ===
          j1939SimulatorImei;


      if (
        !j1939SimulatorAllowed
      ) {
        const realProfile =
          getJ1939RealClearProfile(
            device.imei,
          );


        /*
         * ABSOLUTE REAL J1939 INTERLOCK.
         *
         * Safe Architecture V1 contains NO code path
         * capable of sending a real DM3/DM11 command.
         */
        if (
          !canTransmitRealJ1939Clear(
            realProfile,
          )
        ) {
          return NextResponse.json(
            {
              error:
                "Effacement J1939 reel verrouille par la securite HARD_LOCK_V1.",

              stage:
                "j1939_real_hard_lock",

              realProfile,
            },
            {
              status: 409,
            },
          );
        }


        /*
         * Unreachable in V1 by design.
         */
        return NextResponse.json(
          {
            error:
              "REAL_J1939_CLEAR_NOT_IMPLEMENTED",
          },
          {
            status: 409,
          },
        );
      }


      command =
        "matelematics_sim_j1939_dm11_dm3_clear";

      clearStrategy =
        "j1939_dm11_dm3_simulator";

      trackerSuccess =
        (
          response,
        ) =>
          response
            .toLowerCase()
            .startsWith(
              "j1939 simulator clear confirmed",
            );
    } else {
      if (
        !lightModels.includes(
          trackerModel,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "L'effacement DTC n'est pas active pour ce modele de tracker.",
          },
          {
            status: 409,
          },
        );
      }


      command =
        "lvcandtcclear";

      clearStrategy =
        "light_lvcandtcclear";

      trackerSuccess =
        (
          response,
        ) =>
          response
            .toLowerCase()
            .startsWith(
              "dtcs cleared",
            );
    }


    /*
     * Capture active diagnostic alerts before clear.
     */
    const {
      data: alertsBefore,
      error: alertsBeforeError,
    } =
      await admin
        .from("alerts")
        .select(
          "id,alert_type,metadata,status,triggered_at",
        )
        .eq(
          "vehicle_id",
          vehicle.id,
        )
        .eq(
          "status",
          "active",
        )
        .or(
          "alert_type.eq.check_engine,alert_type.like.diagnostic_dtc_%",
        );


    if (
      alertsBeforeError
    ) {
      throw alertsBeforeError;
    }


    const commandRequestedAt =
      new Date()
        .toISOString();


    /*
     * Send command through Teltonika control bridge.
     */
    const controller =
      new AbortController();


    const commandTimeout =
      setTimeout(
        () => {
          controller.abort();
        },
        15_000,
      );


    let controlResponse:
      Response;


    try {
      controlResponse =
        await fetch(
          process.env
            .TELTONIKA_CONTROL_URL ??
          "http://127.0.0.1:5001/command",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                imei:
                  device.imei,

                command,
              }),

            signal:
              controller.signal,
          },
        );
    } finally {
      clearTimeout(
        commandTimeout,
      );
    }


    const controlBody =
      await controlResponse
        .json() as {
          ok?: boolean;
          response?: string;
          error?: string;
        };


    if (
      !controlResponse.ok
    ) {
      return NextResponse.json(
        {
          stage:
            "command_failed",

          error:
            controlBody.error ??
            "Tracker command failed.",

          clearStrategy,
        },
        {
          status: 503,
        },
      );
    }


    const trackerResponse =
      controlBody.response ??
      "";


    if (
      !trackerSuccess(
        trackerResponse,
      )
    ) {
      return NextResponse.json(
        {
          stage:
            "tracker_rejected",

          error:
            trackerResponse ||
            "Le tracker n'a pas confirme l'effacement.",

          trackerResponse,

          clearStrategy,
        },
        {
          status: 409,
        },
      );
    }


    /*
     * V1.2 rule preserved:
     *
     * A tracker response is NOT enough.
     * Matelematics waits for new clean telemetry.
     */
    const trackerConfirmedAt =
      new Date()
        .toISOString();


    const verification =
      await waitForCleanTelemetry(
        admin,
        {
          vehicleId:
            vehicle.id,

          after:
            trackerConfirmedAt,

          timeoutMs:
            15_000,
        },
      );


    if (
      !verification.verified
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          stage:
            "verification_failed",

          clearStrategy,

          trackerResponse,

          commandRequestedAt,

          trackerConfirmedAt,

          verification: {
            verified:
              false,

            recordedAt:
              verification.recordedAt,

            activeCodes:
              verification.activeCodes,

            storedCodes:
              verification.storedCodes,

            checkEngine:
              verification.checkEngine,
          },

          error:
            verification.recordedAt
              ? "Le tracker a accepte la commande mais un defaut est toujours present dans la telemetrie."
              : "Le tracker a accepte la commande mais aucune telemetrie de verification n'a ete recue.",
        },
        {
          status: 409,
        },
      );
    }


    const verifiedAt =
      new Date()
        .toISOString();


    /*
     * Only after clean telemetry:
     * resolve Matelematics alerts.
     *
     * History remains preserved.
     */
    for (
      const alert of
      alertsBefore ??
      []
    ) {
      const metadata =
        asObject(
          alert.metadata,
        ) ??
        {};


      const {
        error: updateError,
      } =
        await admin
          .from("alerts")
          .update({
            status:
              "resolved",

            resolved_at:
              verification.recordedAt,

            metadata: {
              ...metadata,

              dtc_clear: {
                strategy:
                  clearStrategy,

                command,

                command_requested_at:
                  commandRequestedAt,

                tracker_confirmed_at:
                  trackerConfirmedAt,

                tracker_response:
                  trackerResponse,

                verification:
                  "telemetry_confirmed",

                verification_recorded_at:
                  verification.recordedAt,

                verified_at:
                  verifiedAt,

                previous_active_codes:
                  beforeDiagnostics.active.map(
                    (
                      item,
                    ) =>
                      item.code,
                  ),

                previous_stored_codes:
                  beforeDiagnostics.stored.map(
                    (
                      item,
                    ) =>
                      item.code,
                  ),

                previous_check_engine:
                  beforeCheckEngine,
              },
            },
          })
          .eq(
            "id",
            alert.id,
          );


      if (
        updateError
      ) {
        throw updateError;
      }
    }


    return NextResponse.json({
      ok:
        true,

      stage:
        "verified",

      clearStrategy,

      trackerResponse,

      commandRequestedAt,

      trackerConfirmedAt,

      verifiedAt,

      verification: {
        verified:
          true,

        recordedAt:
          verification.recordedAt,

        activeCodes:
          verification.activeCodes,

        storedCodes:
          verification.storedCodes,

        checkEngine:
          verification.checkEngine,
      },

      previousState: {
        activeCodes:
          beforeDiagnostics.active.map(
            (
              item,
            ) =>
              item.code,
          ),

        storedCodes:
          beforeDiagnostics.stored.map(
            (
              item,
            ) =>
              item.code,
          ),

        checkEngine:
          beforeCheckEngine,
      },

      resolvedAlerts:
        (
          alertsBefore ??
          []
        ).length,
    });
  } catch (error) {
    console.error(
      "[Diagnostics POST]",
      error,
    );


    return NextResponse.json(
      {
        stage:
          "server_error",

        error:
          error instanceof Error
            ? error.message
            : "SERVER_ERROR",
      },
      {
        status: 500,
      },
    );
  }
}