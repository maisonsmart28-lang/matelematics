import type { NormalizedTelemetry, TeltonikaMessage } from "./types";

export function normalizeMessage(
  imei: string,
  message: TeltonikaMessage,
): NormalizedTelemetry[] {
  const receivedAt = new Date().toISOString();

  return message.records.map((record) => ({
    imei,
    receivedAt,

    codec: message.codec,

    timestamp: record.timestamp,
    priority: record.priority,

    latitude: record.gps.latitude,
    longitude: record.gps.longitude,
    altitude: record.gps.altitude,
    angle: record.gps.angle,
    satellites: record.gps.satellites,
    speedKph: record.gps.speedKph,

    eventId: record.eventId,

    io: Object.fromEntries(
      record.io.map((item) => [`io_${item.id}`, item.value]),
    ),

    raw: record,
  }));
}
