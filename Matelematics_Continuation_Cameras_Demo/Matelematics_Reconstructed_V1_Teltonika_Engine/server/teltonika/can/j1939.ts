import type {
  NormalizedTelemetry,
} from "../types";

import {
  numericIo,
  simulatorDiagnostics,
} from "./diagnostics";

import type {
  NormalizedCanV2,
} from "./types-v2";


export function normalizeJ1939(
  telemetry: NormalizedTelemetry,
): NormalizedCanV2 {
  const io =
    telemetry.io;

  /*
   * FMC650 FMS/J1939 relevant AVL elements:
   *
   * 80    Wheel Based Speed
   * 84    Accelerator Pedal Position
   * 85    Engine Current Load
   * 86    Engine Total Fuel Used
   * 87    Fuel Level
   * 88    Engine Speed
   * 10349 MIL indicator
   *
   * Permanent tracker IO remains shared:
   * 21 / 66 / 67 / 239 / 240
   */

  const rpm =
    numericIo(io, 88);

  const speed =
    numericIo(io, 80) ??
    telemetry.speedKph;

  const throttle =
    numericIo(io, 84);

  const engineLoad =
    numericIo(io, 85);

  const fuelUsed =
    numericIo(io, 86);

  const fuelLevel =
    numericIo(io, 87);

  const mil =
    numericIo(io, 10349);

  const ignitionRaw =
    numericIo(io, 239);

  const movementRaw =
    numericIo(io, 240);

  const ignition =
    ignitionRaw === null
      ? null
      : ignitionRaw === 1;

  const movement =
    movementRaw === null
      ? speed > 0
      : movementRaw === 1;

  /*
   * FMC650 may also receive CAN adapter values.
   * Use mileage if present.
   */
  const odometerMetres =
    numericIo(io, 36) ??
    numericIo(io, 16);

  const odometerKm =
    odometerMetres === null
      ? null
      : odometerMetres / 1000;

  const externalMv =
    numericIo(io, 66);

  const internalMv =
    numericIo(io, 67);

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

  return {
    version: 2,

    source: {
      manufacturer: "teltonika",
      profile: "j1939_fms",
      simulator,
      mappingVersion: "2.0",
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
        numericIo(io, 19),
      adBlueLiters:
        numericIo(io, 20) === null
          ? null
          : (
              numericIo(io, 20)! /
              10
            ),
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
        numericIo(io, 21),

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

    /*
     * V1 compatibility
     */

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