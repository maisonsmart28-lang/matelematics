import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


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


type RuleKey =
  | "coolant_temperature_high"
  | "overspeed"
  | "battery_voltage_low_12v"
  | "battery_voltage_low_24v"
  | "low_fuel"
  | "engine_rpm_high"
  | "engine_load_high"
  | "adblue_low";


type AlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "info";


const ALERT_SEVERITIES:
  AlertSeverity[] = [
    "critical",
    "high",
    "medium",
    "info",
  ];


type RuleDefinition = {
  key: RuleKey;
  label: string;
  description: string;
  unit: string;
  platformValue: number;
  platformEnabled: boolean;
  platformSeverity: AlertSeverity;
  min: number;
  max: number;
  step: number;
};


type AlertSettingRow = {
  id?: string;
  rule_key: string;
  enabled: boolean;
  threshold_value:
    | number
    | string
    | null;

  severity:
    string |
    null;

  updated_at?:
    | string
    | null;
};


const RULES:
  RuleDefinition[] = [
    {
      key:
        "coolant_temperature_high",

      label:
        "Température moteur élevée",

      description:
        "Alerte lorsque la température moteur atteint ce seuil.",

      unit:
        "°C",

      platformValue:
        105,

      platformEnabled:
        true,

      platformSeverity:
        "critical",

      min:
        60,

      max:
        130,

      step:
        1,
    },

    {
      key:
        "overspeed",

      label:
        "Excès de vitesse",

      description:
        "Alerte lorsque le véhicule dépasse cette vitesse.",

      unit:
        "km/h",

      platformValue:
        120,

      platformEnabled:
        true,

      platformSeverity:
        "high",

      min:
        10,

      max:
        250,

      step:
        1,
    },

    {
      key:
        "battery_voltage_low_12v",

      label:
        "Batterie faible — 12 V",

      description:
        "Seuil de tension externe basse pour un système 12 V.",

      unit:
        "V",

      platformValue:
        11.8,

      platformEnabled:
        true,

      platformSeverity:
        "medium",

      min:
        5,

      max:
        18,

      step:
        0.1,
    },

    {
      key:
        "battery_voltage_low_24v",

      label:
        "Batterie faible — 24 V",

      description:
        "Seuil de tension externe basse pour un système 24 V.",

      unit:
        "V",

      platformValue:
        22,

      platformEnabled:
        true,

      platformSeverity:
        "medium",

      min:
        10,

      max:
        36,

      step:
        0.1,
    },

    {
      key:
        "low_fuel",

      label:
        "Carburant faible",

      description:
        "Alerte lorsque le niveau de carburant atteint ce pourcentage.",

      unit:
        "%",

      platformValue:
        15,

      platformEnabled:
        true,

      platformSeverity:
        "medium",

      min:
        1,

      max:
        100,

      step:
        1,
    },


    {
      key:
        "engine_rpm_high",

      label:
        "Regime moteur eleve",

      description:
        "Alerte lorsque le regime moteur atteint ce seuil.",

      unit:
        "tr/min",

      platformValue:
        4500,

      platformEnabled:
        false,

      platformSeverity:
        "high",

      min:
        500,

      max:
        10000,

      step:
        100,
    },


    {
      key:
        "engine_load_high",

      label:
        "Charge moteur elevee",

      description:
        "Alerte lorsque la charge moteur atteint ce pourcentage.",

      unit:
        "%",

      platformValue:
        95,

      platformEnabled:
        false,

      platformSeverity:
        "medium",

      min:
        1,

      max:
        100,

      step:
        1,
    },


    {
      key:
        "adblue_low",

      label:
        "AdBlue faible",

      description:
        "Alerte lorsque le niveau AdBlue atteint ce pourcentage.",

      unit:
        "%",

      platformValue:
        10,

      platformEnabled:
        false,

      platformSeverity:
        "high",

      min:
        1,

      max:
        100,

      step:
        1,
    },
  ];


