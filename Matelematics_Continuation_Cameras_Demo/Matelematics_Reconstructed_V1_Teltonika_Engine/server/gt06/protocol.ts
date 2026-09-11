import type net from "node:net";
import { crc16X25 } from "./crc16";

export type Gt06Position = {
  imei: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  speedKph: number;
  angle: number;
  satellites: number;
  gpsValid: boolean;
  protocol: number;
  serial: number;
  rawHex: string;
};

type Hooks = {
  onLogin?: (imei: string) => void;
  onPosition?: (position: Gt06Position) => void | Promise<void>;
  onHeartbeat?: (imei: string) => void;
  onUnknown?: (protocol: number, rawHex: string) => void;
};

function bcd(byte: number): number {
  return ((byte >> 4) & 0x0f) * 10 + (byte & 0x0f);
}

function decodeImei(payload: Buffer): string {
  const hex = payload.subarray(0, 8).toString("hex");
  return hex.startsWith("0") ? hex.slice(1) : hex;
}

function verifyPacket(packet: Buffer): boolean {
  const long = packet[0] === 0x79 && packet[1] === 0x79;
  const lengthBytes = long ? 2 : 1;
  const length = long ? packet.readUInt16BE(2) : packet[2];
  const expected = 2 + lengthBytes + length + 2;

  if (
    packet.length !== expected ||
    packet.at(-2) !== 0x0d ||
    packet.at(-1) !== 0x0a
  ) {
    return false;
  }

  const crcStart = 2;
  const crcEnd = packet.length - 4;
  const expectedCrc = packet.readUInt16BE(packet.length - 4);
  return crc16X25(packet.subarray(crcStart, crcEnd)) === expectedCrc;
}

export function buildAck(protocol: number, serial: number): Buffer {
  const packet = Buffer.alloc(10);
  packet.writeUInt16BE(0x7878, 0);
  packet[2] = 5;
  packet[3] = protocol;
  packet.writeUInt16BE(serial & 0xffff, 4);
  packet.writeUInt16BE(crc16X25(packet.subarray(2, 6)), 6);
  packet.writeUInt16BE(0x0d0a, 8);
  return packet;
}

function parsePosition(packet: Buffer, imei: string): Gt06Position | null {
  const protocol = packet[3];
  const info = packet.subarray(4, packet.length - 6);
  if (info.length < 18) return null;

  const year = 2000 + bcd(info[0]);
  const month = bcd(info[1]);
  const day = bcd(info[2]);
  const hour = bcd(info[3]);
  const minute = bcd(info[4]);
  const second = bcd(info[5]);
  const satellites = info[6] & 0x0f;
  const latitudeRaw = info.readUInt32BE(7);
  const longitudeRaw = info.readUInt32BE(11);
  const speedKph = info[15];
  const courseStatus = info.readUInt16BE(16);
  const gpsValid = (courseStatus & 0x1000) !== 0;
  const west = (courseStatus & 0x0800) !== 0;
  const north = (courseStatus & 0x0400) !== 0;
  const angle = courseStatus & 0x03ff;

  let latitude = latitudeRaw / 1_800_000;
  let longitude = longitudeRaw / 1_800_000;
  if (!north) latitude = -latitude;
  if (west) longitude = -longitude;

  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const serial = packet.readUInt16BE(packet.length - 6);

  return {
    imei,
    timestamp: date.toISOString(),
    latitude,
    longitude,
    speedKph,
    angle,
    satellites,
    gpsValid,
    protocol,
    serial,
    rawHex: packet.toString("hex"),
  };
}

export function attachGt06Protocol(socket: net.Socket, hooks: Hooks): void {
  let buffer = Buffer.alloc(0);
  let imei = "";

  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 5) {
      let start = -1;

      for (let index = 0; index < buffer.length - 1; index += 1) {
        if (
          (buffer[index] === 0x78 && buffer[index + 1] === 0x78) ||
          (buffer[index] === 0x79 && buffer[index + 1] === 0x79)
        ) {
          start = index;
          break;
        }
      }

      if (start < 0) {
        buffer = Buffer.alloc(0);
        return;
      }

      if (start > 0) buffer = buffer.subarray(start);

      const long = buffer[0] === 0x79 && buffer[1] === 0x79;
      const lengthBytes = long ? 2 : 1;
      if (buffer.length < 2 + lengthBytes) return;

      const length = long ? buffer.readUInt16BE(2) : buffer[2];
      const total = 2 + lengthBytes + length + 2;
      if (buffer.length < total) return;

      const packet = buffer.subarray(0, total);
      buffer = buffer.subarray(total);

      if (!verifyPacket(packet)) {
        console.warn(`[GT06] invalid CRC/frame ${packet.toString("hex")}`);
        continue;
      }

      const protocolOffset = long ? 4 : 3;
      const protocol = packet[protocolOffset];
      const serial = packet.readUInt16BE(packet.length - 6);

      if (protocol === 0x01 && !long) {
        imei = decodeImei(packet.subarray(4, packet.length - 6));
        socket.write(buildAck(protocol, serial));
        hooks.onLogin?.(imei);
        continue;
      }

      if (!imei) {
        console.warn("[GT06] packet received before login");
        socket.destroy();
        return;
      }

      if (!long && (protocol === 0x12 || protocol === 0x22)) {
        const position = parsePosition(packet, imei);
        if (position) void hooks.onPosition?.(position);
        continue;
      }

      if (!long && protocol === 0x13) {
        socket.write(buildAck(protocol, serial));
        hooks.onHeartbeat?.(imei);
        continue;
      }

      hooks.onUnknown?.(protocol, packet.toString("hex"));
    }
  });
}
