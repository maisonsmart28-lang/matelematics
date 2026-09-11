export const ACTIVE_ALERT_UNIQUE_INDEX =
  "alerts_one_active_per_type_vehicle_idx";

type PostgrestErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

export function isActiveAlertUniqueConflict(
  error: PostgrestErrorLike | null | undefined,
) {
  if (!error || error.code !== "23505") {
    return false;
  }

  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  return text.includes(ACTIVE_ALERT_UNIQUE_INDEX);
}
