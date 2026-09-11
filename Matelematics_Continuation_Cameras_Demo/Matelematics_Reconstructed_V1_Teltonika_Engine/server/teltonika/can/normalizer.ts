import type {
  AvlSourceProfile,
  SupportedDeviceModel,
} from "../avl/catalog";

import type {
  NormalizedTelemetry,
} from "../types";

import {
  resolveRegisteredCanContext,
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
  sourceProfile?: AvlSourceProfile | null;
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
  sourceProfile: AvlSourceProfile | null | undefined,
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
 * Step 5A rule: a real light-vehicle AVL ID is only interpreted when both a
 * supported device model and an explicit source profile are known.
 *
 * The real device model is resolved from the in-memory registry, which is
 * populated from Supabase devices.model by loadDevicesFromSupabase. Existing
 * callers can still pass an explicit context for tests or controlled imports.
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

  const model =
    supportedModel(
      explicitContextSupplied
        ? context?.model
        : registeredContext?.model,
    );

  const sourceProfile =
    explicitLightProfile(
      explicitContextSupplied
        ? context?.sourceProfile
        : registeredContext?.sourceProfile,
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

  /*
   * A registered real device or an explicit Step 5A context fails closed when
   * its model/source combination is incomplete. Raw AVL remains persisted by
   * the existing storage layer; only physical interpretation is withheld.
   */
  if (
    explicitContextSupplied ||
    registeredContext?.registered
  ) {
    return normalizeUnknownRealDevice(
      telemetry,
    );
  }

  /*
   * Legacy fallback is kept only for unregistered development callers. It
   * preserves existing simulator/manual tests while registered production
   * devices no longer rely on heuristic source guessing.
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
