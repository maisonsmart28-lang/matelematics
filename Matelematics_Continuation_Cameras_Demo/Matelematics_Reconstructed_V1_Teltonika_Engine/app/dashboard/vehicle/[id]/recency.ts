export const TRACKER_FRESHNESS_MS = 120_000;

export function isRecent(timestamp: string | null | undefined, now = Date.now()): boolean {
  if (!timestamp) return false;
  const recordedAt = Date.parse(timestamp);
  if (!Number.isFinite(recordedAt)) return false;
  const age = now - recordedAt;
  return age >= 0 && age <= TRACKER_FRESHNESS_MS;
}
