import type {
  GpsData,
  IoValue,
  TeltonikaCodec,
  TeltonikaMessage,
  TeltonikaRecord,
} from "./types";
import { crc16Ibm } from "./crc16";

class Reader {
  private offset = 0;

  constructor(private readonly buffer: Buffer) {}

  get position() {
    return this.offset;
  }

  get remaining() {
    return this.buffer.length - this.offset;
  }

  private ensure(size: number) {
    if (this.remaining < size) {
      throw new Error(
        `Teltonika packet truncated: need ${size} bytes, only ${this.remaining} remain`,
      );
    }
  }

  u8() {
    this.ensure(1);
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  u16() {
    this.ensure(2);
    const value = this.buffer.readUInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  u32() {
    this.ensure(4);
    const value = this.buffer.readUInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  u64() {
    this.ensure(8);
    const value = this.buffer.readBigUInt64BE(this.offset);
    this.offset += 8;
    return value;
  }

  i16() {
    this.ensure(2);
    const value = this.buffer.readInt16BE(this.offset);
    this.offset += 2;
    return value;
  }

  i32() {
    this.ensure(4);
    const value = this.buffer.readInt32BE(this.offset);
    this.offset += 4;
    return value;
  }

  bytes(size: number) {
    this.ensure(size);
    const value = this.buffer.subarray(this.offset, this.offset + size);
    this.offset += size;
    return value;
  }
}

function exactUnsignedValue(raw: Buffer): number | string {
  if (raw.length === 1) {
    return raw.readUInt8(0);
  }

  if (raw.length === 2) {
    return raw.readUInt16BE(0);
  }

  if (raw.length === 4) {
    return raw.readUInt32BE(0);
  }

  if (raw.length === 8) {
    const value = raw.readBigUInt64BE(0);
    return value <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(value)
      : value.toString(10);
  }

  throw new Error(`Unsupported fixed Teltonika IO width: ${raw.length}`);
}

function fixedIoValue(id: number, size: 1 | 2 | 4 | 8, raw: Buffer): IoValue {
  return {
    id,
    value: exactUnsignedValue(raw),
    size,
    rawHex: raw.toString("hex"),
    storage: "fixed",
  };
}

function variableIoValue(id: number, raw: Buffer): IoValue {
  return {
    id,
    value: raw.toString("hex"),
    size: raw.length,
    rawHex: raw.toString("hex"),
    storage: "variable",
  };
}

function readGps(reader: Reader): GpsData {
  // Teltonika AVL GPS coordinates are signed integers in 1e-7 degrees.
  const longitude = reader.i32() / 10_000_000;
  const latitude = reader.i32() / 10_000_000;
  const altitude = reader.i16();
  const angle = reader.u16();
  const satellites = reader.u8();
  const speedKph = reader.u16();

  return {
    longitude,
    latitude,
    altitude,
    angle,
    satellites,
    speedKph,
  };
}

function readIo(
  reader: Reader,
  codec: TeltonikaCodec,
): { eventId: number; io: IoValue[] } {
  const extended = codec === 142;
  const idWidth = extended ? 2 : 1;
  const countWidth = extended ? 2 : 1;
  const values: IoValue[] = [];

  const readId = () => (idWidth === 2 ? reader.u16() : reader.u8());
  const readCount = () => (countWidth === 2 ? reader.u16() : reader.u8());

  const eventId = readId();
  const totalIoCount = readCount();
  let parsedIoCount = 0;

  const groups: Array<1 | 2 | 4 | 8> = [1, 2, 4, 8];

  for (const size of groups) {
    const count = readCount();

    for (let index = 0; index < count; index += 1) {
      const id = readId();
      const raw = reader.bytes(size);
      values.push(fixedIoValue(id, size, raw));
      parsedIoCount += 1;
    }
  }

  // Codec 8 Extended additionally supports NX variable-length IO elements.
  if (extended) {
    const variableCount = readCount();

    for (let index = 0; index < variableCount; index += 1) {
      const id = readId();
      const length = reader.u16();
      const raw = reader.bytes(length);
      values.push(variableIoValue(id, raw));
      parsedIoCount += 1;
    }
  }

  if (parsedIoCount !== totalIoCount) {
    throw new Error(
      `Teltonika IO count mismatch: header says ${totalIoCount}, parsed ${parsedIoCount}`,
    );
  }

  return { eventId, io: values };
}

function parseRecord(reader: Reader, codec: TeltonikaCodec): TeltonikaRecord {
  const timestampMs = reader.u64();
  if (timestampMs > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`Teltonika timestamp exceeds JavaScript safe integer range: ${timestampMs}`);
  }

  const priority = reader.u8();
  const gps = readGps(reader);
  const { eventId, io } = readIo(reader, codec);

  return {
    timestamp: new Date(Number(timestampMs)).toISOString(),
    priority,
    gps,
    eventId,
    io,
  };
}

export function decodeAvlPacket(packet: Buffer): TeltonikaMessage {
  if (packet.length < 12) {
    throw new Error("Teltonika AVL packet is too short");
  }

  const preamble = packet.readUInt32BE(0);
  if (preamble !== 0) {
    throw new Error("Invalid Teltonika AVL preamble");
  }

  const dataLength = packet.readUInt32BE(4);
  const expectedLength = 8 + dataLength + 4;
  if (packet.length !== expectedLength) {
    throw new Error(
      `Invalid Teltonika packet length: header says ${dataLength} bytes, received ${packet.length}`,
    );
  }

  const data = packet.subarray(8, 8 + dataLength);
  const receivedCrc = packet.readUInt32BE(8 + dataLength);
  const calculatedCrc = crc16Ibm(data);
  const crcValid = (receivedCrc & 0xffff) === calculatedCrc;

  if (!crcValid) {
    throw new Error(
      `Invalid Teltonika CRC: received ${receivedCrc.toString(16)}, expected ${calculatedCrc.toString(16)}`,
    );
  }

  const reader = new Reader(data);
  const codecByte = reader.u8();
  if (codecByte !== 8 && codecByte !== 142) {
    throw new Error(`Unsupported Teltonika Codec ID ${codecByte}`);
  }

  const codec = codecByte === 142 ? 142 : 8;
  const recordCount = reader.u8();
  const records: TeltonikaRecord[] = [];

  for (let index = 0; index < recordCount; index += 1) {
    records.push(parseRecord(reader, codec));
  }

  const recordCount2 = reader.u8();
  if (recordCount !== recordCount2) {
    throw new Error(
      `Teltonika record count mismatch: ${recordCount} != ${recordCount2}`,
    );
  }

  if (reader.remaining !== 0) {
    throw new Error(`Unexpected ${reader.remaining} bytes inside Teltonika AVL payload`);
  }

  return {
    codec,
    records,
    rawLength: packet.length,
    crcValid,
  };
}

export function decodeAvlPacketUnsafe(packet: Buffer): TeltonikaMessage {
  return decodeAvlPacket(packet);
}
