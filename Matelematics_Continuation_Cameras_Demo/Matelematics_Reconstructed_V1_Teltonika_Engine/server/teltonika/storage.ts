import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { registerDevice } from "./registry";
import type { NormalizedTelemetry } from "./types";

import {
  normalizeCanV2,
} from "./can/normalizer";

import {
  buildAlertCandidates,
  DEFAULT_ALERT_ENGINE_CONFIG,
  type AlertEngineConfig,
  type AlertSeverity,
  type CanAlertCandidate,
} from "./can/alert-engine";

import type {
  NormalizedCanV2,
} from "./can/types-v2";

type DeviceRow = {
  id: string;
  company_id: string;
  vehicle_id: string | null;
  imei: string;
  model: string | null;
  status: string;
};
type AlertSettingRow = {
  company_id:
    string;

  vehicle_id:
    string |
    null;

  rule_key:
    string;

  enabled:
    boolean;

  threshold_value:
    number |
    null;

  threshold_secondary:
    number |
    null;

  severity:
    string |
    null;
};


type AlertConfigSource =
  | "platform"
  | "company"
  | "vehicle";


type ConfigurableAlertRuleKey =
  | "coolant_temperature_high"
  | "overspeed"
  | "battery_voltage_low_12v"
  | "battery_voltage_low_24v"
  | "low_fuel"
  | "engine_rpm_high"
  | "engine_load_high"
  | "adblue_low";


type AlertRuleSourceState = {
  enabled:
    AlertConfigSource;

  threshold:
    AlertConfigSource;

  severity:
    AlertConfigSource;
};


type AlertConfigSources =
  Record<
    ConfigurableAlertRuleKey,
    AlertRuleSourceState
  >;


type ResolvedAlertEngineConfig = {
  config:
    AlertEngineConfig;

  sources:
    AlertConfigSources;
};


const ALERT_ENGINE_VERSION =
  "1.3A";

const CONFIG_RESOLUTION_VERSION =
  "1.3A";

const ALERT_METADATA_VERSION =
  "1.3A";


function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `[Teltonika] Missing required environment variable: ${name}`,
    );
  }

  return value;
}

const SUPABASE_FETCH_MAX_ATTEMPTS = 4;

const SUPABASE_FETCH_TIMEOUT_MS =
  12_000;


function sleep(
  milliseconds: number,
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}


function retryableHttpStatus(
  status: number,
) {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}


