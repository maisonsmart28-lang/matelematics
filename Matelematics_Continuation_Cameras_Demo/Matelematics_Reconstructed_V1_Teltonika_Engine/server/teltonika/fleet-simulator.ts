import net from "node:net";

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
  };
}

function imeiFor(index: number) {
  // 15 digits, deterministic and unique for indices 0..9999.
  return `9900000000${String(index).padStart(5, "0")}`;
}

function handshake(imei: string) {
  const value = Buffer.from(imei, "ascii");
  const packet = Buffer.alloc(2 + value.length);
  packet.writeUInt16BE(value.length, 0);
  value.copy(packet, 2);
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
const sockets = new Set<net.Socket>();

function summary(reason: string) {
  const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
  const open = sockets.size;
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
    open,
    peakOpen,
    elapsedSeconds: Number(elapsedSeconds.toFixed(3)),
    connectionsPerSecond: Number((connected / elapsedSeconds).toFixed(2)),
    profile: config.profile,
    intervalMs: config.intervalMs,
  }));
}

function stop(reason: string) {
  for (const socket of sockets) socket.destroy();
  summary(reason);
  process.exitCode = errors > 0 || rejected > 0 ? 1 : 0;
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

  socket.once("connect", () => {
    connected++;
    socket.write(handshake(imei));
  });

  let authPending = true;
  socket.on("data", (data) => {
    if (!authPending || data.length === 0) return;
    authPending = false;
    if (data[0] === 1) authenticated++;
    else {
      rejected++;
      socket.destroy();
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
