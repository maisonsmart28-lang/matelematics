import type {
  NormalizedCanV2,
} from "./types-v2";


export type AlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "info";


export type CanAlertCandidate = {
  alertType: string;

  active: boolean;

  severity:
    | "critical"
    | "high"
    | "medium"
    | "info";

  title: string;

  message: string;

  metadata:
    Record<
      string,
      unknown
    >;
};


/*
 * Alert Engine V1.1 default thresholds.
 *
 * These are platform defaults only.
 * They will later become configurable per company / vehicle.
 */
const DEFAULT_COOLANT_HIGH_C =
  105;

const DEFAULT_OVERSPEED_KPH =
  120;

const DEFAULT_LOW_VOLTAGE_12V =
  11.8;

const DEFAULT_LOW_VOLTAGE_24V =
  22.0;
const DEFAULT_LOW_FUEL_PERCENT =
  15;

const DEFAULT_ENGINE_RPM_HIGH =
  4500;

const DEFAULT_ENGINE_LOAD_HIGH_PERCENT =
  95;

const DEFAULT_ADBLUE_LOW_PERCENT =
  10;


const CONFIGURABLE_RULE_VERSION =
  "1.3A";


export type AlertEngineConfig = {
  coolantHighC:
    number;

  coolantTemperatureHighEnabled:
    boolean;

  coolantTemperatureHighSeverity:
    AlertSeverity;

  overspeedKph:
    number;

  overspeedEnabled:
    boolean;

  overspeedSeverity:
    AlertSeverity;

  lowVoltage12V:
    number;

  batteryVoltageLow12VEnabled:
    boolean;

  batteryVoltageLow12VSeverity:
    AlertSeverity;

  lowVoltage24V:
    number;

  batteryVoltageLow24VEnabled:
    boolean;

  batteryVoltageLow24VSeverity:
    AlertSeverity;

  lowFuelPercent:
    number;

  lowFuelEnabled:
    boolean;

  lowFuelSeverity:
    AlertSeverity;

  engineRpmHigh:
    number;

  engineRpmHighEnabled:
    boolean;

  engineRpmHighSeverity:
    AlertSeverity;

  engineLoadHighPercent:
    number;

  engineLoadHighEnabled:
    boolean;

  engineLoadHighSeverity:
    AlertSeverity;

  adBlueLowPercent:
    number;

  adBlueLowEnabled:
    boolean;

  adBlueLowSeverity:
    AlertSeverity;
};


export const DEFAULT_ALERT_ENGINE_CONFIG:
  AlertEngineConfig = {
    coolantHighC:
      DEFAULT_COOLANT_HIGH_C,

    coolantTemperatureHighEnabled:
      true,

    coolantTemperatureHighSeverity:
      "critical",

    overspeedKph:
      DEFAULT_OVERSPEED_KPH,

    overspeedEnabled:
      true,

    overspeedSeverity:
      "high",

    lowVoltage12V:
      DEFAULT_LOW_VOLTAGE_12V,

    batteryVoltageLow12VEnabled:
      true,

    batteryVoltageLow12VSeverity:
      "medium",

    lowVoltage24V:
      DEFAULT_LOW_VOLTAGE_24V,

    batteryVoltageLow24VEnabled:
      true,

    batteryVoltageLow24VSeverity:
      "medium",

    lowFuelPercent:
      DEFAULT_LOW_FUEL_PERCENT,

    lowFuelEnabled:
      true,

    lowFuelSeverity:
      "medium",

    engineRpmHigh:
      DEFAULT_ENGINE_RPM_HIGH,

    engineRpmHighEnabled:
      false,

    engineRpmHighSeverity:
      "high",

    engineLoadHighPercent:
      DEFAULT_ENGINE_LOAD_HIGH_PERCENT,

    engineLoadHighEnabled:
      false,

    engineLoadHighSeverity:
      "medium",

    adBlueLowPercent:
      DEFAULT_ADBLUE_LOW_PERCENT,

    adBlueLowEnabled:
      false,

    adBlueLowSeverity:
      "high",
  };


function anyDoorOpen(
  can: NormalizedCanV2,
) {
  return [
    can.doors.frontLeft,
    can.doors.frontRight,
    can.doors.rearLeft,
    can.doors.rearRight,
    can.doors.hood,
    can.doors.trunk,
  ].some(
    (
      value,
    ) =>
      value ===
      true,
  );
}


function detectElectricalSystem(
  voltage:
    number |
    null,
) {
  if (
    voltage ===
    null
  ) {
    return null;
  }


  /*
   * Simple V1 heuristic:
   *
   * >= 18 V -> 24 V platform
   * < 18 V  -> 12 V platform
   *
   * This is deliberately conservative and will later
   * be replaced by explicit per-vehicle configuration.
   */
  return voltage >=
    18
    ? "24v"
    : "12v";
}