const RULE_MAP =
  new Map<
    RuleKey,
    RuleDefinition
  >(
    RULES.map(
      (rule) => [
        rule.key,
        rule,
      ],
    ),
  );


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


async function authenticate(
  request:
    NextRequest,
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

  return {
    admin,

    profile:
      profile as Profile,
  };
}


function canManage(
  profile:
    Profile,
) {
  return (
    profile.role ===
      "matelematics_admin" ||
    profile.role ===
      "partner_admin" ||
    profile.role ===
      "client_admin"
  );
}


async function getAccessibleCompanies(
  admin:
    ReturnType<typeof getAdmin>,

  profile:
    Profile,
) {
  if (
    profile.role ===
      "client_admin" ||
    profile.role ===
      "user"
  ) {
    if (
      !profile.company_id
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
          "id,name",
        )
        .eq(
          "id",
          profile.company_id,
        );

    if (error) {
      throw error;
    }

    return data ?? [];
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
          "id,name",
        )
        .eq(
          "partner_id",
          profile.partner_id,
        )
        .order(
          "name",
        );

    if (error) {
      throw error;
    }

    return data ?? [];
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
        "id,name",
      )
      .order(
        "name",
      );

  if (error) {
    throw error;
  }

  return data ?? [];
}


function companyAccessible(
  companies:
    {
      id: string;
      name: string;
    }[],

  companyId:
    string,
) {
  return companies.some(
    (company) =>
      company.id ===
      companyId,
  );
}


async function getAccessibleVehicle(
  admin:
    ReturnType<typeof getAdmin>,

  profile:
    Profile,

  vehicleId:
    string,
) {
  const companies =
    await getAccessibleCompanies(
      admin,
      profile,
    );

  const {
    data:
      vehicle,

    error,
  } =
    await admin
      .from(
        "vehicles",
      )
      .select(
        "id,company_id,name,registration",
      )
      .eq(
        "id",
        vehicleId,
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    !vehicle ||
    !companyAccessible(
      companies,
      vehicle.company_id,
    )
  ) {
    throw new Error(
      "FORBIDDEN",
    );
  }

  return vehicle;
}


function thresholdFromRow(
  row:
    AlertSettingRow |
    undefined,
) {
  if (
    !row ||
    row.threshold_value ===
      null
  ) {
    return null;
  }

  const value =
    Number(
      row.threshold_value,
    );

  return Number.isFinite(
    value,
  )
    ? value
    : null;
}


async function readCompanyRows(
  admin:
    ReturnType<typeof getAdmin>,

  companyId:
    string,
) {
  const {
    data,
    error,
  } =
    await admin
      .from(
        "alert_settings",
      )
      .select(
        "id,rule_key,enabled,threshold_value,severity,updated_at",
      )
      .eq(
        "company_id",
        companyId,
      )
      .is(
        "vehicle_id",
        null,
      );

  if (error) {
    throw error;
  }

  return (
    data ??
    []
  ) as AlertSettingRow[];
}


async function readVehicleRows(
  admin:
    ReturnType<typeof getAdmin>,

  companyId:
    string,

  vehicleId:
    string,
) {
  const {
    data,
    error,
  } =
    await admin
      .from(
        "alert_settings",
      )
      .select(
        "id,rule_key,enabled,threshold_value,severity,updated_at",
      )
      .eq(
        "company_id",
        companyId,
      )
      .eq(
        "vehicle_id",
        vehicleId,
      );

  if (error) {
    throw error;
  }

  return (
    data ??
    []
  ) as AlertSettingRow[];
}


function severityFromRow(
  row:
    AlertSettingRow |
    undefined,
): AlertSeverity | null {

  if (
    !row ||
    !row.severity
  ) {
    return null;
  }

  if (
    row.severity === "critical" ||
    row.severity === "high" ||
    row.severity === "medium" ||
    row.severity === "info"
  ) {
    return row.severity;
  }

  return null;
}


