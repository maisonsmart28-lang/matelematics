import assert from "node:assert/strict";

import { resolveHardwareCapabilities } from "../hardware/capabilities";
import { calculateFleetHealth, type SmartHealthEvidence } from "./fleet-health";

const NOW = new Date("2026-09-19T12:00:00.000Z");

function alert(overrides: Partial<SmartHealthEvidence> & Pick<SmartHealthEvidence, "key" | "severity">): SmartHealthEvidence {
  return {
    source: "alert",
    sourceId: overrides.sourceId ?? `test-${overrides.key}`,
    observedAt: overrides.observedAt ?? "2026-09-19T11:00:00.000Z",
    resolvedAt: overrides.resolvedAt ?? null,
    key: overrides.key,
    severity: overrides.severity,
    message: overrides.message ?? null,
  };
}

const gt06 = resolveHardwareCapabilities({ manufacturer: "Accurate", model: "GT06" });
const gt06Result = calculateFleetHealth({
  capabilities: gt06,
  evidence: [
    alert({ key: "coolant_temperature_high", severity: "critical" }),
    alert({ key: "engine_rpm_high", severity: "high" }),
  ],
  now: NOW,
});
assert.equal(gt06Result.score, 100, "GT06 must not be penalized for unsupported CAN signals");
assert.equal(gt06Result.reasons.length, 0);
assert.equal(gt06Result.confidence, "limited");

const fmc150 = resolveHardwareCapabilities({ manufacturer: "Teltonika", model: "FMC150" });
const fmc150Result = calculateFleetHealth({
  capabilities: fmc150,
  evidence: [
    alert({ key: "coolant_temperature_high", severity: "critical" }),
    alert({ key: "battery_voltage_low", severity: "warning" }),
  ],
  now: NOW,
});
assert.equal(fmc150Result.score, 69);
assert.equal(fmc150Result.reasons.length, 2);
assert.equal(fmc150Result.confidence, "high");

const fmc125 = resolveHardwareCapabilities({
  manufacturer: "Teltonika",
  model: "FMC125",
  sourceProfile: "light_vehicle_can",
});
const fmc125Result = calculateFleetHealth({
  capabilities: fmc125,
  evidence: [alert({ key: "engine_rpm_high", severity: "high" })],
  now: NOW,
});
assert.equal(fmc125Result.score, 86);
assert.equal(fmc125Result.reasons[0]?.key, "engine_rpm_high");

const fmc650 = resolveHardwareCapabilities({
  manufacturer: "Teltonika",
  model: "FMC650",
  sourceProfile: "j1939_fms",
});
const fmc650Result = calculateFleetHealth({
  capabilities: fmc650,
  evidence: [alert({ key: "engine_load_high", severity: "critical" })],
  now: NOW,
});
assert.equal(fmc650Result.score, 75);

const recentResolved = calculateFleetHealth({
  capabilities: fmc150,
  evidence: [
    alert({
      key: "coolant_temperature_high",
      severity: "critical",
      resolvedAt: "2026-09-18T12:00:00.000Z",
    }),
  ],
  now: NOW,
});
assert.equal(recentResolved.score, 96, "recent resolved critical alert should have small decaying impact");

const oldResolved = calculateFleetHealth({
  capabilities: fmc150,
  evidence: [
    alert({
      key: "coolant_temperature_high",
      severity: "critical",
      resolvedAt: "2026-09-10T12:00:00.000Z",
    }),
  ],
  now: NOW,
});
assert.equal(oldResolved.score, 100, "resolved alert older than seven days must not reduce current health");
assert.equal(oldResolved.reasons.length, 0);

const operationalOnly = calculateFleetHealth({
  capabilities: fmc150,
  evidence: [
    alert({ key: "overspeed", severity: "critical" }),
    alert({ key: "door_open_moving", severity: "critical" }),
  ],
  now: NOW,
});
assert.equal(operationalOnly.score, 100, "driver/safety alerts must stay outside mechanical health");
assert.equal(operationalOnly.reasons.length, 0);

console.log("PASS: SMART-1B fleet health deterministic self-test");
