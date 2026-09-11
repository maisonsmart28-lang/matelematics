export type AlertLifecycleStatus = "active" | "resolved";

export type ExistingAlertLifecycle = {
  id: string;
  status: AlertLifecycleStatus;
  triggeredAt: string;
  resolvedAt: string | null;
};

export type AlertLifecycleDecision =
  | { action: "create" }
  | { action: "keep_active"; alertId: string }
  | { action: "resolve"; alertId: string }
  | { action: "noop" }
  | { action: "ignore_stale"; alertId: string | null; reason: string };

function timestampMs(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function decideAlertLifecycle({
  candidateActive,
  recordedAt,
  latest,
}: {
  candidateActive: boolean;
  recordedAt: string;
  latest: ExistingAlertLifecycle | null;
}): AlertLifecycleDecision {
  const eventMs = timestampMs(recordedAt);

  if (eventMs === null) {
    return {
      action: "ignore_stale",
      alertId: latest?.id ?? null,
      reason: "invalid_recorded_at",
    };
  }

  if (!latest) {
    return candidateActive
      ? { action: "create" }
      : { action: "noop" };
  }

  const triggeredMs = timestampMs(latest.triggeredAt);

  if (triggeredMs === null) {
    return {
      action: "ignore_stale",
      alertId: latest.id,
      reason: "invalid_existing_triggered_at",
    };
  }

  if (latest.status === "active") {
    if (eventMs < triggeredMs) {
      return {
        action: "ignore_stale",
        alertId: latest.id,
        reason: "event_before_active_trigger",
      };
    }

    return candidateActive
      ? {
          action: "keep_active",
          alertId: latest.id,
        }
      : {
          action: "resolve",
          alertId: latest.id,
        };
  }

  const resolvedMs = timestampMs(latest.resolvedAt);

  if (resolvedMs === null) {
    return {
      action: "ignore_stale",
      alertId: latest.id,
      reason: "resolved_alert_without_valid_resolved_at",
    };
  }

  if (!candidateActive) {
    return { action: "noop" };
  }

  if (eventMs <= resolvedMs) {
    return {
      action: "ignore_stale",
      alertId: latest.id,
      reason: "event_not_after_previous_resolution",
    };
  }

  return { action: "create" };
}
