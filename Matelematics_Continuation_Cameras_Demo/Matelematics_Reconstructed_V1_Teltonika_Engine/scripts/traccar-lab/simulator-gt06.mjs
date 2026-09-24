import net from "node:net";

const host = process.env.GT06_SIM_HOST ?? "127.0.0.1";
const port = Number(process.env.GT06_SIM_PORT ?? "5023");
const imei = process.env.GT06_SIM_IMEI ?? "864180070000001";
const intervalMs = Number(process.env.GT06_SIM_INTERVAL_MS ?? "5000");
let serial = 1;
let latitude = Number(process.env.GT06_SIM_LAT ?? "33.5731");
let longitude = Number(process.env.GT06_SIM_LON ?? "-7.5898");

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("GT06_SIM_PORT must be a valid TCP port");
if (!/^\d{15,16}$/.test(imei)) throw new Error("GT06_SIM_IMEI must contain 15 or 16 digits");
if (!Number.isInteger(intervalMs) || intervalMs < 1000 || intervalMs > 300000) {
  throw new Error("GT06_SIM_INTERVAL_MS must be from 1000 to 300000");
}

function validateCoordinates() {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error("GT06_SIM_LAT must be between -90 and 90");
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("GT06_SIM_LON must be between -180 and 180");
}

function crc16X25(data) {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0x8408 : crc >>> 1;
  }
  return (~crc) & 0xffff;
}

function bcd(value) {
  return ((Math.floor(value / 10) & 0x0f) << 4) | (value % 10);
}

function frame(protocol, info, currentSerial) {
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

function loginPacket() {
  const digits = imei.padStart(16, "0").slice(-16);
  return frame(0x01, Buffer.from(digits, "hex"), serial++);
}

function positionPacket() {
  validateCoordinates();
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

function heartbeatPacket() {
  return frame(0x13, Buffer.from([0x44, 0x04, 0x03, 0x00, 0x01]), serial++);
}

if (process.argv.includes("--selftest")) {
  const packet = loginPacket();
  if (packet.readUInt16BE(0) !== 0x7878 || packet[3] !== 0x01 || packet.subarray(-2).toString("hex") !== "0d0a") {
    throw new Error("GT06 login packet selftest failed");
  }
  const checksumOffset = packet.length - 4;
  if (packet.readUInt16BE(checksumOffset) !== crc16X25(packet.subarray(2, checksumOffset))) {
    throw new Error("GT06 login CRC selftest failed");
  }
  console.log("GT06 packet construction selftest PASS (not a Traccar interoperability test)");
  process.exit(0);
}

const socket = net.createConnection({ host, port }, () => {
  console.log(`[GT06 simulator] connected to ${host}:${port}; synthetic IMEI=${imei}`);
  socket.write(loginPacket());
  setTimeout(() => socket.write(positionPacket()), 500);
  setInterval(() => {
    latitude += 0.0001;
    longitude += 0.0001;
    socket.write(positionPacket());
  }, intervalMs);
  setInterval(() => socket.write(heartbeatPacket()), 30000);
});

socket.on("data", (data) => console.log(`[GT06 simulator] server ACK/data=${data.toString("hex")}`));
socket.on("error", (error) => {
  console.error(`[GT06 simulator] ${error.message}`);
  process.exitCode = 1;
});
socket.on("close", () => console.log("[GT06 simulator] disconnected"));
