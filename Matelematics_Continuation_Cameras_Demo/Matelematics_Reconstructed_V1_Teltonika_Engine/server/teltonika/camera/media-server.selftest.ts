import assert from "node:assert/strict";
import net from "node:net";

import { encodeCameraCommand } from "./media-protocol";
import { createCameraMediaServer } from "./media-server";

function buildInitPacket(imei: string, protocolId = 5, settings = 0): Buffer {
  const packet = Buffer.alloc(16);
  packet.writeUInt16BE(0, 0);
  packet.writeUInt16BE(protocolId, 2);
  packet.writeBigUInt64BE(BigInt(imei), 4);
  packet.writeUInt32BE(settings, 12);
  return packet;
}

async function waitUntil(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("timeout waiting for condition");
}

async function connect(port: number): Promise<net.Socket> {
  return await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => resolve(socket));
    socket.once("error", reject);
  });
}

async function main() {
  const seenCommands: string[] = [];
  const disconnectReasons: string[] = [];

  const handle = createCameraMediaServer({
    host: "127.0.0.1",
    port: 0,
    idleTimeoutMs: 5_000,
    maxBufferedBytes: 4096,
    authorizeImei: (imei) => imei !== "000000000000000",
    onCommand: (session, command) => {
      seenCommands.push(`${session.imei}:${command.id}:${command.data.toString("hex")}`);
    },
    onDisconnected: (session, reason) => {
      disconnectReasons.push(`${session.imei}:${reason}`);
    },
  });

  await new Promise<void>((resolve, reject) => {
    if (handle.server.listening) return resolve();
    handle.server.once("listening", resolve);
    handle.server.once("error", reject);
  });

  const address = handle.address();
  assert(address && typeof address !== "string");
  const port = address.port;

  const imei1 = "352094082345678";
  const imei2 = "352094082345679";

  const socket1 = await connect(port);
  socket1.write(buildInitPacket(imei1).subarray(0, 7));
  socket1.write(Buffer.concat([
    buildInitPacket(imei1).subarray(7),
    encodeCameraCommand(0x0003, Buffer.from([0, 0, 0, 1])),
  ]));

  await waitUntil(() => handle.sessions.has(imei1));
  await waitUntil(() => seenCommands.length === 1);
  assert.equal(handle.sessions.size, 1);
  assert.equal(seenCommands[0], `${imei1}:3:00000001`);

  const socket2 = await connect(port);
  socket2.write(Buffer.concat([
    buildInitPacket(imei2),
    encodeCameraCommand(0x0005, Buffer.from([0, 0, 0, 0])),
  ]));

  await waitUntil(() => handle.sessions.has(imei2));
  await waitUntil(() => seenCommands.length === 2);
  assert.equal(handle.sessions.size, 2);
  assert.equal(seenCommands[1], `${imei2}:5:00000000`);

  const replacement = await connect(port);
  replacement.write(buildInitPacket(imei1));
  await waitUntil(() => handle.sessions.get(imei1)?.socket === replacement);
  await waitUntil(() => socket1.destroyed);
  assert.equal(handle.sessions.size, 2);

  const unauthorized = await connect(port);
  unauthorized.write(buildInitPacket("000000000000000"));
  await waitUntil(() => unauthorized.destroyed);
  assert.equal(handle.sessions.has("000000000000000"), false);

  replacement.destroy();
  socket2.destroy();
  await waitUntil(() => handle.sessions.size === 0);

  assert(disconnectReasons.some((entry) => entry.startsWith(`${imei1}:`)));
  assert(disconnectReasons.some((entry) => entry.startsWith(`${imei2}:`)));

  await handle.close();
  console.log("Teltonika Step 5C multi-device camera TCP server self-test PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
