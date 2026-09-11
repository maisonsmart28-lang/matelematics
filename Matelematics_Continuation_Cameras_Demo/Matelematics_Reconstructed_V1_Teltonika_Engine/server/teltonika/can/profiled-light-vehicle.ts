import type { AvlSourceProfile, SupportedDeviceModel } from "../avl/catalog";
import { getAvlDefinition } from "../avl/catalog";
import { interpretAvlValue } from "../avl/value";
import type { IoValue, NormalizedTelemetry } from "../types";
import { numericIo, simulatorDiagnostics } from "./diagnostics";
import type { CanProfile, NormalizedCanV2 } from "./types-v2";

export type LightVehicleSourceProfile =
  | "obd"
  | "can_adapter"
  | "fmc150_can_chip"
  | "fmc125_peripheral";

export type LightVehicleNormalizationContext = {
  model: SupportedDeviceModel;
  sourceProfile: LightVehicleSourceProfile;
};

function rawIo(telemetry: NormalizedTelemetry, id: number): IoValue | null {
  return telemetry.raw.io.find((item) => item.id === id) ?? null;
}

function interpreted(
  telemetry: NormalizedTelemetry,
  source: AvlSourceProfile,
  id: number,
): number | string | null {
  const io = rawIo(telemetry, id);
  const definition = getAvlDefinition(source, id);

  if (!io || !definition) {
    return null;
  }

  return interpretAvlValue(io, definition);
}

function numeric(
  telemetry: NormalizedTelemetry,
  source: AvlSourceProfile,
  id: number,
): number | null {
  const value = interpreted(telemetry, source, id);
  return typeof value === "number" ? value : null;
}

function opened(flags: number | null, mask: number) {
  return flags === null ? null : (flags & mask) !== 0;
}

function profileName(sourceProfile: LightVehicleSourceProfile): CanProfile {
  if (sourceProfile === "can_adapter") return "can_adapter";
  if (sourceProfile === "fmc150_can_chip") return "fmc150_can_chip";
  if (sourceProfile === "obd") return "obd";
  return "fmc125_peripheral";
}

export function normalizeProfiledLightVehicle(
  telemetry: NormalizedTelemetry,
  context: LightVehicleNormalizationContext,
): NormalizedCanV2 {
  const source = context.sourceProfile;

  const trackerGsm = numeric(telemetry, "tracker", 21);
  const trackerBattery = numeric(telemetry, "tracker", 67);
  const ignitionRaw = numeric(telemetry, "tracker", 239);
  const movementRaw = numeric(telemetry, "tracker", 240);
  const externalMv = numericIo(telemetry.io, 66);

  let rpm: number | null = null;
  let speed = telemetry.speedKph;
  let coolantTemperatureC: number | null = null;
  let throttlePercent: number | null = null;
  let odometerKm: number | null = null;
  let fuelLevelPercent: number | null = null;
  let fuelLevelLiters: number | null = null;
  let fuelConsumedLiters: number | null = null;
  let fuelRateLph: number | null = null;
  let adBluePercent: number | null = null;
  let adBlueLiters: number | null = null;
  let doorFlags: number | null = null;

  if (source === "obd") {
    rpm = numeric(telemetry, source, 36);
  }

  if (source === "can_adapter") {
    speed = numeric(telemetry, source, 81) ?? telemetry.speedKph;
    throttlePercent = numeric(telemetry, source, 82);
    doorFlags = numeric(telemetry, source, 90);

    const odometerMetres = numeric(telemetry, source, 105);
    odometerKm = odometerMetres === null ? null : odometerMetres / 1000;

    fuelConsumedLiters = numeric(telemetry, source, 107);
    fuelRateLph = numeric(telemetry, source, 110);
    adBluePercent = numeric(telemetry, source, 111);
    adBlueLiters = numeric(telemetry, source, 112);
  }

  if (source === "fmc150_can_chip") {
    speed = numeric(telemetry, source, 81) ?? telemetry.speedKph;
    throttlePercent = numeric(telemetry, source, 82);
    fuelLevelLiters = numeric(telemetry, source, 84);
    rpm = numeric(telemetry, source, 85);

    const primaryOdometerMetres = numeric(telemetry, source, 87);
    const countedOdometerMetres = numeric(telemetry, source, 105);
    const odometerMetres = primaryOdometerMetres ?? countedOdometerMetres;
    odometerKm = odometerMetres === null ? null : odometerMetres / 1000;

    fuelLevelPercent = numeric(telemetry, source, 89);
    fuelConsumedLiters = numeric(telemetry, source, 107);
    coolantTemperatureC = numeric(telemetry, source, 115);
  }

  const ignition = ignitionRaw === null ? null : ignitionRaw === 1;
  const movement = movementRaw === null ? speed > 0 : movementRaw === 1;
  const simDiagnostics = simulatorDiagnostics(telemetry.io);

  const result: NormalizedCanV2 = {
    version: 2,
    source: {
      manufacturer: "teltonika",
      profile: profileName(source),
      simulator: false,
      mappingVersion: "2.1",
    },
    engine: {
      rpm,
      coolantTemperatureC,
      loadPercent: null,
      throttlePercent,
      engineHours: null,
    },
    vehicle: {
      speedKph: speed,
      odometerKm,
      ignition,
      movement,
    },
    fuel: {
      levelPercent: fuelLevelPercent,
      levelLiters: fuelLevelLiters,
      consumedLiters: fuelConsumedLiters,
      rateLph: fuelRateLph,
      averageL100km: null,
      adBluePercent,
      adBlueLiters,
    },
    doors: {
      frontLeft: opened(doorFlags, 0x100),
      frontRight: opened(doorFlags, 0x200),
      rearLeft: opened(doorFlags, 0x400),
      rearRight: opened(doorFlags, 0x800),
      hood: opened(doorFlags, 0x1000),
      trunk: opened(doorFlags, 0x2000),
    },
    safety: {
      seatbelt: null,
      handbrake: null,
    },
    warnings: {
      checkEngine: simDiagnostics.active.length > 0 ? true : null,
      abs: null,
      airbag: null,
      esp: null,
      oilPressure: null,
      tpms: null,
    },
    diagnostics: {
      dtcCount: simDiagnostics.active.length > 0 ? simDiagnostics.active.length : null,
      active: simDiagnostics.active,
      stored: simDiagnostics.stored,
    },
    tracker: {
      gsmSignal: trackerGsm,
      externalVoltage: externalMv === null ? null : externalMv / 1000,
      internalBatteryVoltage: trackerBattery,
      satellites: telemetry.satellites,
    },
    rpm,
    speed_kph: speed,
    fuel_level_percent: fuelLevelPercent,
    fuel_used_litres: fuelConsumedLiters,
    coolant_temperature_c: coolantTemperatureC,
    throttle_percent: throttlePercent,
    odometer_km: odometerKm,
    simulator: false,
  };

  return result;
}
