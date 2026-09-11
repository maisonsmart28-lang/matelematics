import assert from "node:assert/strict";
import net from "node:net";

import { registerDevice } from "../registry";
import { createRegisteredCameraMediaIntegration, type CameraEventInput, type CameraPersistence, type VideoClipInput } from "./integration";
import { encodeCameraCommand } from "./media-protocol";

function buildInitPacket(imei: string, protocolId = 5, settings = 0): Buffer {
  const packet = Buffer.alloc(16);
  packet.writeUInt16BE(0, 0);
  packet.writeUInt16BE(protocolId, 2);
  packet.writeBigUInt64BE(BigInt(imei), 4);
  packet.writeUInt32BE(settings, 12);
  return packet;
}

async function waitUntil(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
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

async function waitForClose(socket: net.Socket, timeoutMs = 3000): Promise<void> {
  if (socket.closed) return;
  await Promise.race([
    new Promise<void>((resolve) => socket.once("close", () => resolve())),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error("timeout waiting for socket close")), timeoutMs)),
  ]);
}

async function main() {
  const imei = "352094082345681";
  const noCameraImei = "352094082345682";
  const unknownImei = "352094082345683";
  const companyId = "00000000-0000-0000-0000-000000000101";
  const vehicleId = "00000000-0000-0000-0000-000000000201";
  const cameraId = "00000000-0000-0000-0000-000000000301";

  registerDevice({ imei, clientId: companyId, vehicleId, label: "FMC650 camera gateway" });
  registerDevice({ imei: noCameraImei, clientId: companyId, vehicleId, label: "FMC650 camera gateway" });

  const events: CameraEventInput[] = [];
  const clips: VideoClipInput[] = [];
  const seen: Array<{ cameraId: string; seenAt: string }> = [];

  const persistence: CameraPersistence = {
    async findActiveCamera(input) {
      if (input.deviceIdentifier !== imei) return null;
      assert.equal(input.companyId, companyId);
      assert.equal(input.vehicleId, vehicleId);
      return {
        cameraId,
        companyId,
        vehicleId,
        deviceIdentifier: imei,
        status: "active",
        model: "Teltonika camera",
      };
    },
    async markCameraSeen(id, seenAt) {
      seen.push({ cameraId: id, seenAt });
    },
    async createCameraEvent(input) {
      events.push(input);
      return { id: `event-${events.length}` };
    },
    async createVideoClip(input) {
      clips.push(input);
      return { id: `clip-${clips.length}` };
    },
  };

  const commands: number[] = [];
  const integration = createRegisteredCameraMediaIntegration({
    persistence,
    host: "127.0.0.1",
    port: 0,
    idleTimeoutMs: 5_000,
    maxBufferedBytes: 4096,
    onCommand: (_session, command) => {
      commands.push(command.id);
    },
  });

  await new Promise<void>((resolve, reject) => {
    if (integration.server.server.listening) return resolve();
    integration.server.server.once("listening", resolve);
    integration.server.server.once("error", reject);
  });

  const address = integration.server.address();
  assert(address && typeof address !== "string");
  const port = address.port;

  const unknown = await connect(port);
  const unknownClosed = waitForClose(unknown);
  unknown.write(buildInitPacket(unknownImei));
  await unknownClosed;
  assert.equal(integration.server.sessions.has(unknownImei), false);

  const noCamera = await connect(port);
  const noCameraClosed = waitForClose(noCamera);
  noCamera.write(buildInitPacket(noCameraImei));
  await noCameraClosed;
  assert.equal(integration.server.sessions.has(noCameraImei), false);

  const socket = await connect(port);
  socket.write(Buffer.concat([
    buildInitPacket(imei, 5, 7),
    encodeCameraCommand(0x0003, Buffer.from([0, 0, 0, 1])),
  ]));

  await waitUntil(() => integration.server.sessions.has(imei));
  await waitUntil(() => commands.length === 1);
  await waitUntil(() => events.some((event) => event.eventType === "camera_connected"));

  assert.equal(integration.bindings.get(imei)?.cameraId, cameraId);
  assert.equal(commands[0], 0x0003);
  assert(seen.length >= 2);

  const clip = await integration.recordVideoClip({
    imei,
    storagePath: `${companyId}/${vehicleId}/2026/09/11/test.mp4`,
    mimeType: "video/mp4",
    durationSeconds: 12.5,
    status: "ready",
    metadata: { source: "step5c-selftest" },
  });

  assert.equal(clip.id, "clip-1");
  assert.equal(clips.length, 1);
  assert.equal(clips[0].companyId, companyId);
  assert.equal(clips[0].vehicleId, vehicleId);
  assert.equal(clips[0].cameraId, cameraId);

  await assert.rejects(
    () => integration.recordVideoClip({ imei, storagePath: "../escape.mp4" }),
    /safe relative object path/,
  );

  const socketClosed = waitForClose(socket);
  socket.destroy();
  await socketClosed;
  await waitUntil(() => !integration.bindings.has(imei));
  await waitUntil(() => events.some((event) => event.eventType === "camera_disconnected"));

  await integration.server.close();

  assert.equal(events.filter((event) => event.eventType === "camera_connected").length, 1);
  assert.equal(events.filter((event) => event.eventType === "camera_disconnected").length, 1);
  console.log("Teltonika Step 5C camera registry/Supabase integration self-test PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
