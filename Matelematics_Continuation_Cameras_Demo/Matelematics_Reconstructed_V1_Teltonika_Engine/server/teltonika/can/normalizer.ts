import type {
  AvlSourceProfile,
  SupportedDeviceModel,
} from "../avl/catalog";

import type {
  NormalizedTelemetry,
} from "../types";

import {
  resolveRegisteredCanContext,
  type RegisteredCanSourceProfile,
} from "./device-context";

import {
  asciiIo,
  numericIo,
} from "./diagnostics";

import {
  normalizeJ1939,
} from "./j1939";

import {
  normalizeLightVehicle,
} from "./light-vehicle";

import {
  normalizeProfiledLightVehicle,
  type LightVehicleSourceProfile,
} from "./profiled-light-vehicle";

import type {
  NormalizedCanV2,
} from "./types-v2";

export type CanNormalizationContext = {
  model?: SupportedDeviceModel | string | null;
  sourceProfile?: RegisteredCanSourceProfile | null;
};

function supportedModel(
  model: CanNormalizationContext["model"],
): SupportedDeviceModel | null {
  if (
    model === "FMB140" ||
    model === "FMC125" ||
    model === "FMC150"
  ) {
    return model;
  }

  return null;
}

function explicitLightProfile(
  sourceProfile: RegisteredCanSourceProfile | null | undefined,
): LightVehicleSourceProfile | null {
  if (
    sourceProfile === "obd" ||
    sourceProfile === "can_adapter" ||
    sourceProfile === "fmc150_can_chip" ||
    sourceProfile === "fmc125_peripheral"
  ) {
    return sourceProfile;
  }

  return null;
}

function normalizeUnknownRealDevice(
  telemetry: NormalizedTelemetry,
): NormalizedCanV2 {
  const ignitionRaw =
    numericIo(
      telemetry.io,
      239,
    );

  const movementRaw =
    numericIo(
      telemetry.io,
      240,
    );

  const externalMv =
    numericIo(
      telemetry.io,
      66,
    );

  const internalMv =
    numericIo(
      telemetry.io,
      67,
    );

  const speed = telemetry.speedKph;

  return {
    version: 2,
    source: {
      manufacturer: "teltonika",
      profile: "unknown",
      simulator: false,
      mappingVersion: "2.0",
    },
    engine: {
      rpm: null,
      coolantTemperatureC: null,
      loadPercent: null,
      throttlePercent: null,
      engineHours: null,
    },
    vehicle: {
      speedKph: speed,
      odometerKm: null,
      ignition:
        ignitionRaw === null
          ? null
          : ignitionRaw === 1,
      movement:
        movementRaw === null
          ? speed > 0
          : movementRaw === 1,
    },
    fuel: {
      levelPercent: null,
      levelLiters: null,
      consumedLiters: null,
      rateLph: null,
      averageL100km: null,
      adBluePercent: null,
      adBlueLiters: null,
    },
    doors: {
      frontLeft: null,
      frontRight: null,
      rearLeft: null,
      rearRight: null,
      hood: null,
      trunk: null,
    },
    safety: {
      seatbelt: null,
      handbrake: null,
    },
    warnings: {
      checkEngine: null,
      abs: null,
      airbag: null,
      esp: null,
      oilPressure: null,
      tpms: null,
    },
    diagnostics: {
      dtcCount: null,
      active: [],
      stored: [],
    },
    tracker: {
      gsmSignal:
        numericIo(
          telemetry.io,
          21,
        ),
      externalVoltage:
        externalMv === null
          ? null
          : externalMv / 1000,
      internalBatteryVoltage:
        internalMv === null
          ? null
          : internalMv / 1000,
      satellites:
        telemetry.satellites,
    },
    rpm: null,
    speed_kph: speed,
    fuel_level_percent: null,
    fuel_used_litres: null,
    coolant_temperature_c: null,
    throttle_percent: null,
    odometer_km: null,
    simulator: false,
  };
}

/**
 * Normalize Teltonika CAN/vehicle telemetry.
 *
 * Registered production devices are normalized from explicit device context.
 * FMS/J1939 is never selected for a registered device by observing AVL IDs
 * alone. The registered model label must explicitly identify FMS/J1939.
 *
 * This is especially important for the requested "FMC600": that exact model
 * remains unverified in the current Teltonika documentation, so "FMC600"
 * alone fails closed while "FMC600 J1939" / "FMC600 FMS" explicitly selects
 * the FMS normalization profile without claiming hardware certification.
 */
export function normalizeCanV2(
  telemetry: NormalizedTelemetry,
  context?: CanNormalizationContext,
): NormalizedCanV2 {
  const io = telemetry.io;

  const simProfile =
    asciiIo(
      io,
      9005,
    );

  if (simProfile === "j1939") {
    return normalizeJ1939(
      telemetry,
    );
  }

  if (simProfile === "light") {
    return normalizeLightVehicle(
      telemetry,
    );
  }

  const explicitContextSupplied =
    context !== undefined;

  const registeredContext =
    explicitContextSupplied
      ? null
      : resolveRegisteredCanContext(
          telemetry.imei,
        );

  const resolvedSourceProfile =
    explicitContextSupplied
      ? context?.sourceProfile ?? null
      : registeredContext?.sourceProfile ?? null;

  if (resolvedSourceProfile === "j1939_fms") {
    return normalizeJ1939(
      telemetry,
    );
  }

  const model =
    supportedModel(
      explicitContextSupplied
        ? context?.model
        : registeredContext?.model,
    );

  const sourceProfile =
    explicitLightProfile(
      resolvedSourceProfile,
    );

  if (
    model &&
    sourceProfile
  ) {
    return normalizeProfiledLightVehicle(
      telemetry,
      {
        model,
        sourceProfile,
      },
    );
  }

  if (
    explicitContextSupplied ||
    registeredContext?.registered
  ) {
    return normalizeUnknownRealDevice(
      telemetry,
    );
  }

  /*
   * Legacy fallback is intentionally limited to unregistered development
   * callers. Production-registered devices never use this heuristic.
   */
  const j1939Detected =
    io.io_88 !== undefined ||
    io.io_10349 !== undefined ||
    io.io_80 !== undefined;

  if (j1939Detected) {
    return normalizeJ1939(
      telemetry,
    );
  }

  return normalizeLightVehicle(
    telemetry,
  );
}
