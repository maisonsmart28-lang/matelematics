import assert from "node:assert/strict";

import type {
  IoValue,
  NormalizedTelemetry,
} from "../types";

import {
  normalizeCanV2,
} from "./normalizer";

function io(
  id: number,
  rawHex: string,
  value: number | string,
  storage: IoValue["storage"] = "fixed",
): IoValue {
  return {
    id,
    rawHex,
    value,
    size: rawHex.length / 2,
    storage,
  };
}

function telemetry(values: IoValue[]): NormalizedTelemetry {
  return {
    imei: "123456789012345",
    receivedAt: "2026-09-11T16:00:00.000Z",
    codec: 142,
    timestamp: "2026-09-11T16:00:00.000Z",
    priority: 0,
    latitude: 33.5731,
    longitude: -7.5898,
    altitude: 50,
    angle: 0,
    satellites: 12,
    speedKph: 44,
    eventId: 0,
    io: Object.fromEntries(
      values.map((item) => [`io_${item.id}`, item.value]),
    ),
    raw: {
      timestamp: "2026-09-11T16:00:00.000Z",
      priority: 0,
      gps: {
        latitude: 33.5731,
        longitude: -7.5898,
        altitude: 50,
        angle: 0,
        satellites: 12,
        speedKph: 44,
      },
      eventId: 0,
      io: values,
    },
  };
}

const sharedTracker = [
  io(21, "04", 4),
  io(67, "0e10", 3600),
  io(239, "01", 1),
  io(240, "01", 1),
];

const mixed = telemetry([
  ...sharedTracker,

  // OBD Engine RPM = 3000. Must never become mileage.
  io(36, "0bb8", 3000),

  // ALL-CAN300 / adapter values.
  io(81, "50", 80),
  io(82, "4b", 75),
  io(90, "00002100", 0x2100),
  io(105, "0001e240", 123456),
  io(107, "00000141", 321),
  io(110, "007b", 123),
  io(111, "37", 55),
  io(112, "007b", 123),

  // FMC150 CAN-chip values in the same synthetic record. Context must decide
  // which meaning is allowed to reach the normalized result.
  io(84, "01c8", 456),
  io(85, "09c4", 2500),
  io(87, "00030d40", 200000),
  io(89, "42", 66),
  io(115, "ffce", 65486),
]);

const adapter = normalizeCanV2(
  mixed,
  {
    model: "FMB140",
    sourceProfile: "can_adapter",
  },
);

assert.equal(adapter.source.profile, "can_adapter");
assert.equal(adapter.source.mappingVersion, "2.1");
assert.equal(adapter.speed_kph, 80);
assert.equal(adapter.throttle_percent, 7.5);
assert.equal(adapter.odometer_km, 123.456);
assert.equal(adapter.fuel_used_litres, 32.1);
assert.equal(adapter.fuel.rateLph, 12.3);
assert.equal(adapter.fuel.adBluePercent, 55);
assert.equal(adapter.fuel.adBlueLiters, 12.3);
assert.equal(adapter.doors.frontLeft, true);
assert.equal(adapter.doors.trunk, true);
assert.equal(adapter.doors.frontRight, false);
assert.equal(adapter.rpm, null, "CAN adapter profile must not steal FMC150 AVL 85 as RPM");
assert.equal(adapter.coolant_temperature_c, null, "CAN adapter profile must not steal FMC150 AVL 115");

const fmc150 = normalizeCanV2(
  mixed,
  {
    model: "FMC150",
    sourceProfile: "fmc150_can_chip",
  },
);

assert.equal(fmc150.source.profile, "fmc150_can_chip");
assert.equal(fmc150.rpm, 2500);
assert.equal(fmc150.speed_kph, 80);
assert.equal(fmc150.throttle_percent, 75);
assert.equal(fmc150.odometer_km, 200);
assert.equal(fmc150.fuel_level_percent, 66);
assert.equal(fmc150.fuel.levelLiters, 45.6);
assert.equal(fmc150.fuel_used_litres, 32.1);
assert.equal(fmc150.coolant_temperature_c, -5);
assert.equal(fmc150.doors.frontLeft, null, "FMC150 CAN-chip profile must not interpret AVL 90 adapter door flags");

const obd = normalizeCanV2(
  mixed,
  {
    model: "FMC125",
    sourceProfile: "obd",
  },
);

assert.equal(obd.source.profile, "obd");
assert.equal(obd.rpm, 3000);
assert.equal(obd.odometer_km, null, "OBD AVL 36 is RPM, never odometer");
assert.equal(obd.fuel_used_litres, null);

const simulator = telemetry([
  io(9005, "6c69676874", "6c69676874", "variable"),
  io(35, "07d0", 2000),
  io(81, "32", 50),
]);

const legacySimulation = normalizeCanV2(simulator);
assert.equal(legacySimulation.source.profile, "light_vehicle_can");
assert.equal(legacySimulation.simulator, true);
assert.equal(legacySimulation.rpm, 2000);

console.log("Teltonika Step 5A source-aware CAN normalizer self-test PASS");
