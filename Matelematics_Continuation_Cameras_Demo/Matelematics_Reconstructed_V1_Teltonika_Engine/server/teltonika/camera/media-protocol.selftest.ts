import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BoundedMediaWriter,
  CAMERA_INIT_PACKET_SIZE,
  CAMERA_MAX_FILE_SIZE,
  encodeCameraCommand,
  encodeClose,
  encodeCompleted,
  encodeFileRequest,
  encodePathRequest,
  encodeResume,
  parseCameraInitPacket,
  parseDualCamStart,
  parseFilePath,
  parseModifiedStart,
  safeMediaPath,
  tryParseCameraCommand,
} from "./media-protocol";

function initPacket(imei: string, protocolId = 5, settings = 0x0f): Buffer {
  const packet = Buffer.alloc(CAMERA_INIT_PACKET_SIZE);
  packet.writeUInt16BE(0, 0);
  packet.writeUInt16BE(protocolId, 2);
  packet.writeBigUInt64BE(BigInt(imei), 4);
  packet.writeUInt32BE(settings, 12);
  return packet;
}

async function main() {
  const imei = "352094082345678";
  assert.deepEqual(parseCameraInitPacket(initPacket(imei)), { protocolId: 5, imei, settings: 0x0f });
  assert.throws(() => parseCameraInitPacket(Buffer.alloc(15)), /16 bytes/);
  const badHeader = initPacket(imei); badHeader.writeUInt16BE(1, 0);
  assert.throws(() => parseCameraInitPacket(badHeader), /header/);

  assert.deepEqual([...encodeClose()], [0, 0, 0, 0]);
  assert.equal(encodePathRequest().readUInt16BE(0), 0x000c);
  assert.equal(encodeFileRequest("%photof").subarray(4).toString("ascii"), "%photof");
  assert.equal(encodeResume(0).readUInt32BE(4), 0);
  assert.equal(encodeCompleted().readUInt32BE(4), 0);

  const combined = Buffer.concat([
    encodeCameraCommand(0x0003, Buffer.from([0, 0, 0, 0])),
    encodeCameraCommand(0x0005, Buffer.from([0, 0, 0, 0])),
  ]);
  const first = tryParseCameraCommand(combined);
  assert(first);
  assert.equal(first.command.id, 3);
  const second = tryParseCameraCommand(first.rest);
  assert(second);
  assert.equal(second.command.id, 5);
  assert.equal(second.rest.length, 0);
  assert.equal(tryParseCameraCommand(Buffer.from([0, 4, 0])), null);

  const modified = Buffer.alloc(6);
  modified.writeUInt32BE(2048, 0); modified.writeUInt16BE(0xabcd, 4);
  assert.deepEqual(parseModifiedStart(modified), { fileSize: 2048, fileCrc: 0xabcd });
  const tooBig = Buffer.alloc(6); tooBig.writeUInt32BE(Math.min(0xffffffff, CAMERA_MAX_FILE_SIZE + 1), 0);
  assert.throws(() => parseModifiedStart(tooBig), /safety bound/);

  const dual = Buffer.alloc(6); dual.writeUInt32BE(2, 0);
  assert.deepEqual(parseDualCamStart(dual), { packetCount: 2 });
  assert.equal(parseFilePath(Buffer.from("/event/front.mp4\0", "utf8")), "/event/front.mp4");

  const root = mkdtempSync(join(tmpdir(), "matelematics-camera-"));
  try {
    const target = safeMediaPath(root, imei, "events/2026/front.bin");
    assert(target.includes(imei));
    assert.throws(() => safeMediaPath(root, imei, "../escape.bin"), /unsafe/);
    assert.throws(() => safeMediaPath(root, imei, "/../../escape.bin"), /unsafe/);

    const writer = new BoundedMediaWriter(target, 6);
    writer.write(Buffer.from("abc"));
    writer.write(Buffer.from("def"));
    await writer.finish();
    assert.equal(readFileSync(target).toString("utf8"), "abcdef");

    const overflow = safeMediaPath(root, imei, "events/overflow.bin");
    const writer2 = new BoundedMediaWriter(overflow, 2);
    assert.throws(() => writer2.write(Buffer.from("abc")), /exceeded/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }

  console.log("Teltonika Step 5C bounded camera media protocol self-test PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
