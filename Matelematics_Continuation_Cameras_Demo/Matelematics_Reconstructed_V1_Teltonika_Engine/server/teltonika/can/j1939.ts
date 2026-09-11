import type {
  IoValue,
  NormalizedTelemetry,
} from "../types";

import {
  numericIo,
  simulatorDiagnostics,
} from "./diagnostics";

import {
  getFmsJ1939Definition,
} from "./fms-catalog";

import type {
  NormalizedCanV2,
} from "./types-v2";

function rawIo(
  telemetry: NormalizedTelemetry,
  id: number,
): IoValue | null {
  return telemetry.raw.io.find(
    (item) => item.id === id,
  ) ?? null;
}

function decodeUnsigned(
  io: IoValue,
): bigint {
  const bytes = Buffer.from(
    io.rawHex,
    "hex",
  );

  let value = 0n;

  for (const byte of bytes) {
    value =
      (value << 8n) |
      BigInt(byte);
  }

  return value;
}

function decodeSigned(
  io: IoValue,
): bigint {
  const unsigned = decodeUnsigned(io);
  const bits = BigInt(io.size * 8);

  if (bits === 0n) {
    return 0n;
  }

  const signBit =
    1n << (bits - 1n);

  return (
    unsigned & signBit
  ) === 0n
    ? unsigned
    : unsigned - (1n << bits);
}

function fmsNumeric(
  telemetry: NormalizedTelemetry,
  id: number,
): number | null {
  const definition =
    getFmsJ1939Definition(id);

  const io =
    rawIo(
      telemetry,
      id,
    );

  if (
    !definition ||
    !io
  ) {
    return null;
  }

  if (
    io.size !==
    definition.bytes
  ) {
    throw new Error(
      `FMS AVL ${id} (${definition.name}) expected ${definition.bytes} bytes, received ${io.size}`,
    );
  }

  const exact =
    definition.type ===
      "signed"
      ? decodeSigned(io)
      : decodeUnsigned(io);

  if (
    exact >
      BigInt(
        Number.MAX_SAFE_INTEGER,
      ) ||
    exact <
      BigInt(
        Number.MIN_SAFE_INTEGER,
      )
  ) {
    throw new Error(
      `FMS AVL ${id} (${definition.name}) exceeds safe JavaScript numeric precision`,
    );
  }

  return (
    Number(exact) *
    definition.multiplier
  );
}

export function normalizeJ1939(
  telemetry: NormalizedTelemetry,
): NormalizedCanV2 {
  const io =
    telemetry.io;

  /*
   * Step 5B source rule:
   *
   * Only values explicitly defined in the typed FMS/J1939 catalog are
   * interpreted as FMS vehicle data. Manual CAN and CAN-adapter values are
   * separate sources and are never guessed here from overlapping AVL IDs.
   */
  const rpm =
    fmsNumeric(
      telemetry,
      88,
    );

  const speed =
    fmsNumeric(
      telemetry,
      80,
    ) ??
    telemetry.speedKph;

  const throttle =
    fmsNumeric(
      telemetry,
      84,
    );

  const engineLoad =
    fmsNumeric(
      telemetry,
      85,
    );

  const fuelUsed =
    fmsNumeric(
      telemetry,
      86,
    );

  const fuelLevel =
    fmsNumeric(
      telemetry,
      87,
    );

  const mil =
    fmsNumeric(
      telemetry,
      10349,
    );

  const ignitionRaw =
    numericIo(
      io,
      239,
    );

  const movementRaw =
    numericIo(
      io,
      240,
    );

  const ignition =
    ignitionRaw === null
      ? null
      : ignitionRaw === 1;

  const movement =
    movementRaw === null
      ? speed > 0
      : movementRaw === 1;

  /*
   * Tracker total odometer (AVL 16) remains available as tracker metadata.
   * AVL 36 is deliberately NOT accepted here because it belongs to a separate
   * CAN-adapter source and must not be misrepresented as decoded FMS data.
   */
  const trackerOdometerMetres =
    numericIo(
      io,
      16,
    );

  const odometerKm =
    trackerOdometerMetres === null
      ? null
      : trackerOdometerMetres /
        1000;

  const externalMv =
    numericIo(
      io,
      66,
    );

  const internalMv =
    numericIo(
      io,
      67,
    );

  const simDiagnostics =
    simulatorDiagnostics(io);

  const checkEngine =
    mil === null &&
    simDiagnostics.active.length === 0
      ? null
      : (
          (
            mil !== null &&
            mil !== 0 &&
            mil !== 7
          ) ||
          simDiagnostics.active.length > 0
        );

  const simulator =
    io.io_9005 !== undefined;

  /*
   * IDs 19/20 are not FMS elements. Keep them only for the explicit simulator
   * profile so legacy development scenarios remain compatible without causing
   * real-device source confusion.
   */
  const simulatorAdBluePercent =
    simulator
      ? numericIo(
          io,
          19,
        )
      : null;

  const simulatorAdBlueRaw =
    simulator
      ? numericIo(
          io,
          20,
        )
      : null;

  return {
    version: 2,

    source: {
      manufacturer: "teltonika",
      profile: "j1939_fms",
      simulator,
      mappingVersion: "2.1",
    },

    engine: {
      rpm,
      coolantTemperatureC:
        null,
      loadPercent:
        engineLoad,
      throttlePercent:
        throttle,
      engineHours:
        null,
    },

    vehicle: {
      speedKph:
        speed,
      odometerKm,
      ignition,
      movement,
    },

    fuel: {
      levelPercent:
        fuelLevel,
      levelLiters:
        null,
      consumedLiters:
        fuelUsed,
      rateLph:
        null,
      averageL100km:
        null,
      adBluePercent:
        simulatorAdBluePercent,
      adBlueLiters:
        simulatorAdBlueRaw === null
          ? null
          : simulatorAdBlueRaw /
            10,
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
      checkEngine,
      abs: null,
      airbag: null,
      esp: null,
      oilPressure: null,
      tpms: null,
    },

    diagnostics: {
      dtcCount:
        simDiagnostics.active.length,

      active:
        simDiagnostics.active,

      stored:
        simDiagnostics.stored,
    },

    tracker: {
      gsmSignal:
        numericIo(
          io,
          21,
        ),

      externalVoltage:
        externalMv === null
          ? null
          : externalMv /
            1000,

      internalBatteryVoltage:
        internalMv === null
          ? null
          : internalMv /
            1000,

      satellites:
        telemetry.satellites,
    },

    rpm,

    speed_kph:
      speed,

    fuel_level_percent:
      fuelLevel,

    fuel_used_litres:
      fuelUsed,

    coolant_temperature_c:
      null,

    throttle_percent:
      throttle,

    odometer_km:
      odometerKm,

    simulator,
  };
}
