export type TeltonikaCodec = 8 | 142;

export interface GpsData {
  longitude: number;
  latitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speedKph: number;
}

export interface IoValue {
  id: number;
  /**
   * Compatibility value used by the current normalization layer.
   *
   * Fixed-width unsigned values that fit safely in a JavaScript number are
   * numbers. Fixed-width 64-bit values above Number.MAX_SAFE_INTEGER are kept
   * as exact decimal strings. Codec 8 Extended NX values remain hexadecimal
   * strings until a typed AVL catalog definition interprets them.
   */
  value: number | string;
  /** Exact number of value bytes received on the wire. */
  size: number;
  /** Exact raw bytes, lower-case hexadecimal, before any typed interpretation. */
  rawHex: string;
  /** Whether the value came from a fixed-width group or Codec 8E NX. */
  storage: "fixed" | "variable";
}

export interface TeltonikaRecord {
  timestamp: string;
  priority: number;
  gps: GpsData;
  eventId: number;
  io: IoValue[];
}

export interface TeltonikaMessage {
  codec: TeltonikaCodec;
  records: TeltonikaRecord[];
  rawLength: number;
  crcValid: boolean;
}

export interface NormalizedTelemetry {
  imei: string;
  receivedAt: string;

  codec: TeltonikaCodec;

  timestamp: string;
  priority: number;

  latitude: number;
  longitude: number;
  altitude: number;
  angle: number;
  satellites: number;
  speedKph: number;

  eventId: number;

  io: Record<string, number | string>;

  raw: TeltonikaRecord;
}

export interface DeviceRegistration {
  imei: string;
  clientId: string;
  vehicleId: string;
  label: string;
}
