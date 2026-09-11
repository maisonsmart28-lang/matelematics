import assert from "node:assert/strict";

import {
  assessTelemetryQuality,
  buildTelemetryIngestFingerprint,
} from "./telemetry-quality";
import type { NormalizedTelemetry } from "./types";

const NOW = Date.parse("2026-09-11T18:00:00.000Z");

function telemetry(overrides: Partial<NormalizedTelemetry> = {}): NormalizedTelemetry {
  return {
    imei: "352094082345681",
    receivedAt: "2026-09-11T18:00:01.000Z",
    codec: 142,
    timestamp: "2026-09-11T18:00:00.000Z",
    priority: 0,
    latitude: 33.5731,
    longitude: -7.5898,
    altitude: 50,
    angle: 90,
    satellites: 8,
    speedKph: 45,
    eventId: 0,
    io: {},
    raw: {
      timestamp: "2026-09-11T18:00:00.000Z",
      priority: 0,
      gps: {
        latitude: 33.5731,
        longitude: -7.5898,
        altitude: 50,
        angle: 90,
        satellites: 8,
        speedKph: 45,
      },
      eventId: 0,
      io: [],
    },
    ...overrides,
  };
}

const good = assessTelemetryQuality(telemetry(), NOW);
assert.equal(good.accepted, true);
assert.equal(good.persistPosition, true);
assert.equal(good.gpsFixValid, true);
assert.deepEqual(good.reasons, []);
assert.equal(good.recordedAt, "2026-09-11T18:00:00.000Z");

const noFix = assessTelemetryQuality(
  telemetry({ angle: 0, satellites: 0, speedKph: 0 }),
  NOW,
);
assert.equal(noFix.accepted, true);
assert.equal(noFix.persistPosition, false);
assert.equal(noFix.gpsFixValid, false);
assert.ok(noFix.reasons.includes("no_gps_fix"));

const zeroCoordinatesWithFix = assessTelemetryQuality(
  telemetry({ latitude: 0, longitude: 0, angle: 1, satellites: 5, speedKph: 0 }),
  NOW,
);
assert.equal(zeroCoordinatesWithFix.accepted, true);
assert.equal(zeroCoordinatesWithFix.persistPosition, true);

const badCoordinates = assessTelemetryQuality(
  telemetry({ latitude: 91 }),
  NOW,
);
assert.equal(badCoordinates.accepted, false);
assert.equal(badCoordinates.persistPosition, false);
assert.ok(badCoordinates.reasons.includes("invalid_coordinates"));
assert.equal(badCoordinates.recordedAt, "2026-09-11T18:00:01.000Z");

const oldTimestamp = assessTelemetryQuality(
  telemetry({ timestamp: "1999-12-31T23:59:59.000Z" }),
  NOW,
);
assert.equal(oldTimestamp.accepted, false);
assert.ok(oldTimestamp.reasons.includes("timestamp_too_old"));
assert.equal(oldTimestamp.recordedAt, "2026-09-11T18:00:01.000Z");

const futureTimestamp = assessTelemetryQuality(
  telemetry({ timestamp: "2026-09-13T18:00:00.000Z" }),
  NOW,
);
assert.equal(futureTimestamp.accepted, false);
assert.ok(futureTimestamp.reasons.includes("timestamp_too_far_future"));

const badAngle = assessTelemetryQuality(telemetry({ angle: 361 }), NOW);
assert.equal(badAngle.accepted, false);
assert.ok(badAngle.reasons.includes("invalid_angle"));

const badSpeed = assessTelemetryQuality(telemetry({ speedKph: -1 }), NOW);
assert.equal(badSpeed.accepted, false);
assert.ok(badSpeed.reasons.includes("invalid_speed"));

const firstFingerprint = buildTelemetryIngestFingerprint(telemetry());
const retransmittedFingerprint = buildTelemetryIngestFingerprint(
  telemetry({ receivedAt: "2026-09-11T18:05:00.000Z" }),
);
const changedFingerprint = buildTelemetryIngestFingerprint(
  telemetry({ speedKph: 46 }),
);

assert.equal(firstFingerprint.length, 64);
assert.equal(firstFingerprint, retransmittedFingerprint);
assert.notEqual(firstFingerprint, changedFingerprint);

console.log("Teltonika Step 6A telemetry quality self-test PASS");
