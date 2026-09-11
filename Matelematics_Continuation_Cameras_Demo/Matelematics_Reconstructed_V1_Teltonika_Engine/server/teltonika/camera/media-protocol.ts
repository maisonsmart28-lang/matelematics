import { createWriteStream, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

export const CAMERA_INIT_PACKET_SIZE = 16;
export const CAMERA_COMMAND_HEADER_SIZE = 4;
export const CAMERA_MAX_COMMAND_DATA = 0x0402;
export const CAMERA_MAX_FILE_SIZE = 256 * 1024 * 1024;
export const CAMERA_MAX_PATH_LENGTH = 512;

export type CameraProtocolFamily = "dualcam" | "modified";

export type CameraInitPacket = {
  protocolId: number;
  imei: string;
  settings: number;
};

export type CameraCommand = {
  id: number;
  data: Buffer;
};

export function parseCameraInitPacket(packet: Buffer): CameraInitPacket {
  if (packet.length !== CAMERA_INIT_PACKET_SIZE) {
    throw new Error(`camera init packet must be ${CAMERA_INIT_PACKET_SIZE} bytes`);
  }
  if (packet.readUInt16BE(0) !== 0x0000) throw new Error("invalid camera init header");

  const protocolId = packet.readUInt16BE(2);
  const imeiBig = packet.readBigUInt64BE(4);
  const imei = imeiBig.toString(10);
  if (!/^\d{10,20}$/.test(imei)) throw new Error("invalid camera IMEI");

  return { protocolId, imei, settings: packet.readUInt32BE(12) };
}

export function encodeCameraCommand(id: number, data: Buffer = Buffer.alloc(0)): Buffer {
  if (!Number.isInteger(id) || id < 0 || id > 0xffff) throw new Error("invalid camera command id");
  if (data.length > 0xffff) throw new Error("camera command payload too large");
  const out = Buffer.alloc(CAMERA_COMMAND_HEADER_SIZE + data.length);
  out.writeUInt16BE(id, 0);
  out.writeUInt16BE(data.length, 2);
  data.copy(out, 4);
  return out;
}

export function tryParseCameraCommand(buffer: Buffer): { command: CameraCommand; rest: Buffer } | null {
  if (buffer.length < CAMERA_COMMAND_HEADER_SIZE) return null;
  const id = buffer.readUInt16BE(0);
  const length = buffer.readUInt16BE(2);
  if (length > CAMERA_MAX_COMMAND_DATA && id === 0x0004) throw new Error("camera DATA command exceeds protocol bound");
  if (length > CAMERA_MAX_PATH_LENGTH && id === 0x000d) throw new Error("camera path exceeds protocol bound");
  if (buffer.length < CAMERA_COMMAND_HEADER_SIZE + length) return null;
  return {
    command: { id, data: buffer.subarray(4, 4 + length) },
    rest: buffer.subarray(4 + length),
  };
}

export function encodePathRequest(): Buffer {
  const data = Buffer.alloc(2);
  return encodeCameraCommand(0x000c, data);
}

export function encodeFileRequest(identifier?: string): Buffer {
  return encodeCameraCommand(0x0008, identifier ? Buffer.from(identifier, "ascii") : Buffer.alloc(0));
}

export function encodeResume(offset: number): Buffer {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 0xffffffff) throw new Error("invalid camera resume offset");
  const data = Buffer.alloc(4);
  data.writeUInt32BE(offset, 0);
  return encodeCameraCommand(0x0002, data);
}

export function encodeCompleted(status = 0): Buffer {
  const data = Buffer.alloc(4);
  data.writeUInt32BE(status >>> 0, 0);
  return encodeCameraCommand(0x0005, data);
}

export function encodeClose(): Buffer {
  return encodeCameraCommand(0x0000);
}

export function parseModifiedStart(data: Buffer): { fileSize: number; fileCrc: number } {
  if (data.length !== 6) throw new Error("invalid modified START payload");
  const fileSize = data.readUInt32BE(0);
  const fileCrc = data.readUInt16BE(4);
  if (fileSize <= 0 || fileSize > CAMERA_MAX_FILE_SIZE) throw new Error("camera file size outside safety bound");
  return { fileSize, fileCrc };
}

export function parseDualCamStart(data: Buffer): { packetCount: number } {
  if (data.length !== 6) throw new Error("invalid DualCam START payload");
  const packetCount = data.readUInt32BE(0);
  if (packetCount <= 0 || packetCount > Math.ceil(CAMERA_MAX_FILE_SIZE / 1024)) {
    throw new Error("camera packet count outside safety bound");
  }
  return { packetCount };
}

export function parseFilePath(data: Buffer): string {
  if (data.length < 1 || data.length > CAMERA_MAX_PATH_LENGTH) throw new Error("invalid camera path length");
  const nul = data.indexOf(0);
  const raw = data.subarray(0, nul >= 0 ? nul : data.length).toString("utf8");
  if (!raw || raw.includes("\0")) throw new Error("invalid camera path");
  return raw;
}

export function safeMediaPath(root: string, imei: string, remotePath: string): string {
  if (!/^\d{10,20}$/.test(imei)) throw new Error("invalid camera IMEI");
  const cleaned = remotePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.split("/").some((part) => part === ".." || part === "." || part === "")) {
    throw new Error("unsafe camera media path");
  }
  const base = resolve(root, imei);
  const target = resolve(base, cleaned);
  if (target !== base && !target.startsWith(base + sep)) throw new Error("camera media path escaped storage root");
  return target;
}

export class BoundedMediaWriter {
  private readonly stream;
  private written = 0;
  private closed = false;

  constructor(public readonly path: string, public readonly expectedBytes: number) {
    if (!Number.isSafeInteger(expectedBytes) || expectedBytes <= 0 || expectedBytes > CAMERA_MAX_FILE_SIZE) {
      throw new Error("invalid expected camera file size");
    }
    mkdirSync(dirname(path), { recursive: true });
    this.stream = createWriteStream(path, { flags: "wx" });
  }

  get bytesWritten(): number {
    return this.written;
  }

  write(chunk: Buffer): void {
    if (this.closed) throw new Error("camera media writer already closed");
    if (this.written + chunk.length > this.expectedBytes || this.written + chunk.length > CAMERA_MAX_FILE_SIZE) {
      this.abort();
      throw new Error("camera media exceeded declared or safety size");
    }
    this.stream.write(chunk);
    this.written += chunk.length;
  }

  async finish(): Promise<void> {
    if (this.closed) throw new Error("camera media writer already closed");
    if (this.written !== this.expectedBytes) {
      this.abort();
      throw new Error(`camera media incomplete: ${this.written}/${this.expectedBytes}`);
    }
    this.closed = true;
    await new Promise<void>((resolvePromise, reject) => {
      this.stream.once("error", reject);
      this.stream.end(resolvePromise);
    });
  }

  abort(): void {
    if (!this.closed) {
      this.closed = true;
      this.stream.destroy();
    }
    try { rmSync(this.path, { force: true }); } catch { /* best effort */ }
  }
}
