import type { SmartHealthResult } from "./fleet-health";
import type { SmartRecommendation, SmartRecommendationUrgency } from "./recommendations";

export type SmartFleetVehicle = {
  vehicleId: string;
  name: string;
  registration?: string | null;
  health: SmartHealthResult;
  recommendations: readonly SmartRecommendation[];
};

export type SmartFleetAttention = {
  vehicleId: string;
  name: string;
  registration?: string | null;
  score: number;
  confidence: SmartHealthResult["confidence"];
  urgency: SmartRecommendationUrgency;
  recommendationCount: number;
  primaryReason: string;
};

export type SmartFleetInsights = {
  totalVehicles: number;
  vehiclesNeedingAttention: number;
  immediate: number;
  soon: number;
  plan: number;
  monitor: number;
  summary: string;
  attention: SmartFleetAttention[];
  evaluatedAt: string;
  version: "smart-fleet-insights-v1";
};

const URGENCY_RANK: Record<SmartRecommendationUrgency, number> = {
  immediate: 4,
  soon: 3,
  plan: 2,
  monitor: 1,
};

function highestUrgency(
  recommendations: readonly SmartRecommendation[],
): SmartRecommendationUrgency | null {
  let result: SmartRecommendationUrgency | null = null;
  for (const recommendation of recommendations) {
    if (!result || URGENCY_RANK[recommendation.urgency] > URGENCY_RANK[result]) {
      result = recommendation.urgency;
    }
  }
  return result;
}

export function buildSmartFleetInsights(
  vehicles: readonly SmartFleetVehicle[],
  now = new Date(),
): SmartFleetInsights {
  const attention: SmartFleetAttention[] = [];

  for (const vehicle of vehicles) {
    const urgency = highestUrgency(vehicle.recommendations);
    if (!urgency) continue;

    const primary = [...vehicle.recommendations].sort(
      (a, b) => URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency] || b.impact - a.impact,
    )[0];

    if (!primary) continue;

    attention.push({
      vehicleId: vehicle.vehicleId,
      name: vehicle.name,
      registration: vehicle.registration ?? null,
      score: vehicle.health.score,
      confidence: vehicle.health.confidence,
      urgency,
      recommendationCount: vehicle.recommendations.length,
      primaryReason: primary.title,
    });
  }

  attention.sort(
    (a, b) =>
      URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency] ||
      a.score - b.score ||
      a.name.localeCompare(b.name),
  );

  const counts = {
    immediate: attention.filter((item) => item.urgency === "immediate").length,
    soon: attention.filter((item) => item.urgency === "soon").length,
    plan: attention.filter((item) => item.urgency === "plan").length,
    monitor: attention.filter((item) => item.urgency === "monitor").length,
  };

  const count = attention.length;
  const summary =
    count === 0
      ? "Aucun véhicule ne nécessite d’attention selon les signaux techniques actuellement disponibles."
      : `${count} véhicule${count > 1 ? "s" : ""} nécessite${count > 1 ? "nt" : ""} une attention selon les signaux techniques actuellement disponibles.`;

  return {
    totalVehicles: vehicles.length,
    vehiclesNeedingAttention: count,
    ...counts,
    summary,
    attention,
    evaluatedAt: now.toISOString(),
    version: "smart-fleet-insights-v1",
  };
}
