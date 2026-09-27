import assert from "node:assert/strict";
import net from "node:net";
import { attachGt06Protocol, buildAck, type Gt06Position } from "./protocol";
import { crc16X25 } from "./crc16";

function frame(protocol: number, info: Buffer, serial: number): Buffer {
  const length = 1 + info.length + 2 + 2;
  const packet = Buffer.alloc(2 + 1 + length + 2);
  packet.writeUInt16BE(0x7878, 0);
  packet[2] = length;
  packet[3] = protocol;
  info.copy(packet, 4);
  const serialOffset = 4 + info.length;
  packet.writeUInt16BE(serial & 0xffff, serialOffset);
  packet.writeUInt16BE(
    crc16X25(packet.subarray(2, serialOffset + 2)),
    serialOffset + 2,
  );
  packet.writeUInt16BE(0x0d0a, serialOffset + 4);
  return packet;
}

function loginPacket(imei: string, serial: number): Buffer {
  return frame(0x01, Buffer.from(imei.padStart(16, "0").slice(-16), "hex"), serial);
}

function positionPacket(serial: number): Buffer {
  const info = Buffer.alloc(18);
  info[0] = 26;
  info[1] = 9;
  info[2] = 11;
  info[3] = 12;
  info[4] = 34;
  info[5] = 56;
  info[6] = 0xc8;
  info.writeUInt32BE(Math.round(33.5731 * 1_800_000), 7);
  info.writeUInt32BE(Math.round(7.5898 * 1_800_000), 11);
  info[15] = 45;
  info.writeUInt16BE(90 | 0x1000 | 0x0400 | 0x0800, 16);
  return frame(0x12, info, serial);
}

function heartbeatPacket(serial: number): Buffer {
  return frame(0x13, Buffer.from([0x44, 0x04, 0x03, 0x00, 0x01]), serial);
}

async function expectRejected(packet: Buffer, label: string): Promise<void> {
  const listener = net.createServer((socket) => {
    attachGt06Protocol(socket, { acceptLogin: (imei) => imei === "864180070000001" });
  });
  await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const address = listener.address();
  assert(address && typeof address === "object");
  const peer = net.createConnection({ host: "127.0.0.1", port: address.port });
  const replies: Buffer[] = [];
  peer.on("data", (data) => replies.push(data));
  try {
    await new Promise<void>((resolve, reject) => {
      peer.once("connect", resolve);
      peer.once("error", reject);
    });
    peer.write(packet);
    await Promise.race([
      new Promise<void>((resolve) => peer.once("close", () => resolve())),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label}: connection not closed`)), 2000)),
    ]);
    assert.equal(Buffer.concat(replies).length, 0, `${label}: unauthorized ACK`);
  } finally {
    peer.destroy();
    await new Promise<void>((resolve) => listener.close(() => resolve()));
  }
}

async function expectRecoveryAfterCorruption(): Promise<void> {
  const imei = "864180070000001";
  const positions: Gt06Position[] = [];
  let logins = 0;
  const listener = net.createServer((socket) => {
    attachGt06Protocol(socket, {
      acceptLogin: (value) => value === imei,
      onLogin: () => { logins += 1; },
      onPosition: (position) => { positions.push(position); },
    });
  });
  await new Promise<void>((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const address = listener.address();
  assert(address && typeof address === "object");

  async function connect(): Promise<net.Socket> {
    const peer = net.createConnection({ host: "127.0.0.1", port: address.port });
    await new Promise<void>((resolve, reject) => {
      peer.once("connect", resolve);
      peer.once("error", reject);
    });
    return peer;
  }

  async function waitForPositions(count: number): Promise<void> {
    const deadline = Date.now() + 2_000;
    while (positions.length < count && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(positions.length, count, "expected valid GT06 position did not arrive");
  }

  let first: net.Socket | undefined;
  let second: net.Socket | undefined;
  try {
    first = await connect();
    const login = loginPacket(imei, 10);
    first.write(login.subarray(0, 2));
    await new Promise((resolve) => setTimeout(resolve, 15));
    assert.equal(logins, 0, "partial login must not be accepted");
    first.write(login.subarray(2));

    const corrupt = Buffer.from(positionPacket(11));
    corrupt[corrupt.length - 4] ^= 0x01;
    first.write(Buffer.concat([corrupt, positionPacket(12)]));
    await waitForPositions(1);
    assert.equal(logins, 1);
    assert.deepEqual(positions.map((position) => position.serial), [12], "bad CRC must not yield a position");

    first.destroy();
    second = await connect();
    second.write(Buffer.concat([loginPacket(imei, 13), positionPacket(14)]));
    await waitForPositions(2);
    assert.equal(logins, 2, "reconnect must require a new login");
    assert.deepEqual(positions.map((position) => position.serial), [12, 14]);
  } finally {
    first?.destroy();
    second?.destroy();
    await new Promise<void>((resolve) => listener.close(() => resolve()));
  }
}

async function main() {
  const imei = "864180070000001";
  const expectedLoginAck = buildAck(0x01, 1);
  const expectedHeartbeatAck = buildAck(0x13, 3);

  let loginSeen = "";
  let heartbeatSeen = "";
  let positionSeen: Gt06Position | null = null;

  const server = net.createServer((socket) => {
    attachGt06Protocol(socket, {
      acceptLogin: (value) => value === imei,
      onLogin: (value) => {
        loginSeen = value;
      },
      onPosition: (position) => {
        positionSeen = position;
      },
      onHeartbeat: (value) => {
        heartbeatSeen = value;
      },
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object");

  const client = net.createConnection({ host: "127.0.0.1", port: address.port });
  const replies: Buffer[] = [];
  client.on("data", (chunk) => replies.push(Buffer.from(chunk)));

  await new Promise<void>((resolve, reject) => {
    client.once("connect", resolve);
    client.once("error", reject);
  });

  client.write(loginPacket(imei, 1));
  client.write(positionPacket(2));
  client.write(heartbeatPacket(3));

  await new Promise((resolve) => setTimeout(resolve, 150));

  const allReplies = Buffer.concat(replies);
  assert.equal(loginSeen, imei);
  assert.equal(heartbeatSeen, imei);
  assert(positionSeen);
  assert.equal(positionSeen.imei, imei);
  assert.equal(positionSeen.protocol, 0x12);
  assert.equal(positionSeen.serial, 2);
  assert.equal(positionSeen.timestamp, "2026-09-11T12:34:56.000Z");
  assert.equal(positionSeen.speedKph, 45);
  assert.equal(positionSeen.satellites, 8);
  assert.equal(positionSeen.gpsValid, true);
  assert(Math.abs(positionSeen.latitude - 33.5731) < 0.000001);
  assert(Math.abs(positionSeen.longitude - -7.5898) < 0.000001);
  assert(allReplies.includes(expectedLoginAck));
  assert(allReplies.includes(expectedHeartbeatAck));

  await expectRejected(loginPacket("864180070000002", 7), "unknown IMEI");
  await expectRejected(Buffer.alloc(5000, 0x78), "oversized stream");
  await expectRejected(Buffer.from([0x78, 0x78, 0, 0x01, 0]), "short declared frame");
  await expectRecoveryAfterCorruption();

  client.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log("GT06 self-test PASS");
}

main().catch((error) => {
  console.error("GT06 self-test FAIL", error);
  process.exitCode = 1;
});
