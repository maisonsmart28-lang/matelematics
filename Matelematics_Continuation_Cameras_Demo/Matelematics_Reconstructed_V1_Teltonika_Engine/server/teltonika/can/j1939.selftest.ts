import assert from "node:assert/strict";

import type {
  IoValue,
  NormalizedTelemetry,
  TeltonikaRecord,
} from "../types";

import {
  normalizeJ1939,
} from "./j1939";

function io(
  id: number,
  value: number,
  size: 1 | 2 | 4,
): IoValue {
  const buffer =
    Buffer.alloc(size);

  if (size === 1) {
    buffer.writeUInt8(value, 0);
  } else if (size === 2) {
    buffer.writeUInt16BE(value, 0);
  } else {
    buffer.writeUInt32BE(value, 0);
  }

  return {
    id,
    value,
    size,
    rawHex:
      buffer.toString("hex"),
    storage: "fixed",
  };
}

function telemetry(
  values: IoValue[],
  extraIo: Record<string, number | string> = {},
): NormalizedTelemetry {
  const record: TeltonikaRecord = {
    timestamp:
      "2026-09-11T12:00:00.000Z",
    priority: 0,
    gps: {
      longitude: -7.6,
      latitude: 33.57,
      altitude: 42,
      angle: 90,
      satellites: 10,
      speedKph: 70,
    },
    eventId: 0,
    io: values,
  };

  const ioMap:
    Record<string, number | string> = {
      ...extraIo,
    };

  for (const item of values) {
    ioMap[`io_${item.id}`] =
      item.value;
  }

  return {
    imei: "350000000000001",
    receivedAt:
      "2026-09-11T12:00:01.000Z",
    codec: 142,
    timestamp:
      record.timestamp,
    priority: 0,
    latitude:
      record.gps.latitude,
    longitude:
      record.gps.longitude,
    altitude:
      record.gps.altitude,
    angle:
      record.gps.angle,
    satellites:
      record.gps.satellites,
    speedKph:
      record.gps.speedKph,
    eventId: 0,
    io: ioMap,
    raw: record,
  };
}

const realFms = telemetry([
  io(80, 82, 4),
  io(84, 37, 4),
  io(85, 64, 1),
  io(86, 125000, 4),
  io(87, 73, 4),
  io(88, 1850, 4),
  io(10349, 2, 1),
  // Deliberate foreign-source value: must NOT become FMS odometer.
  io(36, 987654, 4),
]);

const normalized =
  normalizeJ1939(realFms);

assert.equal(
  normalized.source.profile,
  "j1939_fms",
);
assert.equal(
  normalized.source.mappingVersion,
  "2.1",
);
assert.equal(normalized.rpm, 1850);
assert.equal(normalized.speed_kph, 82);
assert.equal(normalized.throttle_percent, 37);
assert.equal(normalized.engine.loadPercent, 64);
assert.equal(normalized.fuel_used_litres, 125000);
assert.equal(normalized.fuel_level_percent, 73);
assert.equal(normalized.warnings.checkEngine, true);
assert.equal(
  normalized.odometer_km,
  null,
  "AVL 36 must not be interpreted as FMS odometer",
);
assert.equal(
  normalized.fuel.adBluePercent,
  null,
  "Real FMS normalization must not consume CAN-adapter AdBlue IDs",
);

const trackerOdometer = telemetry(
  [
    io(80, 60, 4),
    io(88, 1500, 4),
  ],
  {
    io_16: 123456,
    io_239: 1,
    io_240: 1,
    io_66: 13200,
    io_67: 4020,
    io_21: 4,
  },
);

const trackerNormalized =
  normalizeJ1939(
    trackerOdometer,
  );

assert.equal(
  trackerNormalized.odometer_km,
  123.456,
);
assert.equal(
  trackerNormalized.vehicle.ignition,
  true,
);
assert.equal(
  trackerNormalized.vehicle.movement,
  true,
);
assert.equal(
  trackerNormalized.tracker.externalVoltage,
  13.2,
);
assert.equal(
  trackerNormalized.tracker.internalBatteryVoltage,
  4.02,
);
assert.equal(
  trackerNormalized.tracker.gsmSignal,
  4,
);

const simulatorTelemetry = telemetry(
  [
    io(80, 50, 4),
    io(88, 1200, 4),
  ],
  {
    io_9005: "j1939",
    io_19: 55,
    io_20: 345,
  },
);

const simulatorNormalized =
  normalizeJ1939(
    simulatorTelemetry,
  );

assert.equal(
  simulatorNormalized.simulator,
  true,
);
assert.equal(
  simulatorNormalized.fuel.adBluePercent,
  55,
);
assert.equal(
  simulatorNormalized.fuel.adBlueLiters,
  34.5,
);

const invalidWidth = telemetry([
  io(88, 1500, 2),
]);

assert.throws(
  () => normalizeJ1939(invalidWidth),
  /expected 4 bytes, received 2/,
  "Typed FMS normalization must reject a wrong AVL byte width",
);

console.log(
  "Teltonika Step 5B typed FMS/J1939 normalizer self-test PASS",
);
