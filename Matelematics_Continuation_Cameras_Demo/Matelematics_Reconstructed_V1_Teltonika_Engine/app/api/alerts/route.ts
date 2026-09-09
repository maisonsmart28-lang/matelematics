import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  getAlertRule,
  normalizeAlertSeverity,
} from "../../../lib/alerts/alert-rules";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


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
  id:
    string;

  role:
    Role;

  company_id:
    string |
    null;

  partner_id:
    string |
    null;
};


type JsonMap =
  Record<
    string,
    unknown
  >;


const supabaseUrl =
  process.env
    .SUPABASE_URL ??
  process.env
    .NEXT_PUBLIC_SUPABASE_URL;


const secretKey =
  process.env
    .SUPABASE_SECRET_KEY;


function getAdmin() {
  if (
    !supabaseUrl ||
    !secretKey
  ) {
    throw new Error(
      "SUPABASE_CONFIG",
    );
  }


  return createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    },
  );
}


function asObject(
  value: unknown,
): JsonMap | null {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as JsonMap;
  }


  return null;
}


async function authenticate(
  request: NextRequest,
) {
  const authorization =
    request.headers.get(
      "authorization",
    );


  const token =
    authorization
      ?.startsWith(
        "Bearer ",
      )
      ? authorization.slice(
          7,
        )
      : null;


  if (
    !token
  ) {
    throw new Error(
      "AUTH_REQUIRED",
    );
  }


  const admin =
    getAdmin();


  const {
    data:
      userData,

    error:
      userError,
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
    data:
      profile,

    error:
      profileError,
  } =
    await admin
      .from(
        "profiles",
      )
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


async function getAllowedCompanyIds(
  admin:
    ReturnType<
      typeof getAdmin
    >,

  profile:
    Profile,
) {
  if (
    profile.role ===
      "client_admin" ||
    profile.role ===
      "user"
  ) {
    return profile.company_id
      ? [
          profile.company_id,
        ]
      : [];
  }


  if (
    profile.role ===
    "partner_admin"
  ) {
    if (
      !profile.partner_id
    ) {
      return [];
    }


    const {
      data,
      error,
    } =
      await admin
        .from(
          "companies",
        )
        .select(
          "id",
        )
        .eq(
          "partner_id",
          profile.partner_id,
        );


    if (
      error
    ) {
      throw error;
    }


    return (
      data ??
      []
    ).map(
      (
        row,
      ) =>
        row.id,
    );
  }


  return null;
}


async function getVisibleVehicles(
  admin:
    ReturnType<
      typeof getAdmin
    >,

  profile:
    Profile,
) {
  const companyIds =
    await getAllowedCompanyIds(
      admin,
      profile,
    );


  let query =
    admin
      .from(
        "vehicles",
      )
      .select(
        "id,company_id,name,registration",
      );


  if (
    companyIds !==
    null
  ) {
    if (
      companyIds.length ===
      0
    ) {
      return [];
    }


    query =
      query.in(
        "company_id",
        companyIds,
      );
  }


  const {
    data,
    error,
  } =
    await query;


  if (
    error
  ) {
    throw error;
  }


  return data ??
    [];
}


function isHidden(
  metadata: unknown,
) {
  const object =
    asObject(
      metadata,
    );


  return (
    typeof object
      ?.matelematics_hidden_at ===
      "string"
  );
}


function acknowledgement(
  metadata: unknown,
) {
  const object =
    asObject(
      metadata,
    );


  return {
    acknowledgedAt:
      typeof object
        ?.acknowledged_at ===
        "string"
        ? object.acknowledged_at
        : null,

    acknowledgedBy:
      typeof object
        ?.acknowledged_by ===
        "string"
        ? object.acknowledged_by
        : null,
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
      await authenticate(
        request,
      );


    const vehicles =
      await getVisibleVehicles(
        admin,
        profile,
      );


    if (
      vehicles.length ===
      0
    ) {
      return NextResponse.json({
        alerts:
          [],

        vehicles:
          [],

        metrics: {
          active:
            0,

          critical:
            0,

          acknowledged:
            0,

          resolved:
            0,
        },
      });
    }


    const vehicleIds =
      vehicles.map(
        (
          vehicle,
        ) =>
          vehicle.id,
      );


    const companyIds =
      Array.from(
        new Set(
          vehicles.map(
            (
              vehicle,
            ) =>
              vehicle.company_id,
          ),
        ),
      );


    const [
      alertsResult,
      companiesResult,
    ] =
      await Promise.all([
        admin
          .from(
            "alerts",
          )
          .select(
            "id,company_id,vehicle_id,alert_type,severity,title,message,status,triggered_at,resolved_at,metadata",
          )
          .in(
            "vehicle_id",
            vehicleIds,
          )
          .order(
            "triggered_at",
            {
              ascending:
                false,
            },
          )
          .limit(
            2500,
          ),

        admin
          .from(
            "companies",
          )
          .select(
            "id,name",
          )
          .in(
            "id",
            companyIds,
          ),
      ]);


    if (
      alertsResult.error
    ) {
      throw alertsResult.error;
    }


    if (
      companiesResult.error
    ) {
      throw companiesResult.error;
    }


    const vehicleMap =
      new Map(
        vehicles.map(
          (
            vehicle,
          ) => [
            vehicle.id,
            vehicle,
          ],
        ),
      );


    const companyMap =
      new Map(
        (
          companiesResult.data ??
          []
        ).map(
          (
            company,
          ) => [
            company.id,
            company.name,
          ],
        ),
      );


    const sourceAlerts =
      (
        alertsResult.data ??
        []
      ).filter(
        (
          alert,
        ) =>
          !isHidden(
            alert.metadata,
          ),
      );


    const historyMap =
      new Map<
        string,
        {
          count:
            number;

          firstSeenAt:
            string;

          lastSeenAt:
            string;
        }
      >();


    for (
      const alert of
      [...sourceAlerts]
        .reverse()
    ) {
      const key =
        `${alert.vehicle_id}:${alert.alert_type}`;


      const existing =
        historyMap.get(
          key,
        );


      if (
        existing
      ) {
        existing.count +=
          1;

        existing.lastSeenAt =
          alert.triggered_at;
      } else {
        historyMap.set(
          key,
          {
            count:
              1,

            firstSeenAt:
              alert.triggered_at,

            lastSeenAt:
              alert.triggered_at,
          },
        );
      }
    }


    const alerts =
      sourceAlerts.map(
        (
          alert,
        ) => {
          const vehicle =
            vehicleMap.get(
              alert.vehicle_id,
            );


          const rule =
            getAlertRule(
              alert.alert_type,
            );


          const ack =
            acknowledgement(
              alert.metadata,
            );


          const history =
            historyMap.get(
              `${alert.vehicle_id}:${alert.alert_type}`,
            );


          const normalizedSeverity =
            normalizeAlertSeverity(
              alert.severity,
            );


          const lifecycle =
            alert.status !==
              "active"
              ? "resolved"
              : ack.acknowledgedAt
                ? "acknowledged"
                : "active";


          return {
            id:
              alert.id,

            vehicleId:
              alert.vehicle_id,

            companyId:
              alert.company_id,

            vehicleName:
              vehicle?.name ??
              "Vehicule",

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

            alertType:
              alert.alert_type,

            label:
              alert.title ||
              rule.label,

            category:
              rule.category,

            ruleLabel:
              rule.label,

            message:
              alert.message ??
              rule.description,

            severity:
              normalizedSeverity,

            lifecycle,

            status:
              alert.status,

            triggeredAt:
              alert.triggered_at,

            resolvedAt:
              alert.resolved_at,

            acknowledgedAt:
              ack.acknowledgedAt,

            acknowledgedBy:
              ack.acknowledgedBy,

            recurrenceCount:
              history?.count ??
              1,

            firstSeenAt:
              history?.firstSeenAt ??
              alert.triggered_at,

            lastSeenAt:
              history?.lastSeenAt ??
              alert.triggered_at,

            diagnostic:
              alert.alert_type ===
                "check_engine" ||
              alert.alert_type.startsWith(
                "diagnostic_dtc_",
              ),

            metadata:
              alert.metadata,
          };
        },
      );


    const metrics = {
      active:
        alerts.filter(
          (
            alert,
          ) =>
            alert.lifecycle ===
            "active",
        ).length,

      critical:
        alerts.filter(
          (
            alert,
          ) =>
            alert.lifecycle !==
              "resolved" &&
            alert.severity ===
              "critical",
        ).length,

      acknowledged:
        alerts.filter(
          (
            alert,
          ) =>
            alert.lifecycle ===
            "acknowledged",
        ).length,

      resolved:
        alerts.filter(
          (
            alert,
          ) =>
            alert.lifecycle ===
            "resolved",
        ).length,
    };


    return NextResponse.json({
      alerts,

      vehicles:
        vehicles.map(
          (
            vehicle,
          ) => ({
            id:
              vehicle.id,

            name:
              vehicle.name,

            registration:
              vehicle.registration,
          }),
        ),

      metrics,
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
          status:
            401,
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
            "User profile unavailable.",
        },
        {
          status:
            403,
        },
      );
    }


    console.error(
      "[Alerts GET]",
      error,
    );


    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status:
          500,
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
        action?:
          string;

        alertId?:
          string;
      };


    const vehicles =
      await getVisibleVehicles(
        admin,
        profile,
      );


    const visibleVehicleIds =
      new Set(
        vehicles.map(
          (
            vehicle,
          ) =>
            vehicle.id,
        ),
      );


    if (
      body.action ===
        "acknowledge_all"
    ) {
      if (
        visibleVehicleIds.size ===
        0
      ) {
        return NextResponse.json({
          ok:
            true,

          updated:
            0,
        });
      }


      const {
        data:
          activeAlerts,

        error:
          activeError,
      } =
        await admin
          .from(
            "alerts",
          )
          .select(
            "id,vehicle_id,metadata,status",
          )
          .in(
            "vehicle_id",
            Array.from(
              visibleVehicleIds,
            ),
          )
          .eq(
            "status",
            "active",
          );


      if (
        activeError
      ) {
        throw activeError;
      }


      let updated =
        0;


      const acknowledgedAt =
        new Date()
          .toISOString();


      for (
        const alert of
        activeAlerts ??
        []
      ) {
        const metadata =
          asObject(
            alert.metadata,
          ) ??
          {};


        if (
          typeof metadata
            .acknowledged_at ===
          "string"
        ) {
          continue;
        }


        const {
          error:
            updateError,
        } =
          await admin
            .from(
              "alerts",
            )
            .update({
              metadata: {
                ...metadata,

                acknowledged_at:
                  acknowledgedAt,

                acknowledged_by:
                  profile.id,
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


        updated +=
          1;
      }


      return NextResponse.json({
        ok:
          true,

        updated,
      });
    }


    if (
      body.action !==
        "acknowledge" ||
      !body.alertId
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action.",
        },
        {
          status:
            400,
        },
      );
    }


    const {
      data:
        alert,

      error:
        alertError,
    } =
      await admin
        .from(
          "alerts",
        )
        .select(
          "id,vehicle_id,status,metadata",
        )
        .eq(
          "id",
          body.alertId,
        )
        .maybeSingle();


    if (
      alertError
    ) {
      throw alertError;
    }


    if (
      !alert ||
      !visibleVehicleIds.has(
        alert.vehicle_id,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Alert unavailable.",
        },
        {
          status:
            404,
        },
      );
    }


    if (
      alert.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Only active alerts can be acknowledged.",
        },
        {
          status:
            409,
        },
      );
    }


    const metadata =
      asObject(
        alert.metadata,
      ) ??
      {};


    const acknowledgedAt =
      new Date()
        .toISOString();


    const {
      error:
        updateError,
    } =
      await admin
        .from(
          "alerts",
        )
        .update({
          metadata: {
            ...metadata,

            acknowledged_at:
              acknowledgedAt,

            acknowledged_by:
              profile.id,
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


    return NextResponse.json({
      ok:
        true,

      alertId:
        alert.id,

      acknowledgedAt,
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
          status:
            401,
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
            "User profile unavailable.",
        },
        {
          status:
            403,
        },
      );
    }


    console.error(
      "[Alerts POST]",
      error,
    );


    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status:
          500,
      },
    );
  }
}
