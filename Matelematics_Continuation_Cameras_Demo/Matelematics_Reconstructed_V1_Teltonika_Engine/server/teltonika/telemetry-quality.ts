import { createHash } from "node:crypto";

import type { NormalizedTelemetry } from "./types";

export type TelemetryQualityReason =
  | "invalid_timestamp"
  | "timestamp_too_old"
  | "timestamp_too_far_future"
  | "invalid_coordinates"
  | "no_gps_fix"
  | "invalid_altitude"
  | "invalid_angle"
  | "invalid_satellites"
  | "invalid_speed";

export type TelemetryQuality = {
  accepted: boolean;
  persistPosition: boolean;
  gpsFixValid: boolean;
  recordedAt: string;
  reasons: TelemetryQualityReason[];
};

const MIN_TIMESTAMP_MS = Date.UTC(2000, 0, 1);
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;

function finite(value: number) {
  return Number.isFinite(value);
}

export function buildTelemetryIngestFingerprint(
  telemetry: NormalizedTelemetry,
) {
  const canonical = JSON.stringify({
    imei: telemetry.imei,
    codec: telemetry.codec,
    timestamp: telemetry.timestamp,
    priority: telemetry.priority,
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    altitude: telemetry.altitude,
    angle: telemetry.angle,
    satellites: telemetry.satellites,
    speedKph: telemetry.speedKph,
    eventId: telemetry.eventId,
    io: telemetry.io,
    raw: telemetry.raw,
  });

  return createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex");
}

export function assessTelemetryQuality(
  telemetry: NormalizedTelemetry,
  nowMs = Date.now(),
): TelemetryQuality {
  const reasons: TelemetryQualityReason[] = [];
  const timestampMs = Date.parse(telemetry.timestamp);

  if (!Number.isFinite(timestampMs)) {
    reasons.push("invalid_timestamp");
  } else {
    if (timestampMs < MIN_TIMESTAMP_MS) {
      reasons.push("timestamp_too_old");
    }

    if (timestampMs > nowMs + MAX_FUTURE_SKEW_MS) {
      reasons.push("timestamp_too_far_future");
    }
  }

  const coordinatesValid =
    finite(telemetry.latitude) &&
    finite(telemetry.longitude) &&
    telemetry.latitude >= -90 &&
    telemetry.latitude <= 90 &&
    telemetry.longitude >= -180 &&
    telemetry.longitude <= 180;

  if (!coordinatesValid) {
    reasons.push("invalid_coordinates");
  }

  if (!finite(telemetry.altitude) || telemetry.altitude < -1000 || telemetry.altitude > 20000) {
    reasons.push("invalid_altitude");
  }

  if (!finite(telemetry.angle) || telemetry.angle < 0 || telemetry.angle > 360) {
    reasons.push("invalid_angle");
  }

  if (!Number.isInteger(telemetry.satellites) || telemetry.satellites < 0 || telemetry.satellites > 255) {
    reasons.push("invalid_satellites");
  }

  if (!finite(telemetry.speedKph) || telemetry.speedKph < 0 || telemetry.speedKph > 65535) {
    reasons.push("invalid_speed");
  }

  /*
   * Teltonika documents that when there is no valid GPS fix the tracker keeps
   * the last valid longitude/latitude/altitude, while angle, satellites and
   * speed are all zero. Therefore coordinates alone must never be interpreted
   * as a fresh position.
   */
  const noGpsFix =
    telemetry.angle === 0 &&
    telemetry.satellites === 0 &&
    telemetry.speedKph === 0;

  if (noGpsFix) {
    reasons.push("no_gps_fix");
  }

  const hardFailure = reasons.some((reason) =>
    reason === "invalid_timestamp" ||
    reason === "timestamp_too_old" ||
    reason === "timestamp_too_far_future" ||
    reason === "invalid_coordinates" ||
    reason === "invalid_altitude" ||
    reason === "invalid_angle" ||
    reason === "invalid_satellites" ||
    reason === "invalid_speed"
  );

  return {
    accepted: !hardFailure,
    persistPosition: !hardFailure && !noGpsFix,
    gpsFixValid: !hardFailure && !noGpsFix,
    recordedAt: Number.isFinite(timestampMs) && !hardFailure
      ? new Date(timestampMs).toISOString()
      : telemetry.receivedAt,
    reasons,
  };
}
