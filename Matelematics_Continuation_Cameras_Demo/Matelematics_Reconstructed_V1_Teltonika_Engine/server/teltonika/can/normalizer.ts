import type {
  AvlSourceProfile,
  SupportedDeviceModel,
} from "../avl/catalog";

import type {
  NormalizedTelemetry,
} from "../types";

import {
  asciiIo,
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

/**
 * Normalize Teltonika CAN/vehicle telemetry.
 *
 * Step 5A rule: a real light-vehicle AVL ID is only interpreted when both a
 * supported device model and an explicit source profile are known. This stops
 * identical numeric AVL IDs from being guessed as different physical values.
 *
 * Simulator profiles remain backward-compatible. The legacy heuristic path is
 * retained only when no Step 5A context is supplied, so existing development
 * and later FMC600/J1939 work are not silently broken by this sub-step.
 */
export function normalizeCanV2(
  telemetry: NormalizedTelemetry,
  context: CanNormalizationContext = {},
): NormalizedCanV2 {
  const io = telemetry.io;

  const simProfile =
    asciiIo(
      io,
      9005,
    );

  if (
    simProfile === "j1939"
  ) {
    return normalizeJ1939(
      telemetry,
    );
  }

  if (
    simProfile === "light"
  ) {
    return normalizeLightVehicle(
      telemetry,
    );
  }

  const model =
    supportedModel(
      context.model,
    );

  const sourceProfile =
    explicitLightProfile(
      context.sourceProfile,
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
   * Backward-compatible path for callers that do not yet supply the Step 5A
   * model/source context. This remains isolated from the new source-aware
   * normalization and will be removed only after persistence wiring is tested.
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
