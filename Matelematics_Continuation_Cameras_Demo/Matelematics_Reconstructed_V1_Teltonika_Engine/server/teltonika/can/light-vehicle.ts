import type {
  NormalizedTelemetry,
} from "../types";

import {
  numericIo,
  signed16,
  simulatorDiagnostics,
} from "./diagnostics";

import type {
  NormalizedCanV2,
} from "./types-v2";


function opened(
  flags: number | null,
  mask: number,
) {
  if (flags === null) {
    return null;
  }

  return (
    flags & mask
  ) !== 0;
}


export function normalizeLightVehicle(
  telemetry: NormalizedTelemetry,
): NormalizedCanV2 {
  const io = telemetry.io;

  /*
   * Official Teltonika CAN adapter AVL IDs:
   *
   * 14  Engine Worktime (minutes)
   * 16  Total Mileage Counted (m)
   * 17  Fuel Consumed Counted (0.1 L)
   * 18  Fuel Rate (0.1 L/h)
   * 19  AdBlue %
   * 20  AdBlue liters (0.1 L)
   * 23  Engine Load %
   * 25  Engine Temperature (0.1 C)
   * 33  Fuel Consumed (0.1 L)
   * 34  Fuel Level Liters (0.1 L)
   * 35  Engine RPM
   * 36  Total Mileage (m)
   * 37  Fuel Level %
   * 38  Control State Flags / doors
   * 81  Vehicle Speed
   * 82  Accelerator Pedal
   * 176 DTC Errors count/state
   *
   * Permanent tracker IO:
   *
   * 21  GSM signal
   * 66  External voltage mV
   * 67  Internal battery voltage mV
   * 239 Ignition
   * 240 Movement
   */

  const rpm =
    numericIo(io, 35) ??
    numericIo(io, 85);

  const speed =
    numericIo(io, 81) ??
    telemetry.speedKph;

  const temperatureRaw =
    signed16(
      numericIo(io, 25) ??
      numericIo(io, 115),
    );

  const temperature =
    temperatureRaw === null
      ? null
      : temperatureRaw / 10;

  const throttle =
    numericIo(io, 82);

  const engineLoad =
    numericIo(io, 23);

  const workMinutes =
    numericIo(io, 14);

  const engineHours =
    workMinutes === null
      ? null
      : workMinutes / 60;

  const odometerMetres =
    numericIo(io, 36) ??
    numericIo(io, 16);

  const odometerKm =
    odometerMetres === null
      ? null
      : odometerMetres / 1000;

  const fuelLevelPercent =
    numericIo(io, 37);

  const fuelLevelLitersRaw =
    numericIo(io, 34);

  const fuelLevelLiters =
    fuelLevelLitersRaw === null
      ? null
      : fuelLevelLitersRaw / 10;

  const fuelConsumedRaw =
    numericIo(io, 33) ??
    numericIo(io, 17);

  const fuelConsumed =
    fuelConsumedRaw === null
      ? null
      : fuelConsumedRaw / 10;

  const fuelRateRaw =
    numericIo(io, 18);

  const fuelRate =
    fuelRateRaw === null
      ? null
      : fuelRateRaw / 10;

  const adBluePercent =
    numericIo(io, 19);

  const adBlueLitersRaw =
    numericIo(io, 20);

  const adBlueLiters =
    adBlueLitersRaw === null
      ? null
      : adBlueLitersRaw / 10;

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

  const doorFlags =
    numericIo(io, 38);

  const dtcCount =
    numericIo(io, 176);

  const simDiagnostics =
    simulatorDiagnostics(io);

  const checkEngine =
    dtcCount === null &&
    simDiagnostics.active.length === 0
      ? null
      : (
          (dtcCount ?? 0) > 0 ||
          simDiagnostics.active.length > 0
        );

  const externalMv =
    numericIo(io, 66);

  const internalMv =
    numericIo(io, 67);

  const simulator =
    io.io_9005 !== undefined;

  const result: NormalizedCanV2 = {
    version: 2,

    source: {
      manufacturer: "teltonika",
      profile: "light_vehicle_can",
      simulator,
      mappingVersion: "2.0",
    },

    engine: {
      rpm,
      coolantTemperatureC:
        temperature,
      loadPercent:
        engineLoad,
      throttlePercent:
        throttle,
      engineHours,
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
        fuelLevelPercent,
      levelLiters:
        fuelLevelLiters,
      consumedLiters:
        fuelConsumed,
      rateLph:
        fuelRate,
      averageL100km:
        null,
      adBluePercent,
      adBlueLiters,
    },

    doors: {
      frontLeft:
        opened(
          doorFlags,
          0x100,
        ),

      frontRight:
        opened(
          doorFlags,
          0x200,
        ),

      rearLeft:
        opened(
          doorFlags,
          0x400,
        ),

      rearRight:
        opened(
          doorFlags,
          0x800,
        ),

      hood:
        opened(
          doorFlags,
          0x1000,
        ),

      trunk:
        opened(
          doorFlags,
          0x2000,
        ),
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
      dtcCount,
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

    rpm,
    speed_kph:
      speed,

    fuel_level_percent:
      fuelLevelPercent,

    fuel_used_litres:
      fuelConsumed,

    coolant_temperature_c:
      temperature,

    throttle_percent:
      throttle,

    odometer_km:
      odometerKm,

    simulator,
  };

  return result;
}