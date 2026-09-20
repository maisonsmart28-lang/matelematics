import net from "node:net";
import { crc16Ibm } from "./crc16";

type FleetProfile = "light" | "j1939";

type FleetConfig = {
  host: string;
  port: number;
  vehicles: number;
  intervalMs: number;
  connectRate: number;
  durationSeconds: number;
  profile: FleetProfile;
  dryRun: boolean;
  telemetry: boolean;
};

function intEnv(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function configFromEnv(): FleetConfig {
  const profile = (process.env.TELTONIKA_FLEET_PROFILE ?? "light").toLowerCase();
  if (profile !== "light" && profile !== "j1939") {
    throw new Error("TELTONIKA_FLEET_PROFILE must be light or j1939");
  }
  return {
    host: process.env.TELTONIKA_FLEET_HOST ?? "127.0.0.1",
    port: intEnv("TELTONIKA_FLEET_PORT", 5000, 1, 65535),
    vehicles: intEnv("TELTONIKA_FLEET_VEHICLES", 100, 1, 10_000),
    intervalMs: intEnv("TELTONIKA_FLEET_INTERVAL_MS", 3000, 250, 3_600_000),
    connectRate: intEnv("TELTONIKA_FLEET_CONNECT_RATE", 50, 1, 1000),
    durationSeconds: intEnv("TELTONIKA_FLEET_DURATION_SECONDS", 60, 1, 86_400),
    profile,
    dryRun: process.env.TELTONIKA_FLEET_DRY_RUN === "1",
    telemetry: process.env.TELTONIKA_FLEET_TELEMETRY === "1",
  };
}

function imeiFor(index: number) {
  return `9900000000${String(index).padStart(5, "0")}`;
}

function handshake(imei: string) {
  const value = Buffer.from(imei, "ascii");
  const packet = Buffer.alloc(2 + value.length);
  packet.writeUInt16BE(value.length, 0);
  value.copy(packet, 2);
  return packet;
}

function buildTelemetryPacket(index: number, sequence: number) {
  const parts: Buffer[] = [];
  const u8 = (value: number) => { const b = Buffer.alloc(1); b.writeUInt8(value); parts.push(b); };
  const u16 = (value: number) => { const b = Buffer.alloc(2); b.writeUInt16BE(value); parts.push(b); };
  const u32 = (value: number) => { const b = Buffer.alloc(4); b.writeUInt32BE(value >>> 0); parts.push(b); };
  const i32 = (value: number) => { const b = Buffer.alloc(4); b.writeInt32BE(value); parts.push(b); };
  const u64 = (value: bigint) => { const b = Buffer.alloc(8); b.writeBigUInt64BE(value); parts.push(b); };

  const latitude = 33.5731 + (index % 100) * 0.0001 + sequence * 0.00001;
  const longitude = -7.5898 + Math.floor(index / 100) * 0.0001 + sequence * 0.00002;
  const speed = 40 + ((index + sequence) % 35);
  const rpm = 1100 + ((index * 17 + sequence * 31) % 1400);

  u8(0x8e);
  u8(1);
  u64(BigInt(Date.now()));
  u8(1);
  i32(Math.round(longitude * 10_000_000));
  i32(Math.round(latitude * 10_000_000));
  u16(35);
  u16((90 + sequence * 3) % 360);
  u8(11);
  u16(speed);

  // Event ID, total IO.
  u16(239);
  u16(6);

  // N1: ignition, movement, fuel level.
  u16(3);
  u16(239); u8(1);
  u16(240); u8(1);
  u16(37); u8(70 + (index % 20));

  // N2: external voltage, RPM.
  u16(2);
  u16(66); u16(13_800);
  u16(35); u16(rpm);

  // N4: odometer metres.
  u16(1);
  u16(16); u32(120_000_000 + index * 1000 + sequence * 50);

  // N8, NX.
  u16(0);
  u16(0);
  u8(1);

  const data = Buffer.concat(parts);
  const packet = Buffer.alloc(8 + data.length + 4);
  packet.writeUInt32BE(0, 0);
  packet.writeUInt32BE(data.length, 4);
  data.copy(packet, 8);
  packet.writeUInt32BE(crc16Ibm(data), 8 + data.length);
  return packet;
}

const config = configFromEnv();
const startedAt = Date.now();
let attempted = 0;
let connected = 0;
let authenticated = 0;
let rejected = 0;
let errors = 0;
let closed = 0;
let peakOpen = 0;
let telemetrySent = 0;
let telemetryAcked = 0;
let telemetryAckErrors = 0;
let ackLatencyTotalMs = 0;
let ackLatencyMaxMs = 0;
const sockets = new Set<net.Socket>();
const timers = new Set<ReturnType<typeof setInterval>>();

function summary(reason: string) {
  const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
  console.log(JSON.stringify({
    event: "fleet-summary",
    reason,
    vehicles: config.vehicles,
    attempted,
    connected,
    authenticated,
    rejected,
    errors,
    closed,
    open: sockets.size,
    peakOpen,
    telemetrySent,
    telemetryAcked,
    telemetryAckErrors,
    telemetryPerSecond: Number((telemetryAcked / elapsedSeconds).toFixed(2)),
    avgAckLatencyMs: telemetryAcked ? Number((ackLatencyTotalMs / telemetryAcked).toFixed(2)) : 0,
    maxAckLatencyMs: Number(ackLatencyMaxMs.toFixed(2)),
    elapsedSeconds: Number(elapsedSeconds.toFixed(3)),
    connectionsPerSecond: Number((connected / elapsedSeconds).toFixed(2)),
    profile: config.profile,
    intervalMs: config.intervalMs,
  }));
}

function stop(reason: string) {
  for (const timer of timers) clearInterval(timer);
  timers.clear();
  for (const socket of sockets) socket.destroy();
  summary(reason);
  process.exitCode =
    errors > 0 ||
    rejected > 0 ||
    telemetryAckErrors > 0 ||
    (config.telemetry && telemetryAcked === 0)
      ? 1
      : 0;
}

if (config.dryRun) {
  const imeis = Array.from({ length: config.vehicles }, (_, index) => imeiFor(index));
  const unique = new Set(imeis);
  if (unique.size !== config.vehicles || imeis.some((imei) => !/^\d{15}$/.test(imei))) {
    throw new Error("Generated IMEIs are not unique 15-digit values");
  }
  console.log(JSON.stringify({
    event: "fleet-dry-run",
    ...config,
    firstImei: imeis[0],
    lastImei: imeis.at(-1),
    uniqueImeis: unique.size,
  }));
  process.exit(0);
}

console.log(JSON.stringify({ event: "fleet-start", ...config }));

const launchIntervalMs = Math.max(1, Math.ceil(1000 / config.connectRate));
const launcher = setInterval(() => {
  if (attempted >= config.vehicles) {
    clearInterval(launcher);
    return;
  }

  const index = attempted++;
  const imei = imeiFor(index);
  const socket = net.createConnection({ host: config.host, port: config.port });
  sockets.add(socket);
  peakOpen = Math.max(peakOpen, sockets.size);
  socket.setKeepAlive(true, 30_000);
  socket.setNoDelay(true);

  let authenticatedSocket = false;
  let waitingAck = false;
  let sentAt = 0;
  let sequence = 0;
  let receiveBuffer = Buffer.alloc(0);

  const sendTelemetry = () => {
    if (!config.telemetry || !authenticatedSocket || waitingAck || socket.destroyed) return;
    sequence += 1;
    waitingAck = true;
    sentAt = performance.now();
    telemetrySent += 1;
    socket.write(buildTelemetryPacket(index, sequence));
  };

  socket.once("connect", () => {
    connected++;
    socket.write(handshake(imei));
  });

  socket.on("data", (incoming) => {
    let data = incoming;
    if (!authenticatedSocket) {
      if (data.length === 0) return;
      if (data[0] !== 1) {
        rejected++;
        socket.destroy();
        return;
      }
      authenticatedSocket = true;
      authenticated++;
      data = data.subarray(1);

      if (config.telemetry) {
        sendTelemetry();
        const timer = setInterval(sendTelemetry, config.intervalMs);
        timers.add(timer);
        socket.once("close", () => {
          clearInterval(timer);
          timers.delete(timer);
        });
      }
    }

    if (data.length > 0) receiveBuffer = Buffer.concat([receiveBuffer, data]);
    while (receiveBuffer.length >= 4) {
      const accepted = receiveBuffer.readUInt32BE(0);
      receiveBuffer = receiveBuffer.subarray(4);
      if (!waitingAck || accepted !== 1) {
        telemetryAckErrors++;
        continue;
      }
      const latency = performance.now() - sentAt;
      ackLatencyTotalMs += latency;
      ackLatencyMaxMs = Math.max(ackLatencyMaxMs, latency);
      telemetryAcked++;
      waitingAck = false;
    }
  });

  socket.once("error", () => {
    errors++;
  });

  socket.once("close", () => {
    sockets.delete(socket);
    closed++;
  });
}, launchIntervalMs);

const reporter = setInterval(() => summary("progress"), 5000);
const durationTimer = setTimeout(() => {
  clearInterval(launcher);
  clearInterval(reporter);
  stop("duration-complete");
}, config.durationSeconds * 1000);

function shutdown() {
  clearTimeout(durationTimer);
  clearInterval(launcher);
  clearInterval(reporter);
  stop("signal");
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
