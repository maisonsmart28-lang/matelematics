import net from "node:net";
import { crc16X25 } from "./crc16";

const host = process.env.GT06_SIM_HOST ?? "127.0.0.1";
const port = Number(process.env.GT06_SIM_PORT ?? process.env.GT06_PORT ?? 5023);
const imei = process.env.GT06_SIM_IMEI ?? "864180070000001";
const intervalMs = Number(process.env.GT06_SIM_INTERVAL_MS ?? 5000);
let serial = 1;
let latitude = Number(process.env.GT06_SIM_LAT ?? 33.5731);
let longitude = Number(process.env.GT06_SIM_LON ?? -7.5898);

function bcd(value: number): number {
  return ((Math.floor(value / 10) & 0x0f) << 4) | (value % 10);
}

function frame(protocol: number, info: Buffer, currentSerial: number): Buffer {
  const length = 1 + info.length + 2 + 2;
  const packet = Buffer.alloc(2 + 1 + length + 2);
  packet.writeUInt16BE(0x7878, 0);
  packet[2] = length;
  packet[3] = protocol;
  info.copy(packet, 4);
  const serialOffset = 4 + info.length;
  packet.writeUInt16BE(currentSerial & 0xffff, serialOffset);
  packet.writeUInt16BE(crc16X25(packet.subarray(2, serialOffset + 2)), serialOffset + 2);
  packet.writeUInt16BE(0x0d0a, serialOffset + 4);
  return packet;
}

function loginPacket(): Buffer {
  const digits = imei.padStart(16, "0").slice(-16);
  return frame(0x01, Buffer.from(digits, "hex"), serial++);
}

function positionPacket(): Buffer {
  const now = new Date();
  const info = Buffer.alloc(18);
  info[0] = bcd(now.getUTCFullYear() % 100);
  info[1] = bcd(now.getUTCMonth() + 1);
  info[2] = bcd(now.getUTCDate());
  info[3] = bcd(now.getUTCHours());
  info[4] = bcd(now.getUTCMinutes());
  info[5] = bcd(now.getUTCSeconds());
  info[6] = 0xc8;
  info.writeUInt32BE(Math.round(Math.abs(latitude) * 1800000), 7);
  info.writeUInt32BE(Math.round(Math.abs(longitude) * 1800000), 11);
  info[15] = 45;
  let courseStatus = 90 | 0x1000;
  if (latitude >= 0) courseStatus |= 0x0400;
  if (longitude < 0) courseStatus |= 0x0800;
  info.writeUInt16BE(courseStatus, 16);
  return frame(0x12, info, serial++);
}

function heartbeatPacket(): Buffer {
  return frame(0x13, Buffer.from([0x44, 0x04, 0x03, 0x00, 0x01]), serial++);
}

const socket = net.createConnection({ host, port }, () => {
  console.log(`[GT06 simulator] connected to ${host}:${port} imei=${imei}`);
  socket.write(loginPacket());

  setTimeout(() => {
    socket.write(positionPacket());
  }, 500);

  setInterval(() => {
    latitude += 0.0001;
    longitude += 0.0001;
    socket.write(positionPacket());
  }, intervalMs);

  setInterval(() => socket.write(heartbeatPacket()), 30_000);
});

socket.on("data", (data) => console.log(`[GT06 simulator] server=${data.toString("hex")}`));
socket.on("error", (error) => console.error("[GT06 simulator] error:", error.message));
socket.on("close", () => console.log("[GT06 simulator] disconnected"));