function validateSeverity(
  key:
    RuleKey,

  raw:
    unknown,
): AlertSeverity {

  if (
    typeof raw !== "string" ||
    !ALERT_SEVERITIES.includes(
      raw as AlertSeverity,
    )
  ) {
    throw new Error(
      `INVALID_SEVERITY:${key}`,
    );
  }

  return raw as AlertSeverity;
}


function rowMap(
  rows:
    AlertSettingRow[],
) {
  return new Map<
    string,
    AlertSettingRow
  >(
    rows.map(
      (row) => [
        row.rule_key,
        row,
      ],
    ),
  );
}


function validateValue(
  key:
    RuleKey,

  rawValue:
    unknown,
) {
  const definition =
    RULE_MAP.get(
      key,
    );

  if (!definition) {
    throw new Error(
      `UNKNOWN_RULE:${key}`,
    );
  }

  const value =
    typeof rawValue ===
      "number"
      ? rawValue
      : Number(
          rawValue,
        );

  if (
    !Number.isFinite(
      value,
    ) ||
    value <
      definition.min ||
    value >
      definition.max
  ) {
    throw new Error(
      `INVALID_THRESHOLD:${key}`,
    );
  }

  return value;
}


async function writeSetting({
  admin,
  companyId,
  vehicleId,
  key,
  value,
  enabled,
  severity,
}: {
  admin:
    ReturnType<typeof getAdmin>;

  companyId:
    string;

  vehicleId:
    string |
    null;

  key:
    RuleKey;

  value:
    number;

  enabled:
    boolean;

  severity:
    AlertSeverity;
}) {
  const baseQuery =
    admin
      .from(
        "alert_settings",
      )
      .select(
        "id",
      )
      .eq(
        "company_id",
        companyId,
      )
      .eq(
        "rule_key",
        key,
      );

  const result =
    vehicleId ===
      null
      ? await baseQuery
          .is(
            "vehicle_id",
            null,
          )
          .limit(1)
          .maybeSingle()
      : await baseQuery
          .eq(
            "vehicle_id",
            vehicleId,
          )
          .limit(1)
          .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  if (result.data) {
    const {
      error,
    } =
      await admin
        .from(
          "alert_settings",
        )
        .update({
          enabled,

          threshold_value:
            value,

          severity,
        })
        .eq(
          "id",
          result.data.id,
        );

    if (error) {
      throw error;
    }

    return;
  }

  const {
    error,
  } =
    await admin
      .from(
        "alert_settings",
      )
      .insert({
        company_id:
          companyId,

        vehicle_id:
          vehicleId,

        rule_key:
          key,

        enabled,

        threshold_value:
          value,

        severity,
      });

  if (error) {
    throw error;
  }
}


async function deleteVehicleSetting({
  admin,
  companyId,
  vehicleId,
  key,
}: {
  admin:
    ReturnType<typeof getAdmin>;

  companyId:
    string;

  vehicleId:
    string;

  key:
    RuleKey;
}) {
  const {
    error,
  } =
    await admin
      .from(
        "alert_settings",
      )
      .delete()
      .eq(
        "company_id",
        companyId,
      )
      .eq(
        "vehicle_id",
        vehicleId,
      )
      .eq(
        "rule_key",
        key,
      );

  if (error) {
    throw error;
  }
}