function lowVoltageThreshold(
  voltage:
    number |
    null,

  config:
    AlertEngineConfig,
) {
  const system =
    detectElectricalSystem(
      voltage,
    );


  if (
    system ===
    "24v"
  ) {
    return {
      system,
      threshold:
        config.lowVoltage24V,

      enabled:
        config.batteryVoltageLow24VEnabled,

      severity:
        config.batteryVoltageLow24VSeverity,
    };
  }


  if (
    system ===
    "12v"
  ) {
    return {
      system,
      threshold:
        config.lowVoltage12V,

      enabled:
        config.batteryVoltageLow12VEnabled,

      severity:
        config.batteryVoltageLow12VSeverity,
    };
  }


  return null;
}


export function buildAlertCandidates(
  can: NormalizedCanV2,

  config:
    AlertEngineConfig =
      DEFAULT_ALERT_ENGINE_CONFIG,
): CanAlertCandidate[] {
  const result:
    CanAlertCandidate[] =
    [];


  /*
   * ---------------------------------------------------------
   * CHECK ENGINE
   * ---------------------------------------------------------
   */
  if (
    can.warnings.checkEngine !==
    null
  ) {
    result.push({
      alertType:
        "check_engine",

      active:
        can.warnings.checkEngine,

      severity:
        "high",

      title:
        "Voyant moteur",

      message:
        can.warnings.checkEngine
          ? "Le système CAN signale un défaut moteur."
          : "Le voyant moteur n'est plus actif.",

      metadata: {
        can_version:
          2,
      },
    });
  }


  /*
   * ---------------------------------------------------------
   * DOOR OPEN WHILE MOVING
   * ---------------------------------------------------------
   */
  const doorOpen =
    anyDoorOpen(
      can,
    );


  const moving =
    can.vehicle.movement ===
      true ||
    (
      can.vehicle.speedKph !==
        null &&
      can.vehicle.speedKph >
        0
    );


  result.push({
    alertType:
      "door_open_moving",

    active:
      doorOpen &&
      moving,

    severity:
      "critical",

    title:
      "Ouverture détectée en mouvement",

    message:
      "Une porte, le capot ou le coffre est ouvert alors que le véhicule est en mouvement.",

    metadata: {
      doors:
        can.doors,

      speed_kph:
        can.vehicle.speedKph,
    },
  });


  /*
   * ---------------------------------------------------------
   * COOLANT TEMPERATURE
   *
   * Normalized canonical name:
   * coolant_temperature_high
   * ---------------------------------------------------------
   */
  if (
    can.engine.coolantTemperatureC !==
    null
  ) {
    const temperature =
      can.engine.coolantTemperatureC;


    result.push({
      alertType:
        "coolant_temperature_high",

      active:
        config.coolantTemperatureHighEnabled &&
        temperature >=
          config.coolantHighC,

      severity:
        config.coolantTemperatureHighSeverity,

      title:
        "Température moteur élevée",

      message:
        `Température moteur : ${temperature.toFixed(
          1,
        )} °C.`,

      metadata: {
        temperature_c:
          temperature,

        threshold_c:
          config.coolantHighC,

        rule_version:
          CONFIGURABLE_RULE_VERSION,
      },
    });
  }


  /*
   * ---------------------------------------------------------
   * BATTERY / EXTERNAL VOLTAGE
   *
   * Use the tracker external supply voltage.
   * Internal tracker battery is deliberately ignored.
   * ---------------------------------------------------------
   */
  if (
    can.tracker.externalVoltage !==
    null
  ) {
    const voltage =
      can.tracker.externalVoltage;


    const voltageProfile =
      lowVoltageThreshold(
        voltage,
        config,
      );


    if (
      voltageProfile
    ) {
      result.push({
        alertType:
          "battery_voltage_low",

        active:
          voltageProfile.enabled &&
          voltage <
            voltageProfile.threshold,

        severity:
          voltageProfile.severity,

        title:
          "Tension batterie faible",

        message:
          `Tension externe : ${voltage.toFixed(
            2,
          )} V.`,

        metadata: {
          voltage_v:
            voltage,

          electrical_system:
            voltageProfile.system,

          threshold_v:
            voltageProfile.threshold,

          signal_source:
            "tracker_external_voltage",

          rule_version:
            CONFIGURABLE_RULE_VERSION,
        },
      });
    }
  }


  /*
   * ---------------------------------------------------------
   * OVERSPEED
   * ---------------------------------------------------------
   */
  if (
    can.vehicle.speedKph !==
    null
  ) {
    const speed =
      can.vehicle.speedKph;


    result.push({
      alertType:
        "overspeed",

      active:
        config.overspeedEnabled &&
        speed >
          config.overspeedKph,

      severity:
        config.overspeedSeverity,

      title:
        "Excès de vitesse",

      message:
        `Vitesse détectée : ${speed.toFixed(
          0,
        )} km/h.`,

      metadata: {
        speed_kph:
          speed,

        threshold_kph:
          config.overspeedKph,

        rule_version:
          CONFIGURABLE_RULE_VERSION,
      },
    });
  }


  /*
   * ---------------------------------------------------------
   * LOW FUEL
   * Existing rule preserved.
   * ---------------------------------------------------------
   */
  if (
    can.fuel.levelPercent !==
    null
  ) {
    result.push({
      alertType:
        "low_fuel",

      active:
        config.lowFuelEnabled &&
        can.fuel.levelPercent <=
          config.lowFuelPercent,

      severity:
        config.lowFuelSeverity,

      title:
        "Niveau carburant faible",

      message:
        `Niveau carburant : ${can.fuel.levelPercent.toFixed(
          0,
        )} %.`,

      metadata: {
        fuel_level_percent:
          can.fuel.levelPercent,

        threshold_percent:
          config.lowFuelPercent,

        rule_version:
          CONFIGURABLE_RULE_VERSION,
      },
    });
  }


  /*
   * ---------------------------------------------------------
   * ENGINE RPM HIGH
   * ---------------------------------------------------------
   */
  if (
    can.engine.rpm !==
    null
  ) {
    const rpm =
      can.engine.rpm;

    result.push({
      alertType:
        "engine_rpm_high",

      active:
        config.engineRpmHighEnabled &&
        rpm >=
          config.engineRpmHigh,

      severity:
        config.engineRpmHighSeverity,

      title:
        "Regime moteur eleve",

      message:
        `Regime moteur : ${rpm.toFixed(
          0,
        )} tr/min.`,

      metadata: {
        engine_rpm:
          rpm,

        threshold_rpm:
          config.engineRpmHigh,

        rule_version:
          CONFIGURABLE_RULE_VERSION,
      },
    });
  }


  /*
   * ---------------------------------------------------------
   * ENGINE LOAD HIGH
   * ---------------------------------------------------------
   */
  if (
    can.engine.loadPercent !==
    null
  ) {
    const engineLoad =
      can.engine.loadPercent;

    result.push({
      alertType:
        "engine_load_high",

      active:
        config.engineLoadHighEnabled &&
        engineLoad >=
          config.engineLoadHighPercent,

      severity:
        config.engineLoadHighSeverity,

      title:
        "Charge moteur elevee",

      message:
        `Charge moteur : ${engineLoad.toFixed(
          0,
        )} %.`,

      metadata: {
        engine_load_percent:
          engineLoad,

        threshold_percent:
          config.engineLoadHighPercent,

        rule_version:
          CONFIGURABLE_RULE_VERSION,
      },
    });
  }


  /*
   * ---------------------------------------------------------
   * LOW ADBLUE
   * ---------------------------------------------------------
   */
  if (
    can.fuel.adBluePercent !==
    null
  ) {
    const adBluePercent =
      can.fuel.adBluePercent;

    result.push({
      alertType:
        "adblue_low",

      active:
        config.adBlueLowEnabled &&
        adBluePercent <=
          config.adBlueLowPercent,

      severity:
        config.adBlueLowSeverity,

      title:
        "Niveau AdBlue faible",

      message:
        `Niveau AdBlue : ${adBluePercent.toFixed(
          0,
        )} %.`,

      metadata: {
        adblue_percent:
          adBluePercent,

        threshold_percent:
          config.adBlueLowPercent,

        rule_version:
          CONFIGURABLE_RULE_VERSION,
      },
    });
  }


  /*
   * ---------------------------------------------------------
   * ACTIVE DTC
   * Existing DTC lifecycle preserved.
   * ---------------------------------------------------------
   */
  for (
    const diagnostic of
    can.diagnostics.active
  ) {
    const safeCode =
      diagnostic.code
        .replace(
          /[^A-Za-z0-9_-]/g,
          "_",
        )
        .slice(
          0,
          50,
        );


    result.push({
      alertType:
        `diagnostic_dtc_${safeCode}`,

      active:
        true,

      severity:
        "high",

      title:
        `Défaut diagnostic ${diagnostic.code}`,

      message:
        `Un défaut véhicule actif a été détecté : ${diagnostic.code}.`,

      metadata: {
        diagnostic,

        rule_version:
          "1.1",
      },
    });
  }


  return result;
}