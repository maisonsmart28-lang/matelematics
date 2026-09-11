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

const host = process.env.GT06_HOST ?? "0.0.0.0";
const port = Number(process.env.GT06_PORT ?? 5023);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("GT06_PORT must be a valid TCP port");
}

const server = net.createServer((socket) => {
  socket.setKeepAlive(true, 30_000);
  socket.setNoDelay(true);
  console.log(`[GT06] TCP connection from ${socket.remoteAddress}:${socket.remotePort}`);

  attachGt06Protocol(socket, {
    onLogin: (imei) => console.log(`[GT06] login imei=${imei}`),
    onHeartbeat: (imei) => console.log(`[GT06] heartbeat imei=${imei}`),
    onUnknown: (protocol, rawHex) => console.warn(`[GT06] unknown protocol=0x${protocol.toString(16)} raw=${rawHex}`),
    onPosition: async (position) => {
      console.log(`[GT06] ${position.imei} ${position.timestamp} ${position.latitude.toFixed(6)},${position.longitude.toFixed(6)} ${position.speedKph} km/h`);
      try {
        const saved = await persistGt06Position(position);
        console.log(`[GT06] persisted device=${saved.deviceId} vehicle=${saved.vehicleId}`);
      } catch (error) {
        console.error("[GT06] persistence error:", error instanceof Error ? error.message : error);
      }
    },
  });

  socket.on("close", () => console.log("[GT06] TCP connection closed"));
  socket.on("error", (error) => console.error("[GT06] socket error:", error.message));
});

server.listen(port, host, () => {
  console.log(`[GT06] Matelematics ingestion engine listening on ${host}:${port}`);
});