function errorResponse(
  cause:
    unknown,
) {
  const message =
    cause instanceof Error
      ? cause.message
      : "UNKNOWN_ERROR";

  if (
    message ===
    "AUTH_REQUIRED"
  ) {
    return NextResponse.json(
      {
        error:
          "AUTH_REQUIRED",
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
          message,
      },
      {
        status:
          403,
      },
    );
  }

  if (
    message.startsWith(
      "UNKNOWN_RULE:",
    ) ||
    message.startsWith(
      "INVALID_THRESHOLD:",
    ) ||
    message.startsWith(
      "INVALID_SEVERITY:",
    )
  ) {
    return NextResponse.json(
      {
        error:
          message,
      },
      {
        status:
          400,
      },
    );
  }

  console.error(
    "[Alert Settings]",
    cause,
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


export async function GET(
  request:
    NextRequest,
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
      request.nextUrl
        .searchParams
        .get(
          "vehicleId",
        );


    /*
     * VEHICLE MODE
     */
    if (vehicleId) {
      const vehicle =
        await getAccessibleVehicle(
          admin,
          profile,
          vehicleId,
        );

      const [
        companyRows,
        vehicleRows,
      ] =
        await Promise.all([
          readCompanyRows(
            admin,
            vehicle.company_id,
          ),

          readVehicleRows(
            admin,
            vehicle.company_id,
            vehicle.id,
          ),
        ]);

      const companyMap =
        rowMap(
          companyRows,
        );

      const vehicleMap =
        rowMap(
          vehicleRows,
        );

      const settings =
        RULES.map(
          (rule) => {
            const companyRow =
              companyMap.get(
                rule.key,
              );

            const vehicleRow =
              vehicleMap.get(
                rule.key,
              );

            const companyThreshold =
              thresholdFromRow(
                companyRow,
              );

            const vehicleThreshold =
              thresholdFromRow(
                vehicleRow,
              );

            const inheritedValue =
              companyThreshold ??
              rule.platformValue;

            const inheritedThresholdSource =
              companyThreshold !==
                null
                ? "company"
                : "platform";

            const inheritedEnabled =
              companyRow
                ? companyRow.enabled
                : rule.platformEnabled;

            const inheritedEnabledSource =
              companyRow
                ? "company"
                : "platform";

            /*
             * Legacy aggregate source kept for
             * backward UI compatibility.
             */
            const inheritedSource =
              companyRow
                ? "company"
                : "platform";

            const companySeverity =
              severityFromRow(
                companyRow,
              );

            const inheritedSeverity =
              companySeverity ??
              rule.platformSeverity;

            const inheritedSeveritySource =
              companySeverity
                ? "company"
                : "platform";

            const vehicleSeverity =
              severityFromRow(
                vehicleRow,
              );

            const mode =
              vehicleRow
                ? "vehicle"
                : "inherit";

            const vehicleValue =
              vehicleThreshold;

            const vehicleEnabled =
              vehicleRow
                ? vehicleRow.enabled
                : null;

            const thresholdSource =
              vehicleRow &&
              vehicleThreshold !==
                null
                ? "vehicle"
                : inheritedThresholdSource;

            const enabledSource =
              vehicleRow
                ? "vehicle"
                : inheritedEnabledSource;

            const severitySource =
              vehicleRow &&
              vehicleSeverity
                ? "vehicle"
                : inheritedSeveritySource;

            return {
              ...rule,

              inheritedValue,

              inheritedEnabled,

              inheritedSource,

              inheritedSeverity,

              vehicleValue,

              vehicleEnabled,

              vehicleSeverity,

              mode,

              effectiveValue:
                vehicleRow
                  ? (
                      vehicleThreshold ??
                      inheritedValue
                    )
                  : inheritedValue,

              effectiveEnabled:
                vehicleRow
                  ? vehicleRow.enabled
                  : inheritedEnabled,

              effectiveSeverity:
                vehicleRow
                  ? (
                      vehicleSeverity ??
                      inheritedSeverity
                    )
                  : inheritedSeverity,

              thresholdSource,

              enabledSource,

              severitySource,
            };
          },
        );

      return NextResponse.json({
        mode:
          "vehicle",

        vehicle: {
          id:
            vehicle.id,

          companyId:
            vehicle.company_id,

          name:
            vehicle.name,

          registration:
            vehicle.registration,
        },

        settings,

        canManage:
          canManage(
            profile,
          ),
      });
    }


    /*
     * COMPANY MODE
     */
    const companies =
      await getAccessibleCompanies(
        admin,
        profile,
      );

    if (
      companies.length ===
      0
    ) {
      return NextResponse.json({
        companies:
          [],

        selectedCompanyId:
          null,

        settings:
          [],

        canManage:
          canManage(
            profile,
          ),
      });
    }

    const requestedCompanyId =
      request.nextUrl
        .searchParams
        .get(
          "companyId",
        );

    const selectedCompanyId =
      requestedCompanyId &&
      companyAccessible(
        companies,
        requestedCompanyId,
      )
        ? requestedCompanyId
        : companies[0].id;

    if (
      requestedCompanyId &&
      requestedCompanyId !==
        selectedCompanyId
    ) {
      throw new Error(
        "FORBIDDEN",
      );
    }

    const rows =
      await readCompanyRows(
        admin,
        selectedCompanyId,
      );

    const companyMap =
      rowMap(
        rows,
      );

    const settings =
      RULES.map(
        (rule) => {
          const row =
            companyMap.get(
              rule.key,
            );

          const value =
            thresholdFromRow(
              row,
            );

          return {
            ...rule,

            value:
              value ??
              rule.platformValue,

            enabled:
              row
                ? row.enabled
                : rule.platformEnabled,

            severity:
              severityFromRow(
                row,
              ) ??
              rule.platformSeverity,

            source:
              row
                ? "company"
                : "platform",

            enabledSource:
              row
                ? "company"
                : "platform",

            updatedAt:
              row?.updated_at ??
              null,
          };
        },
      );

    return NextResponse.json({
      companies,

      selectedCompanyId,

      settings,

      canManage:
        canManage(
          profile,
        ),
    });

  } catch (cause) {
    return errorResponse(
      cause,
    );
  }
}


export async function POST(
  request:
    NextRequest,
) {
  try {
    const {
      admin,
      profile,
    } =
      await authenticate(
        request,
      );

    if (
      !canManage(
        profile,
      )
    ) {
      throw new Error(
        "FORBIDDEN",
      );
    }

    const body =
      (
        await request.json()
      ) as {
        action?:
          unknown;

        companyId?:
          unknown;

        vehicleId?:
          unknown;

        settings?:
          unknown;
      };


    /*
     * VEHICLE SAVE
     */
    if (
      body.action ===
      "vehicle-save"
    ) {
      const vehicleId =
        typeof body.vehicleId ===
          "string"
          ? body.vehicleId
          : "";

      if (!vehicleId) {
        throw new Error(
          "FORBIDDEN",
        );
      }

      const vehicle =
        await getAccessibleVehicle(
          admin,
          profile,
          vehicleId,
        );

      if (
        !body.settings ||
        typeof body.settings !==
          "object" ||
        Array.isArray(
          body.settings,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "INVALID_SETTINGS",
          },
          {
            status:
              400,
          },
        );
      }

      const incoming =
        body.settings as
          Record<
            string,
            unknown
          >;

      const validated:
        {
          key:
            RuleKey;

          mode:
            "inherit" |
            "vehicle";

          value:
            number |
            null;

          enabled:
            boolean |
            null;

          severity:
            AlertSeverity |
            null;
        }[] = [];

      for (
        const rule of
        RULES
      ) {
        const raw =
          incoming[
            rule.key
          ];

        if (
          !raw ||
          typeof raw !==
            "object" ||
          Array.isArray(
            raw,
          )
        ) {
          return NextResponse.json(
            {
              error:
                `INVALID_SETTING:${rule.key}`,
            },
            {
              status:
                400,
            },
          );
        }

        const object =
          raw as
            Record<
              string,
              unknown
            >;

        if (
          object.mode ===
          "inherit"
        ) {
          validated.push({
            key:
              rule.key,

            mode:
              "inherit",

            value:
              null,

            enabled:
              null,

            severity:
              null,
          });

          continue;
        }

        if (
          object.mode !==
          "vehicle"
        ) {
          return NextResponse.json(
            {
              error:
                `INVALID_MODE:${rule.key}`,
            },
            {
              status:
                400,
            },
          );
        }

        if (
          typeof object.enabled !==
          "boolean"
        ) {
          return NextResponse.json(
            {
              error:
                `INVALID_ENABLED:${rule.key}`,
            },
            {
              status:
                400,
            },
          );
        }

        const value =
          validateValue(
            rule.key,
            object.value,
          );

        const severity =
          validateSeverity(
            rule.key,
            object.severity,
          );

        validated.push({
          key:
            rule.key,

          mode:
            "vehicle",

          value,

          enabled:
            object.enabled,

          severity,
        });
      }


      for (
        const item of
        validated
      ) {
        if (
          item.mode ===
          "inherit"
        ) {
          await deleteVehicleSetting({
            admin,

            companyId:
              vehicle.company_id,

            vehicleId:
              vehicle.id,

            key:
              item.key,
          });

          continue;
        }

        await writeSetting({
          admin,

          companyId:
            vehicle.company_id,

          vehicleId:
            vehicle.id,

          key:
            item.key,

          value:
            item.value!,

          enabled:
            item.enabled!,

          severity:
            item.severity!,
        });
      }

      return NextResponse.json({
        ok:
          true,

        vehicleId:
          vehicle.id,
      });
    }


    /*
     * COMPANY MODE
     */
    const companies =
      await getAccessibleCompanies(
        admin,
        profile,
      );

    const companyId =
      typeof body.companyId ===
        "string"
        ? body.companyId
        : "";

    if (
      !companyId ||
      !companyAccessible(
        companies,
        companyId,
      )
    ) {
      throw new Error(
        "FORBIDDEN",
      );
    }


    if (
      body.action ===
      "reset"
    ) {
      const {
        error,
      } =
        await admin
          .from(
            "alert_settings",
          )
          .delete()
          .eq(
            "company_id",
            companyId,
          )
          .is(
            "vehicle_id",
            null,
          )
          .in(
            "rule_key",
            RULES.map(
              (rule) =>
                rule.key,
            ),
          );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        ok:
          true,

        reset:
          true,
      });
    }


    if (
      !body.settings ||
      typeof body.settings !==
        "object" ||
      Array.isArray(
        body.settings,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "INVALID_SETTINGS",
        },
        {
          status:
            400,
        },
      );
    }

    const incoming =
      body.settings as
        Record<
          string,
          unknown
        >;

    const validated:
      {
        key:
          RuleKey;

        value:
          number;

        enabled:
          boolean;

        severity:
          AlertSeverity;
      }[] = [];

    for (
      const rule of
      RULES
    ) {
      const raw =
        incoming[
          rule.key
        ];

      /*
       * Temporary backward compatibility:
       * numeric value = enabled true.
       */
      if (
        typeof raw ===
        "number"
      ) {
        validated.push({
          key:
            rule.key,

          value:
            validateValue(
              rule.key,
              raw,
            ),

          enabled:
            true,

          severity:
            rule.platformSeverity,
        });

        continue;
      }

      if (
        !raw ||
        typeof raw !==
          "object" ||
        Array.isArray(
          raw,
        )
      ) {
        return NextResponse.json(
          {
            error:
              `INVALID_SETTING:${rule.key}`,
          },
          {
            status:
              400,
          },
        );
      }

      const object =
        raw as
          Record<
            string,
            unknown
          >;

      if (
        typeof object.enabled !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              `INVALID_ENABLED:${rule.key}`,
          },
          {
            status:
              400,
          },
        );
      }

      validated.push({
        key:
          rule.key,

        value:
          validateValue(
            rule.key,
            object.value,
          ),

        enabled:
          object.enabled,

        severity:
          validateSeverity(
            rule.key,
            object.severity,
          ),
      });
    }


    for (
      const item of
      validated
    ) {
      await writeSetting({
        admin,

        companyId,

        vehicleId:
          null,

        key:
          item.key,

        value:
          item.value,

        enabled:
          item.enabled,

        severity:
          item.severity,
      });
    }

    return NextResponse.json({
      ok:
        true,
    });

  } catch (cause) {
    return errorResponse(
      cause,
    );
  }
}