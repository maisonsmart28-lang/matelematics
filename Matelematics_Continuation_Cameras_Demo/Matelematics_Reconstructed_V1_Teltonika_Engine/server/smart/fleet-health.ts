import type { HardwareCapabilityResolution } from "../hardware/capabilities";

export type SmartHealthSeverity = "info" | "warning" | "high" | "critical";

export type SmartHealthEvidence = {
  source: "alert";
  sourceId: string;
  key: string;
  severity: SmartHealthSeverity;
  observedAt: string;
  resolvedAt?: string | null;
  capability?: string | null;
  message?: string | null;
};

export type SmartHealthReason = {
  key: string;
  label: string;
  severity: SmartHealthSeverity;
  impact: number;
  sourceId: string;
  observedAt: string;
};

export type SmartHealthResult = {
  score: number;
  confidence: "limited" | "medium" | "high";
  confidencePercent: number;
  reasons: SmartHealthReason[];
  evaluatedAt: string;
  version: "smart-health-v1";
};

const TECHNICAL_ALERTS: Record<string, { label: string; capability?: string }> = {
  check_engine: { label: "Voyant moteur actif", capability: "dtc" },
  coolant_temperature_high: { label: "Température moteur élevée", capability: "can_coolant" },
  battery_voltage_low: { label: "Tension batterie faible", capability: "external_voltage" },
  engine_load_high: { label: "Charge moteur élevée" },
  engine_rpm_high: { label: "Régime moteur élevé", capability: "can_rpm" },
};

const ACTIVE_IMPACT: Record<SmartHealthSeverity, number> = {
  info: 2,
  warning: 6,
  high: 14,
  critical: 25,
};

const RECENT_RESOLVED_IMPACT: Record<SmartHealthSeverity, number> = {
  info: 0,
  warning: 1,
  high: 3,
  critical: 5,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function capabilitySupported(
  resolution: HardwareCapabilityResolution,
  capability?: string,
) {
  return !capability || resolution.capabilities.includes(capability as never);
}

export function calculateFleetHealth(input: {
  capabilities: HardwareCapabilityResolution;
  evidence: readonly SmartHealthEvidence[];
  now?: Date;
}): SmartHealthResult {
  const now = input.now ?? new Date();
  const reasons: SmartHealthReason[] = [];
  let impact = 0;

  for (const evidence of input.evidence) {
    const rule = TECHNICAL_ALERTS[evidence.key];
    if (!rule || !capabilitySupported(input.capabilities, rule.capability)) continue;

    const resolved = Boolean(evidence.resolvedAt);
    let deduction = resolved
      ? RECENT_RESOLVED_IMPACT[evidence.severity]
      : ACTIVE_IMPACT[evidence.severity];

    if (resolved && evidence.resolvedAt) {
      const ageDays = (now.getTime() - new Date(evidence.resolvedAt).getTime()) / 86_400_000;
      if (!Number.isFinite(ageDays) || ageDays < 0 || ageDays > 7) deduction = 0;
      else deduction *= Math.max(0, 1 - ageDays / 7);
    }

    deduction = Math.round(deduction * 10) / 10;
    if (deduction <= 0) continue;

    impact += deduction;
    reasons.push({
      key: evidence.key,
      label: rule.label,
      severity: evidence.severity,
      impact: deduction,
      sourceId: evidence.sourceId,
      observedAt: evidence.observedAt,
    });
  }

  const technicalCapabilities = [
    "dtc",
    "can_rpm",
    "can_coolant",
    "external_voltage",
    "can_odometer",
    "fuel_level",
  ];
  const supported = technicalCapabilities.filter((capability) =>
    input.capabilities.capabilities.includes(capability as never),
  ).length;
  const confidencePercent = Math.round((supported / technicalCapabilities.length) * 100);
  const confidence =
    confidencePercent >= 67 ? "high" : confidencePercent >= 34 ? "medium" : "limited";

  return {
    score: Math.round(clamp(100 - impact, 0, 100)),
    confidence,
    confidencePercent,
    reasons: reasons.sort((a, b) => b.impact - a.impact),
    evaluatedAt: now.toISOString(),
    version: "smart-health-v1",
  };
}
