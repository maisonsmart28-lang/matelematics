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

import type {
  NormalizedCanV2,
} from "./types-v2";


export function normalizeCanV2(
  telemetry: NormalizedTelemetry,
): NormalizedCanV2 {
  const io =
    telemetry.io;

  /*
   * Explicit simulator profile first.
   */
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

  /*
   * Automatic real-device detection.
   *
   * FMC650 FMS/J1939 elements provide
   * a strong signal for the heavy profile.
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