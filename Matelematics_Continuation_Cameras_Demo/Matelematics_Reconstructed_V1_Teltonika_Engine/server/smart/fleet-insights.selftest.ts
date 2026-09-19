import assert from "node:assert/strict";

import type { SmartHealthResult } from "./fleet-health";
import { buildSmartFleetInsights, type SmartFleetVehicle } from "./fleet-insights";
import type { SmartRecommendation } from "./recommendations";

function health(score: number): SmartHealthResult {
  return {
    score,
    confidence: "high",
    confidencePercent: 83,
    reasons: [],
    evaluatedAt: "2026-09-19T12:00:00.000Z",
    version: "smart-health-v1",
  };
}

function recommendation(
  urgency: SmartRecommendation["urgency"],
  title: string,
  impact: number,
): SmartRecommendation {
  return {
    key: title.toLowerCase().replaceAll(" ", "_"),
    title,
    explanation: "Explication factuelle de test.",
    action: "Action de test.",
    urgency,
    sourceId: `source-${title}`,
    observedAt: "2026-09-19T11:00:00.000Z",
    impact,
  };
}

const vehicles: SmartFleetVehicle[] = [
  {
    vehicleId: "v-clean",
    name: "Véhicule sain",
    registration: "TEST-000",
    health: health(100),
    recommendations: [],
  },
  {
    vehicleId: "v-soon",
    name: "Véhicule B",
    registration: "TEST-002",
    health: health(82),
    recommendations: [recommendation("soon", "Contrôler le régime moteur", 14)],
  },
  {
    vehicleId: "v-immediate",
    name: "Véhicule A",
    registration: "TEST-001",
    health: health(69),
    recommendations: [
      recommendation("plan", "Contrôler le circuit électrique", 6),
      recommendation("immediate", "Contrôler la température moteur", 25),
    ],
  },
];

const result = buildSmartFleetInsights(
  vehicles,
  new Date("2026-09-19T12:00:00.000Z"),
);

assert.equal(result.totalVehicles, 3);
assert.equal(result.vehiclesNeedingAttention, 2);
assert.equal(result.immediate, 1);
assert.equal(result.soon, 1);
assert.equal(result.plan, 0, "a vehicle is counted once at its highest urgency");
assert.equal(result.attention[0]?.vehicleId, "v-immediate");
assert.equal(result.attention[0]?.primaryReason, "Contrôler la température moteur");
assert.equal(result.attention[0]?.recommendationCount, 2);
assert.equal(result.attention[1]?.vehicleId, "v-soon");
assert.match(result.summary, /^2 véhicules nécessitent une attention/);

const empty = buildSmartFleetInsights(
  [{
    vehicleId: "v-clean",
    name: "Véhicule sain",
    health: health(100),
    recommendations: [],
  }],
  new Date("2026-09-19T12:00:00.000Z"),
);
assert.equal(empty.vehiclesNeedingAttention, 0);
assert.match(empty.summary, /^Aucun véhicule/);

console.log("PASS: SMART-1D fleet insights deterministic self-test");
