import assert from "node:assert/strict";

import type { SmartHealthResult } from "./fleet-health";
import { buildSmartRecommendations } from "./recommendations";

const health: SmartHealthResult = {
  score: 55,
  confidence: "high",
  confidencePercent: 83,
  evaluatedAt: "2026-09-19T12:00:00.000Z",
  version: "smart-health-v1",
  reasons: [
    {
      key: "coolant_temperature_high",
      label: "Température moteur élevée",
      severity: "critical",
      impact: 25,
      sourceId: "alert-coolant",
      observedAt: "2026-09-19T11:00:00.000Z",
    },
    {
      key: "engine_rpm_high",
      label: "Régime moteur élevé",
      severity: "high",
      impact: 14,
      sourceId: "alert-rpm",
      observedAt: "2026-09-19T11:30:00.000Z",
    },
    {
      key: "battery_voltage_low",
      label: "Tension batterie faible",
      severity: "warning",
      impact: 6,
      sourceId: "alert-battery",
      observedAt: "2026-09-19T10:00:00.000Z",
    },
  ],
};

const recommendations = buildSmartRecommendations(health);

assert.equal(recommendations.length, 3);
assert.equal(recommendations[0]?.urgency, "immediate");
assert.equal(recommendations[1]?.urgency, "soon");
assert.equal(recommendations[2]?.urgency, "plan");
assert.equal(recommendations[0]?.sourceId, "alert-coolant");
assert.match(recommendations[1]?.action ?? "", /seuil RPM configuré/);
assert.match(recommendations[0]?.explanation ?? "", /détectée/);

const clean: SmartHealthResult = {
  ...health,
  score: 100,
  reasons: [],
};
assert.deepEqual(buildSmartRecommendations(clean), []);

console.log("PASS: SMART-1C explainable recommendations self-test");
