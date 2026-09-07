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

function readIo(reader: Reader, codec: TeltonikaCodec): { eventId: number; io: IoValue[] } {
  const extended = codec === 142;
  const idWidth = extended ? 2 : 1;
  const countWidth = extended ? 2 : 1;
  const values: IoValue[] = [];

  const readId = () => (idWidth === 2 ? reader.u16() : reader.u8());
  const readCount = () => (countWidth === 2 ? reader.u16() : reader.u8());

  const eventId = readId();
  readCount(); // total IO count; group counts follow.

  const groups: Array<1 | 2 | 4 | 8> = [1, 2, 4, 8];

  for (const size of groups) {
    const count = readCount();

    for (let index = 0; index < count; index += 1) {
      const id = readId();
      let value: number;

      if (size === 1) value = reader.u8();
      else if (size === 2) value = reader.u16();
      else if (size === 4) value = reader.u32();
      else {
        const raw = reader.u64();
        const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
        value = raw <= maxSafe ? Number(raw) : Number(raw % (maxSafe + 1n));
      }

      values.push({ id, value, size });
    }
  }

  // Codec 8 Extended additionally supports variable-length IO elements (NX).
  if (extended) {
    const variableCount = readCount();

    for (let index = 0; index < variableCount; index += 1) {
      const id = readId();
      const length = reader.u16();
      const raw = reader.bytes(length);
      values.push({ id, value: raw.toString("hex"), size: 8 });
    }
  }

  return { eventId, io: values };
}

function parseRecord(reader: Reader, codec: TeltonikaCodec): TeltonikaRecord {
  const timestampMs = reader.u64();
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