const resilientSupabaseFetch:
  typeof fetch =
  async (
    input,
    init,
  ) => {
    let lastError:
      unknown = null;

    for (
      let attempt = 1;
      attempt <=
      SUPABASE_FETCH_MAX_ATTEMPTS;
      attempt += 1
    ) {
      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => {
            controller.abort();
          },
          SUPABASE_FETCH_TIMEOUT_MS,
        );

      let abortListener:
        (() => void) |
        null = null;

      try {
        /*
         * Respect an existing AbortSignal
         * if Supabase supplies one.
         */
        if (init?.signal) {
          if (
            init.signal.aborted
          ) {
            controller.abort();
          } else {
            abortListener =
              () => {
                controller.abort();
              };

            init.signal.addEventListener(
              "abort",
              abortListener,
              {
                once: true,
              },
            );
          }
        }

        const response =
          await fetch(
            input,
            {
              ...init,
              signal:
                controller.signal,
            },
          );

        clearTimeout(
          timeout,
        );

        if (
          abortListener &&
          init?.signal
        ) {
          init.signal.removeEventListener(
            "abort",
            abortListener,
          );
        }

        if (
          !retryableHttpStatus(
            response.status,
          )
        ) {
          if (attempt > 1) {
            console.log(
              `[Teltonika] Supabase recovered on attempt ${attempt}/${SUPABASE_FETCH_MAX_ATTEMPTS}`,
            );
          }

          return response;
        }

        lastError =
          new Error(
            `Supabase HTTP ${response.status}`,
          );

        console.warn(
          `[Teltonika] Supabase HTTP ${response.status} - retry ${attempt}/${SUPABASE_FETCH_MAX_ATTEMPTS}`,
        );
      } catch (error) {
        clearTimeout(
          timeout,
        );

        if (
          abortListener &&
          init?.signal
        ) {
          init.signal.removeEventListener(
            "abort",
            abortListener,
          );
        }

        lastError =
          error;

        console.warn(
          `[Teltonika] Supabase network failure - retry ${attempt}/${SUPABASE_FETCH_MAX_ATTEMPTS}: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
      }

      if (
        attempt <
        SUPABASE_FETCH_MAX_ATTEMPTS
      ) {
        const delay =
          500 *
          2 **
          (
            attempt - 1
          );

        await sleep(
          delay,
        );
      }
    }

    throw new Error(
      `Supabase unavailable after ${SUPABASE_FETCH_MAX_ATTEMPTS} attempts: ${
        lastError instanceof Error
          ? lastError.message
          : String(lastError)
      }`,
    );
  };


let supabaseClient: SupabaseClient | null =
  null;

function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl =
    requiredEnv("SUPABASE_URL");

  const supabaseSecretKey =
    requiredEnv("SUPABASE_SECRET_KEY");

  supabaseClient =
    createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },

        global: {
          fetch:
            resilientSupabaseFetch,
        },
      },
    );

  return supabaseClient;
}

export async function loadDevicesFromSupabase() {
  const { data, error } = await getSupabase()
    .from("devices")
    .select(
      "id,company_id,vehicle_id,imei,model,status",
    );

  if (error) {
    throw new Error(
      `[Teltonika] Unable to load devices from Supabase: ${error.message}`,
    );
  }

  const devices = (data ?? []) as DeviceRow[];

  let registered = 0;

  for (const device of devices) {
    if (!device.vehicle_id) {
      console.warn(
        `[Teltonika] Device ${device.imei} has no vehicle_id; skipped`,
      );

      continue;
    }

    registerDevice({
      imei: device.imei,
      clientId: device.company_id,
      vehicleId: device.vehicle_id,
      label: device.model ?? device.imei,
    });

    registered += 1;
  }

  console.log(
    `[Teltonika] Loaded ${registered} device(s) from Supabase`,
  );

  return devices;
}

function readNumericIo(
  telemetry: NormalizedTelemetry,
  key: string,
) {
  const value = telemetry.io[key];

  return typeof value === "number"
    ? value
    : null;
}

function getIgnition(
  telemetry: NormalizedTelemetry,
) {
  const value =
    readNumericIo(
      telemetry,
      "io_239",
    );

  if (value === null) {
    return null;
  }

  return value === 1;
}

function getBatteryVoltage(
  telemetry: NormalizedTelemetry,
) {
  const value =
    readNumericIo(
      telemetry,
      "io_66",
    );

  if (value === null) {
    return null;
  }

  return value / 1000;
}


/* ============================================================
   CAN / IO NORMALIZATION
   ============================================================ */

function buildCanPayload(
  telemetry: NormalizedTelemetry,
) {
  const rpm =
    readNumericIo(
      telemetry,
      "io_207",
    );

  const canSpeed =
    readNumericIo(
      telemetry,
      "io_206",
    );

  const fuelLevel =
    readNumericIo(
      telemetry,
      "io_203",
    );

  const fuelUsedMl =
    readNumericIo(
      telemetry,
      "io_208",
    );

  const coolantTemperature =
    readNumericIo(
      telemetry,
      "io_204",
    );

  const throttlePosition =
    readNumericIo(
      telemetry,
      "io_205",
    );

  const odometerMetres =
    readNumericIo(
      telemetry,
      "io_209",
    );

  return {
    rpm,

    speed_kph:
      canSpeed,

    fuel_level_percent:
      fuelLevel,

    fuel_used_litres:
      fuelUsedMl === null
        ? null
        : fuelUsedMl / 1000,

    coolant_temperature_c:
      coolantTemperature,

    throttle_percent:
      throttlePosition,

    odometer_km:
      odometerMetres === null
        ? null
        : odometerMetres / 1000,

    simulator: true,
  };
}

function buildIoMetadata(
  telemetry: NormalizedTelemetry,
) {
  const movement =
    readNumericIo(
      telemetry,
      "io_240",
    );

  const internalBatteryMv =
    readNumericIo(
      telemetry,
      "io_67",
    );

  const odometerMetres =
    readNumericIo(
      telemetry,
      "io_16",
    );

  return {
    movement:
      movement === null
        ? null
        : movement === 1,

    external_voltage:
      getBatteryVoltage(
        telemetry,
      ),

    internal_battery_voltage:
      internalBatteryMv === null
        ? null
        : internalBatteryMv / 1000,

    odometer_km:
      odometerMetres === null
        ? null
        : odometerMetres / 1000,
  };
}



function cloneDefaultAlertEngineConfig():
  AlertEngineConfig {
  return {
    coolantHighC:
      DEFAULT_ALERT_ENGINE_CONFIG.coolantHighC,

    coolantTemperatureHighEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.coolantTemperatureHighEnabled,

    coolantTemperatureHighSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.coolantTemperatureHighSeverity,

    overspeedKph:
      DEFAULT_ALERT_ENGINE_CONFIG.overspeedKph,

    overspeedEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.overspeedEnabled,

    overspeedSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.overspeedSeverity,

    lowVoltage12V:
      DEFAULT_ALERT_ENGINE_CONFIG.lowVoltage12V,

    batteryVoltageLow12VEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.batteryVoltageLow12VEnabled,

    batteryVoltageLow12VSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.batteryVoltageLow12VSeverity,

    lowVoltage24V:
      DEFAULT_ALERT_ENGINE_CONFIG.lowVoltage24V,

    batteryVoltageLow24VEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.batteryVoltageLow24VEnabled,

    batteryVoltageLow24VSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.batteryVoltageLow24VSeverity,

    lowFuelPercent:
      DEFAULT_ALERT_ENGINE_CONFIG.lowFuelPercent,

    lowFuelEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.lowFuelEnabled,

    lowFuelSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.lowFuelSeverity,

    engineRpmHigh:
      DEFAULT_ALERT_ENGINE_CONFIG.engineRpmHigh,

    engineRpmHighEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.engineRpmHighEnabled,

    engineRpmHighSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.engineRpmHighSeverity,

    engineLoadHighPercent:
      DEFAULT_ALERT_ENGINE_CONFIG.engineLoadHighPercent,

    engineLoadHighEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.engineLoadHighEnabled,

    engineLoadHighSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.engineLoadHighSeverity,

    adBlueLowPercent:
      DEFAULT_ALERT_ENGINE_CONFIG.adBlueLowPercent,

    adBlueLowEnabled:
      DEFAULT_ALERT_ENGINE_CONFIG.adBlueLowEnabled,

    adBlueLowSeverity:
      DEFAULT_ALERT_ENGINE_CONFIG.adBlueLowSeverity,
  };
}


function canonicalAlertSeverity(
  value:
    string |
    null,
): AlertSeverity | null {

  if (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "info"
  ) {
    return value;
  }

  return null;
}


function platformSourceState():
  AlertRuleSourceState {

  return {
    enabled:
      "platform",

    threshold:
      "platform",

    severity:
      "platform",
  };
}


function cloneDefaultAlertConfigSources():
  AlertConfigSources {

  return {
    coolant_temperature_high:
      platformSourceState(),

    overspeed:
      platformSourceState(),

    battery_voltage_low_12v:
      platformSourceState(),

    battery_voltage_low_24v:
      platformSourceState(),

    low_fuel:
      platformSourceState(),

    engine_rpm_high:
      platformSourceState(),

    engine_load_high:
      platformSourceState(),

    adblue_low:
      platformSourceState(),
  };
}


async function resolveAlertEngineConfig({
  companyId,
  vehicleId,
}: {
  companyId:
    string;

  vehicleId:
    string;
}): Promise<ResolvedAlertEngineConfig> {
  const config =
    cloneDefaultAlertEngineConfig();

  const sources =
    cloneDefaultAlertConfigSources();


  const {
    data,
    error,
  } =
    await getSupabase()
      .from(
        "alert_settings",
      )
      .select(
        "company_id,vehicle_id,rule_key,enabled,threshold_value,threshold_secondary,severity",
      )
      .eq(
        "company_id",
        companyId,
      )
      .or(
        `vehicle_id.is.null,vehicle_id.eq.${vehicleId}`,
      );


  if (
    error
  ) {
    const message =
      error.message
        .toLowerCase();


    /*
     * Safe compatibility fallback:
     *
     * Before the V1.2A migration is applied, Supabase will
     * report that alert_settings does not exist.
     *
     * In that situation the engine keeps using the exact
     * V1.1 platform defaults.
     */
    if (
      message.includes(
        "alert_settings",
      ) ||
      message.includes(
        "does not exist",
      ) ||
      message.includes(
        "could not find the table",
      ) ||
      message.includes(
        "relation",
      )
    ) {
      return {
        config,
        sources,
      };
    }


    throw new Error(
      `[Teltonika] Alert settings lookup failed: ${error.message}`,
    );
  }


  const rows =
    (
      data ??
      []
    ) as AlertSettingRow[];


  /*
   * Company rules are applied first.
   * Vehicle rules are applied afterwards and therefore win.
   */
  const companyRows =
    rows.filter(
      (
        row,
      ) =>
        row.vehicle_id ===
        null,
    );


  const vehicleRows =
    rows.filter(
      (
        row,
      ) =>
        row.vehicle_id ===
        vehicleId,
    );


  function applySettingRow(
    row:
      AlertSettingRow,

    source:
      Exclude<
        AlertConfigSource,
        "platform"
      >,
  ) {
    const numericValue =
      row.threshold_value ===
        null
        ? null
        : Number(
            row.threshold_value,
          );

    const hasNumericValue =
      numericValue !==
        null &&
      Number.isFinite(
        numericValue,
      );

    const severity =
      canonicalAlertSeverity(
        row.severity,
      );


    /*
     * V1.2C:
     *
     * A row is an explicit override.
     *
     * enabled=false is therefore NOT equivalent to
     * an absent row.
     *
     * Company rows are applied first.
     * Vehicle rows are applied afterwards and win.
     */
    switch (
      row.rule_key
    ) {

      case "coolant_temperature_high":
        config.coolantTemperatureHighEnabled =
          row.enabled;

        sources.coolant_temperature_high.enabled =
          source;

        if (severity) {
          config.coolantTemperatureHighSeverity =
            severity;

          sources.coolant_temperature_high.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.coolantHighC =
            numericValue!;

          sources.coolant_temperature_high.threshold =
            source;
        }

        break;


      case "overspeed":
        config.overspeedEnabled =
          row.enabled;

        sources.overspeed.enabled =
          source;

        if (severity) {
          config.overspeedSeverity =
            severity;

          sources.overspeed.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.overspeedKph =
            numericValue!;

          sources.overspeed.threshold =
            source;
        }

        break;


      case "battery_voltage_low_12v":
        config.batteryVoltageLow12VEnabled =
          row.enabled;

        sources.battery_voltage_low_12v.enabled =
          source;

        if (severity) {
          config.batteryVoltageLow12VSeverity =
            severity;

          sources.battery_voltage_low_12v.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.lowVoltage12V =
            numericValue!;

          sources.battery_voltage_low_12v.threshold =
            source;
        }

        break;


      case "battery_voltage_low_24v":
        config.batteryVoltageLow24VEnabled =
          row.enabled;

        sources.battery_voltage_low_24v.enabled =
          source;

        if (severity) {
          config.batteryVoltageLow24VSeverity =
            severity;

          sources.battery_voltage_low_24v.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.lowVoltage24V =
            numericValue!;

          sources.battery_voltage_low_24v.threshold =
            source;
        }

        break;


      case "low_fuel":
        config.lowFuelEnabled =
          row.enabled;

        sources.low_fuel.enabled =
          source;

        if (severity) {
          config.lowFuelSeverity =
            severity;

          sources.low_fuel.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.lowFuelPercent =
            numericValue!;

          sources.low_fuel.threshold =
            source;
        }

        break;


      case "engine_rpm_high":
        config.engineRpmHighEnabled =
          row.enabled;

        sources.engine_rpm_high.enabled =
          source;

        if (severity) {
          config.engineRpmHighSeverity =
            severity;

          sources.engine_rpm_high.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.engineRpmHigh =
            numericValue!;

          sources.engine_rpm_high.threshold =
            source;
        }

        break;


      case "engine_load_high":
        config.engineLoadHighEnabled =
          row.enabled;

        sources.engine_load_high.enabled =
          source;

        if (severity) {
          config.engineLoadHighSeverity =
            severity;

          sources.engine_load_high.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.engineLoadHighPercent =
            numericValue!;

          sources.engine_load_high.threshold =
            source;
        }

        break;


      case "adblue_low":
        config.adBlueLowEnabled =
          row.enabled;

        sources.adblue_low.enabled =
          source;

        if (severity) {
          config.adBlueLowSeverity =
            severity;

          sources.adblue_low.severity =
            source;
        }

        if (
          hasNumericValue
        ) {
          config.adBlueLowPercent =
            numericValue!;

          sources.adblue_low.threshold =
            source;
        }

        break;
    }
  }


  for (
    const row of
    companyRows
  ) {
    applySettingRow(
      row,
      "company",
    );
  }


  for (
    const row of
    vehicleRows
  ) {
    applySettingRow(
      row,
      "vehicle",
    );
  }


  return {
    config,
    sources,
  };
}


function candidateSourceState(
  candidate:
    CanAlertCandidate,

  sources:
    AlertConfigSources,
): AlertRuleSourceState | null {

  switch (
    candidate.alertType
  ) {

    case "coolant_temperature_high":
      return sources.coolant_temperature_high;

    case "overspeed":
      return sources.overspeed;

    case "low_fuel":
      return sources.low_fuel;

    case "engine_rpm_high":
      return sources.engine_rpm_high;

    case "engine_load_high":
      return sources.engine_load_high;

    case "adblue_low":
      return sources.adblue_low;

    case "battery_voltage_low": {

      const electricalSystem =
        candidate.metadata
          .electrical_system;

      if (
        electricalSystem === "24v"
      ) {
        return sources.battery_voltage_low_24v;
      }

      if (
        electricalSystem === "12v"
      ) {
        return sources.battery_voltage_low_12v;
      }

      return null;
    }

    default:
      return null;
  }
}


async function syncCanAlerts({
  companyId,
  vehicleId,
  deviceId,
  recordedAt,
  telemetry,
  canPayload,
}: {
  companyId: string;
  vehicleId: string;
  deviceId: string;
  recordedAt: string;
  telemetry: NormalizedTelemetry;
  canPayload: NormalizedCanV2;
}) {
  const alertResolution =
    await resolveAlertEngineConfig({
      companyId,
      vehicleId,
    });


  const candidates =
    buildAlertCandidates(
      canPayload,
      alertResolution.config,
    );

  /*
   * All alert types that are active in THIS telemetry record.
   *
   * This is especially important for DTC lifecycle:
   *
   * P0069 appears
   *   -> diagnostic_dtc_P0069 ACTIVE
   *
   * P0069 disappears
   *   -> diagnostic_dtc_P0069 RESOLVED
   */

  const currentlyActiveTypes =
    new Set(
      candidates
        .filter(
          (candidate) =>
            candidate.active,
        )
        .map(
          (candidate) =>
            candidate.alertType,
        ),
    );


  /*
   * ---------------------------------------------------------
   * NORMAL CANDIDATE SYNC
   * ---------------------------------------------------------
   */

  for (
    const candidate of
    candidates
  ) {

    const configSources =
      candidateSourceState(
        candidate,
        alertResolution.sources,
      );

    const {
      data: existing,
      error: findError,
    } =
      await getSupabase()
        .from("alerts")
        .select(
          "id,alert_type",
        )
        .eq(
          "company_id",
          companyId,
        )
        .eq(
          "vehicle_id",
          vehicleId,
        )
        .eq(
          "alert_type",
          candidate.alertType,
        )
        .eq(
          "status",
          "active",
        )
        .limit(1)
        .maybeSingle();

    if (findError) {
      throw new Error(
        `[Teltonika] Alert lookup failed: ${findError.message}`,
      );
    }


    /*
     * CREATE
     */

    if (
      candidate.active &&
      !existing
    ) {
      const {
        error: insertError,
      } =
        await getSupabase()
          .from("alerts")
          .insert({
            company_id:
              companyId,

            vehicle_id:
              vehicleId,

            device_id:
              deviceId,

            alert_type:
              candidate.alertType,

            severity:
              candidate.severity,

            title:
              candidate.title,

            message:
              candidate.message,

            latitude:
              telemetry.latitude,

            longitude:
              telemetry.longitude,

            triggered_at:
              recordedAt,

            status:
              "active",

            metadata: {
              ...candidate.metadata,

              source:
                "teltonika_can_v2",

              can_profile:
                canPayload.source.profile,

              can_mapping_version:
                canPayload.source.mappingVersion,

              alert_engine_version:
                ALERT_ENGINE_VERSION,

              config_resolution_version:
                CONFIG_RESOLUTION_VERSION,

              metadata_version:
                ALERT_METADATA_VERSION,

              threshold_source:
                configSources
                  ? configSources.threshold
                  : null,

              enabled_source:
                configSources
                  ? configSources.enabled
                  : null,

              severity_source:
                configSources
                  ? configSources.severity
                  : null,
            },
          });

      if (insertError) {
        throw new Error(
          `[Teltonika] Alert insert failed: ${insertError.message}`,
        );
      }

      console.log(
        `[Teltonika] alert created type=${candidate.alertType}`,
      );
    }


    /*
     * RESOLVE NORMAL BOOLEAN ALERT
     */

    if (
      !candidate.active &&
      existing
    ) {
      const {
        error: resolveError,
      } =
        await getSupabase()
          .from("alerts")
          .update({
            status:
              "resolved",

            resolved_at:
              recordedAt,
          })
          .eq(
            "id",
            existing.id,
          );

      if (resolveError) {
        throw new Error(
          `[Teltonika] Alert resolution failed: ${resolveError.message}`,
        );
      }

      console.log(
        `[Teltonika] alert resolved type=${candidate.alertType}`,
      );
    }
  }


  /*
   * ---------------------------------------------------------
   * DTC LIFECYCLE
   * ---------------------------------------------------------
   *
   * A disappeared DTC does not produce an active:false
   * candidate because it is no longer in the CAN payload.
   *
   * Therefore retrieve active vehicle alerts and explicitly
   * resolve diagnostic codes absent from current telemetry.
   */

  const {
    data: activeAlerts,
    error: activeAlertsError,
  } =
    await getSupabase()
      .from("alerts")
      .select(
        "id,alert_type",
      )
      .eq(
        "company_id",
        companyId,
      )
      .eq(
        "vehicle_id",
        vehicleId,
      )
      .eq(
        "status",
        "active",
      );

  if (activeAlertsError) {
    throw new Error(
      `[Teltonika] Active alert lookup failed: ${activeAlertsError.message}`,
    );
  }


  const staleDiagnostics =
    (
      activeAlerts ??
      []
    ).filter(
      (alert) =>
        typeof alert.alert_type ===
          "string" &&
        alert.alert_type.startsWith(
          "diagnostic_dtc_",
        ) &&
        !currentlyActiveTypes.has(
          alert.alert_type,
        ),
    );


  for (
    const alert of
    staleDiagnostics
  ) {
    const {
      error: resolveError,
    } =
      await getSupabase()
        .from("alerts")
        .update({
          status:
            "resolved",

          resolved_at:
            recordedAt,
        })
        .eq(
          "id",
          alert.id,
        );

    if (resolveError) {
      throw new Error(
        `[Teltonika] DTC resolution failed: ${resolveError.message}`,
      );
    }

    console.log(
      `[Teltonika] alert resolved type=${alert.alert_type}`,
    );
  }
}
/* ============================================================
   PERSISTENCE
   ============================================================ */

export async function persistTelemetry(
  telemetry: NormalizedTelemetry,
) {
  const { data: device, error: deviceError } =
    await getSupabase()
      .from("devices")
      .select(
        "id,company_id,vehicle_id,imei",
      )
      .eq("imei", telemetry.imei)
      .maybeSingle();

  if (deviceError) {
    throw new Error(
      `[Teltonika] Device lookup failed for ${telemetry.imei}: ${deviceError.message}`,
    );
  }

  if (!device) {
    throw new Error(
      `[Teltonika] Unknown Supabase device IMEI ${telemetry.imei}`,
    );
  }

  if (!device.vehicle_id) {
    throw new Error(
      `[Teltonika] Device ${telemetry.imei} is not assigned to a vehicle`,
    );
  }

  const recordedAt =
    telemetry.timestamp;

  const positionRow = {
    company_id: device.company_id,
    vehicle_id: device.vehicle_id,
    device_id: device.id,

    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    altitude: telemetry.altitude,
    speed: telemetry.speedKph,
    heading: telemetry.angle,

    recorded_at: recordedAt,
  };

  const { error: positionError } =
    await getSupabase()
      .from("positions")
      .insert(positionRow);

  if (positionError) {
    throw new Error(
      `[Teltonika] Position insert failed: ${positionError.message}`,
    );
  }

  const codec =
    telemetry.codec === 142
      ? "8E"
      : "8";

  const signalStrength =
    readNumericIo(
      telemetry,
      "io_21",
    );

  const canPayload = normalizeCanV2(telemetry);

  const ioMetadata =
    buildIoMetadata(
      telemetry,
    );

  const telemetryRow = {
    company_id: device.company_id,
    vehicle_id: device.vehicle_id,
    device_id: device.id,

    recorded_at: recordedAt,

    source: "teltonika",
    codec,

    raw_payload:
      JSON.stringify(
        telemetry.raw,
      ),

    /*
     * IMPORTANT:
     * All original AVL IDs remain available here.
     */
    io_values:
      telemetry.io,

    /*
     * Normalized CAN representation used by Matelematics.
     */
    can_payload:
      canPayload,

    metadata: {
      imei: telemetry.imei,
      received_at: telemetry.receivedAt,
      priority: telemetry.priority,
      event_id: telemetry.eventId,
      satellites: telemetry.satellites,

      io_normalized:
        ioMetadata,

      simulator: canPayload.source.simulator,
    },

    signal_strength:
      signalStrength,

    battery_voltage:
      getBatteryVoltage(
        telemetry,
      ),

    ignition:
      getIgnition(
        telemetry,
      ),
  };

  const { error: telemetryError } =
    await getSupabase()
      .from("telemetry")
      .insert(telemetryRow);

  if (telemetryError) {
    throw new Error(
      `[Teltonika] Telemetry insert failed: ${telemetryError.message}`,
    );
  }

  await syncCanAlerts({
    companyId: device.company_id,
    vehicleId: device.vehicle_id,
    deviceId: device.id,
    recordedAt,
    telemetry,
    canPayload,
  });

  const now =
    new Date().toISOString();

  const { error: deviceUpdateError } =
    await getSupabase()
      .from("devices")
      .update({
        status: "online",
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", device.id);

  if (deviceUpdateError) {
    throw new Error(
      `[Teltonika] Device status update failed: ${deviceUpdateError.message}`,
    );
  }

  return {
    deviceId: device.id,
    companyId: device.company_id,
    vehicleId: device.vehicle_id,
    recordedAt,
  };
}