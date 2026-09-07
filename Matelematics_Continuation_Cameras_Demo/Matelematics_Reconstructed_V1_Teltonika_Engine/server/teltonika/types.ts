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
  value: number | string;
  size: 1 | 2 | 4 | 8;
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
