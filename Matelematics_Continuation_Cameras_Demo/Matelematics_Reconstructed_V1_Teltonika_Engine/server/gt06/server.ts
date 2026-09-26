import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { attachGt06Protocol } from "./protocol";
import { persistGt06Position } from "./storage";

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnv();

const host = process.env.GT06_HOST ?? "127.0.0.1";
const allowedImei = process.env.GT06_TEST_IMEI ?? "864180070000001";
const writeEnabled = process.env.GT06_ENABLE_TEST_WRITES === "I_ACCEPT_TEST_ONLY_WRITES";
if (!/^\d{15,16}$/.test(allowedImei)) throw new Error("GT06_TEST_IMEI must be a synthetic 15-16 digit identifier");
if (writeEnabled && !["127.0.0.1", "localhost", "::1"].includes(host)) throw new Error("GT06 test writes require loopback binding");
const port = Number(process.env.GT06_PORT ?? 5024);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("GT06_PORT must be a valid TCP port");
}

const server = net.createServer((socket) => {
  socket.setKeepAlive(true, 30_000);
  socket.setNoDelay(true);
  console.log("[GT06] TCP connection");

  attachGt06Protocol(socket, {
    onLogin: (imei) => {
      if (imei !== allowedImei) { socket.destroy(); return; }
      console.log("[GT06] synthetic device login");
    },
    onHeartbeat: (imei) => { if (imei === allowedImei) console.log("[GT06] synthetic heartbeat"); },
    onUnknown: (protocol) => console.warn(`[GT06] unknown protocol=0x${protocol.toString(16)}`),
    onPosition: async (position) => {
      if (position.imei !== allowedImei || !position.gpsValid) return;
      console.log(`[GT06] valid synthetic GPS timestamp=${position.timestamp} mode=${writeEnabled ? "test-write" : "dry-run"}`);
      if (!writeEnabled) return;
      try {
        const saved = await persistGt06Position(position);
        console.log(`[GT06] persisted test device=${saved.deviceId} vehicle=${saved.vehicleId}`);
      } catch (error) {
        console.error("[GT06] persistence error:", error instanceof Error ? error.message : error);
      }
    },
  });

  socket.on("close", () => console.log("[GT06] TCP connection closed"));
  socket.on("error", (error) => console.error("[GT06] socket error:", error.message));
});

server.listen(port, host, () => {
  console.log(`[GT06] Matelematics ingestion engine listening on ${host}:${port} (${writeEnabled ? "test-write" : "dry-run"}; one synthetic IMEI)`);
});
