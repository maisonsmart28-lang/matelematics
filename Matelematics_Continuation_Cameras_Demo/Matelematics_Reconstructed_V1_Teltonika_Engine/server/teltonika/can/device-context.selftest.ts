import assert from "node:assert/strict";

import {
  normalizeCanV2,
} from "./normalizer";

import {
  registerDevice,
} from "../registry";

import type {
  IoValue,
  NormalizedTelemetry,
} from "../types";

function fixedIo(
  id: number,
  size: number,
  value: number,
): IoValue {
  const bytes = Buffer.alloc(size);

  if (size === 1) bytes.writeUInt8(value, 0);
  else if (size === 2) bytes.writeUInt16BE(value, 0);
  else if (size === 4) bytes.writeUInt32BE(value, 0);
  else throw new Error(`Unsupported test IO size ${size}`);

  return {
    id,
    value,
    size,
    rawHex: bytes.toString("hex"),
    storage: "fixed",
  };
}

function telemetry(
  imei: string,
  rawIo: IoValue[],
): NormalizedTelemetry {
  return {
    imei,
    receivedAt: "2026-09-11T00:00:00.000Z",
    codec: 142,
    timestamp: "2026-09-11T00:00:00.000Z",
    priority: 0,
    latitude: 33.5731,
    longitude: -7.5898,
    altitude: 50,
    angle: 90,
    satellites: 10,
    speedKph: 42,
    eventId: 0,
    io: Object.fromEntries(
      rawIo.map((item) => [
        `io_${item.id}`,
        item.value,
      ]),
    ),
    raw: {
      timestamp: "2026-09-11T00:00:00.000Z",
      priority: 0,
      gps: {
        latitude: 33.5731,
        longitude: -7.5898,
        altitude: 50,
        angle: 90,
        satellites: 10,
        speedKph: 42,
      },
      eventId: 0,
      io: rawIo,
    },
  };
}

const fmc150Imei = "350000000000151";
registerDevice({
  imei: fmc150Imei,
  clientId: "company-a",
  vehicleId: "vehicle-a",
  label: "FMC150",
});

const fmc150 = normalizeCanV2(
  telemetry(
    fmc150Imei,
    [
      fixedIo(85, 2, 1800),
      fixedIo(87, 4, 123456),
      fixedIo(115, 2, 850),
    ],
  ),
);

assert.equal(fmc150.source.profile, "fmc150_can_chip");
assert.equal(fmc150.engine.rpm, 1800);
assert.equal(fmc150.vehicle.odometerKm, 123.456);
assert.equal(fmc150.engine.coolantTemperatureC, 85);

const allCanImei = "350000000000140";
registerDevice({
  imei: allCanImei,
  clientId: "company-b",
  vehicleId: "vehicle-b",
  label: "FMB140 + ALL-CAN300",
});

const allCan = normalizeCanV2(
  telemetry(
    allCanImei,
    [
      fixedIo(81, 1, 88),
      fixedIo(90, 4, 0x2100),
      fixedIo(105, 4, 654321),
    ],
  ),
);

assert.equal(allCan.source.profile, "can_adapter");
assert.equal(allCan.vehicle.speedKph, 88);
assert.equal(allCan.vehicle.odometerKm, 654.321);
assert.equal(allCan.doors.frontLeft, true);
assert.equal(allCan.doors.trunk, true);
assert.equal(allCan.doors.frontRight, false);

const obdImei = "350000000000125";
registerDevice({
  imei: obdImei,
  clientId: "company-c",
  vehicleId: "vehicle-c",
  label: "FMC125 OBD",
});

const obd = normalizeCanV2(
  telemetry(
    obdImei,
    [
      fixedIo(36, 2, 2250),
    ],
  ),
);

assert.equal(obd.source.profile, "obd");
assert.equal(obd.engine.rpm, 2250);

const ambiguousImei = "350000000000126";
registerDevice({
  imei: ambiguousImei,
  clientId: "company-d",
  vehicleId: "vehicle-d",
  label: "FMC125",
});

const ambiguous = normalizeCanV2(
  telemetry(
    ambiguousImei,
    [
      fixedIo(36, 2, 3000),
      fixedIo(81, 1, 99),
    ],
  ),
);

assert.equal(ambiguous.source.profile, "unknown");
assert.equal(ambiguous.engine.rpm, null);
assert.equal(ambiguous.vehicle.speedKph, 42);

const unregistered = normalizeCanV2(
  telemetry(
    "359999999999999",
    [
      fixedIo(35, 2, 1700),
    ],
  ),
);

assert.equal(unregistered.source.profile, "light_vehicle_can");
assert.equal(unregistered.engine.rpm, 1700);

console.log(
  "Teltonika Step 5A registered device context self-test PASS",
);
