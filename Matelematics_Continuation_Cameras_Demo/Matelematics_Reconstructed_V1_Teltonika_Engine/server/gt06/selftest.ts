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

function bcd(value: number): number {
  return ((Math.floor(value / 10) & 0x0f) << 4) | (value % 10);
}

function loginPacket(imei: string, serial: number): Buffer {
  return frame(0x01, Buffer.from(imei.padStart(16, "0").slice(-16), "hex"), serial);
}

function positionPacket(serial: number): Buffer {
  const info = Buffer.alloc(18);
  info[0] = bcd(26);
  info[1] = bcd(9);
  info[2] = bcd(11);
  info[3] = bcd(12);
  info[4] = bcd(34);
  info[5] = bcd(56);
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

async function main() {
  const imei = "864180070000001";
  const expectedLoginAck = buildAck(0x01, 1);
  const expectedHeartbeatAck = buildAck(0x13, 3);

  let loginSeen = "";
  let heartbeatSeen = "";
  let positionSeen: Gt06Position | null = null;

  const server = net.createServer((socket) => {
    attachGt06Protocol(socket, {
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
  assert.equal(positionSeen.speedKph, 45);
  assert.equal(positionSeen.satellites, 8);
  assert.equal(positionSeen.gpsValid, true);
  assert(Math.abs(positionSeen.latitude - 33.5731) < 0.000001);
  assert(Math.abs(positionSeen.longitude - -7.5898) < 0.000001);
  assert(allReplies.includes(expectedLoginAck));
  assert(allReplies.includes(expectedHeartbeatAck));

  client.destroy();
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log("GT06 self-test PASS");
}

main().catch((error) => {
  console.error("GT06 self-test FAIL", error);
  process.exitCode = 1;
});
