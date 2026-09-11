import assert from "node:assert/strict";

import { getAvlDefinition } from "./avl/catalog";
import {
  exactUnsignedDecimal,
  interpretAvlValue,
} from "./avl/value";
import { decodeAvlPacket } from "./codec8";
import { crc16Ibm } from "./crc16";

function u8(value: number) {
  return Buffer.from([value & 0xff]);
}

function u16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value, 0);
  return buffer;
}

function u32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

function i16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeInt16BE(value, 0);
  return buffer;
}

function i32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}

function u64(value: bigint) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(value, 0);
  return buffer;
}

function packet(data: Buffer) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(0, 0);
  header.writeUInt32BE(data.length, 4);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc16Ibm(data), 0);

  return Buffer.concat([header, data, crc]);
}

function gps() {
  return Buffer.concat([
    i32(-75_898_432),
    i32(335_731_100),
    i16(-12),
    u16(90),
    u8(10),
    u16(42),
  ]);
}

function buildCodec8ExtendedPacket() {
  const vin = Buffer.from("WVWZZZ1KZAW123456", "ascii");
  assert.equal(vin.length, 17);

  const record = Buffer.concat([
    u64(1_700_000_000_000n),
    u8(1),
    gps(),

    // Event IO ID, total IO count.
    u16(325),
    u16(4),

    // N1.
    u16(1),
    u16(239),
    u8(1),

    // N2: raw 0xFFF6 must remain exact on the wire; the catalog later
    // interprets it as signed -10 * 0.1 = -1.0 C.
    u16(1),
    u16(115),
    Buffer.from([0xff, 0xf6]),

    // N4.
    u16(0),

    // N8: deliberately above Number.MAX_SAFE_INTEGER.
    u16(1),
    u16(500),
    u64(9_007_199_254_740_993n),

    // NX: 17-byte ASCII VIN.
    u16(1),
    u16(325),
    u16(vin.length),
    vin,
  ]);

  const data = Buffer.concat([
    u8(0x8e),
    u8(1),
    record,
    u8(1),
  ]);

  return packet(data);
}

function buildCodec8Packet() {
  const record = Buffer.concat([
    u64(1_700_000_000_000n),
    u8(0),
    gps(),
    u8(239),
    u8(1),

    // N1.
    u8(1),
    u8(239),
    u8(1),

    // N2, N4, N8.
    u8(0),
    u8(0),
    u8(0),
  ]);

  const data = Buffer.concat([
    u8(0x08),
    u8(1),
    record,
    u8(1),
  ]);

  return packet(data);
}

const extended = decodeAvlPacket(buildCodec8ExtendedPacket());
assert.equal(extended.codec, 142);
assert.equal(extended.crcValid, true);
assert.equal(extended.records.length, 1);

const extendedRecord = extended.records[0];
assert.equal(extendedRecord.gps.longitude, -7.5898432);
assert.equal(extendedRecord.gps.latitude, 33.57311);
assert.equal(extendedRecord.gps.altitude, -12);
assert.equal(extendedRecord.eventId, 325);
assert.equal(extendedRecord.io.length, 4);

const ignition = extendedRecord.io.find((item) => item.id === 239);
assert.ok(ignition);
assert.equal(ignition.value, 1);
assert.equal(ignition.rawHex, "01");
assert.equal(ignition.size, 1);
assert.equal(ignition.storage, "fixed");

const coolant = extendedRecord.io.find((item) => item.id === 115);
assert.ok(coolant);
assert.equal(coolant.value, 65_526);
assert.equal(coolant.rawHex, "fff6");
const coolantDefinition = getAvlDefinition("fmc150_can_chip", 115);
assert.ok(coolantDefinition);
assert.equal(interpretAvlValue(coolant, coolantDefinition), -1);

const wide = extendedRecord.io.find((item) => item.id === 500);
assert.ok(wide);
assert.equal(wide.value, "9007199254740993");
assert.equal(wide.rawHex, "0020000000000001");
assert.equal(wide.size, 8);
assert.equal(wide.storage, "fixed");
assert.equal(exactUnsignedDecimal(wide), "9007199254740993");

const vin = extendedRecord.io.find((item) => item.id === 325);
assert.ok(vin);
assert.equal(vin.size, 17);
assert.equal(vin.storage, "variable");
assert.equal(vin.rawHex, Buffer.from("WVWZZZ1KZAW123456", "ascii").toString("hex"));
const vinDefinition = getAvlDefinition("fmc150_can_chip", 325);
assert.ok(vinDefinition);
assert.equal(interpretAvlValue(vin, vinDefinition), "WVWZZZ1KZAW123456");

const classic = decodeAvlPacket(buildCodec8Packet());
assert.equal(classic.codec, 8);
assert.equal(classic.crcValid, true);
assert.equal(classic.records.length, 1);
assert.equal(classic.records[0].io.length, 1);
assert.equal(classic.records[0].io[0].id, 239);
assert.equal(classic.records[0].io[0].value, 1);
assert.equal(classic.records[0].io[0].rawHex, "01");

console.log("Teltonika Step 5A Codec 8/8E fidelity self-test PASS");
