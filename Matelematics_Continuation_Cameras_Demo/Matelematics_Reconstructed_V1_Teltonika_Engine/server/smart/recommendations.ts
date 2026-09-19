import type { SmartHealthReason, SmartHealthResult } from "./fleet-health";

export type SmartRecommendationUrgency =
  | "monitor"
  | "plan"
  | "soon"
  | "immediate";

export type SmartRecommendation = {
  key: string;
  title: string;
  explanation: string;
  action: string;
  urgency: SmartRecommendationUrgency;
  sourceId: string;
  observedAt: string;
  impact: number;
};

type RecommendationRule = {
  title: string;
  explanation: string;
  action: string;
};

const RULES: Record<string, RecommendationRule> = {
  check_engine: {
    title: "Contrôler le défaut moteur",
    explanation: "Une alerte moteur technique est active ou récente.",
    action: "Consulter les diagnostics et les codes DTC disponibles avant d'effacer ou de remplacer une pièce.",
  },
  coolant_temperature_high: {
    title: "Contrôler la température moteur",
    explanation: "Une température moteur élevée a été détectée.",
    action: "Vérifier le circuit de refroidissement et les mesures disponibles avant de poursuivre une utilisation intensive.",
  },
  battery_voltage_low: {
    title: "Contrôler le circuit électrique",
    explanation: "Une tension batterie faible a été détectée.",
    action: "Contrôler la batterie, la charge alternateur et les connexions électriques.",
  },
  engine_load_high: {
    title: "Examiner la charge moteur",
    explanation: "La charge moteur a dépassé le seuil configuré.",
    action: "Vérifier le contexte de conduite et le seuil configuré avant de conclure à une anomalie mécanique.",
  },
  engine_rpm_high: {
    title: "Examiner le régime moteur",
    explanation: "Le régime moteur a dépassé le seuil configuré.",
    action: "Vérifier le contexte de conduite et le seuil RPM configuré avant toute intervention.",
  },
};

function urgencyFor(reason: SmartHealthReason): SmartRecommendationUrgency {
  if (reason.severity === "critical") return "immediate";
  if (reason.severity === "high") return "soon";
  if (reason.severity === "warning") return "plan";
  return "monitor";
}

export function buildSmartRecommendations(
  health: SmartHealthResult,
): SmartRecommendation[] {
  return health.reasons.flatMap((reason) => {
    const rule = RULES[reason.key];
    if (!rule) return [];

    return [{
      key: reason.key,
      title: rule.title,
      explanation: rule.explanation,
      action: rule.action,
      urgency: urgencyFor(reason),
      sourceId: reason.sourceId,
      observedAt: reason.observedAt,
      impact: reason.impact,
    }];
  });
}
