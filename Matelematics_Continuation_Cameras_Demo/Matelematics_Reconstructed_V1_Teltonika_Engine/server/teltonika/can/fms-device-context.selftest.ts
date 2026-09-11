import assert from "node:assert/strict";

import {
  registerDevice,
} from "../registry";

import type {
  IoValue,
  NormalizedTelemetry,
} from "../types";

import {
  normalizeCanV2,
} from "./normalizer";

function fixedIo(
  id: number,
  size: 1 | 2 | 4,
  value: number,
): IoValue {
  const bytes = Buffer.alloc(size);

  if (size === 1) bytes.writeUInt8(value, 0);
  else if (size === 2) bytes.writeUInt16BE(value, 0);
  else bytes.writeUInt32BE(value, 0);

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
    receivedAt: "2026-09-11T17:30:00.000Z",
    codec: 142,
    timestamp: "2026-09-11T17:30:00.000Z",
    priority: 0,
    latitude: 33.5731,
    longitude: -7.5898,
    altitude: 50,
    angle: 90,
    satellites: 10,
    speedKph: 41,
    eventId: 0,
    io: Object.fromEntries(
      rawIo.map((item) => [
        `io_${item.id}`,
        item.value,
      ]),
    ),
    raw: {
      timestamp: "2026-09-11T17:30:00.000Z",
      priority: 0,
      gps: {
        latitude: 33.5731,
        longitude: -7.5898,
        altitude: 50,
        angle: 90,
        satellites: 10,
        speedKph: 41,
      },
      eventId: 0,
      io: rawIo,
    },
  };
}

const explicitFmsImei = "356000000000001";
registerDevice({
  imei: explicitFmsImei,
  clientId: "company-fms",
  vehicleId: "vehicle-fms",
  label: "FMC600 J1939",
  model: "FMC600 J1939",
});

const explicitFms = normalizeCanV2(
  telemetry(
    explicitFmsImei,
    [
      fixedIo(80, 4, 82),
      fixedIo(84, 4, 47),
      fixedIo(85, 1, 66),
      fixedIo(86, 4, 12345),
      fixedIo(87, 4, 54),
      fixedIo(88, 4, 1850),
      fixedIo(10349, 1, 2),
      fixedIo(36, 4, 999999),
      fixedIo(16, 4, 321000),
    ],
  ),
);

assert.equal(explicitFms.source.profile, "j1939_fms");
assert.equal(explicitFms.vehicle.speedKph, 82);
assert.equal(explicitFms.engine.throttlePercent, 47);
assert.equal(explicitFms.engine.loadPercent, 66);
assert.equal(explicitFms.engine.rpm, 1850);
assert.equal(explicitFms.fuel.consumedLiters, 12345);
assert.equal(explicitFms.fuel.levelPercent, 54);
assert.equal(explicitFms.warnings.checkEngine, true);
assert.equal(
  explicitFms.vehicle.odometerKm,
  321,
  "FMS normalizer may use tracker AVL 16 but must ignore AVL 36 as FMS odometer",
);

const ambiguousFmc600Imei = "356000000000002";
registerDevice({
  imei: ambiguousFmc600Imei,
  clientId: "company-ambiguous",
  vehicleId: "vehicle-ambiguous",
  label: "FMC600",
  model: "FMC600",
});

const ambiguousFmc600 = normalizeCanV2(
  telemetry(
    ambiguousFmc600Imei,
    [
      fixedIo(80, 4, 91),
      fixedIo(88, 4, 2100),
      fixedIo(10349, 1, 1),
    ],
  ),
);

assert.equal(
  ambiguousFmc600.source.profile,
  "unknown",
  "Unverified FMC600 without an explicit FMS/J1939 marker must fail closed",
);
assert.equal(ambiguousFmc600.engine.rpm, null);
assert.equal(ambiguousFmc600.vehicle.speedKph, 41);
assert.equal(ambiguousFmc600.warnings.checkEngine, null);

const explicitContext = normalizeCanV2(
  telemetry(
    "356000000000003",
    [
      fixedIo(80, 4, 73),
      fixedIo(88, 4, 1600),
    ],
  ),
  {
    model: "FMC600",
    sourceProfile: "j1939_fms",
  },
);

assert.equal(explicitContext.source.profile, "j1939_fms");
assert.equal(explicitContext.vehicle.speedKph, 73);
assert.equal(explicitContext.engine.rpm, 1600);

const explicitUnknown = normalizeCanV2(
  telemetry(
    "356000000000004",
    [
      fixedIo(80, 4, 73),
      fixedIo(88, 4, 1600),
    ],
  ),
  {
    model: "FMC600",
    sourceProfile: null,
  },
);

assert.equal(explicitUnknown.source.profile, "unknown");
assert.equal(explicitUnknown.engine.rpm, null);

console.log(
  "Teltonika Step 5B registered FMS/J1939 device context self-test PASS",
);
