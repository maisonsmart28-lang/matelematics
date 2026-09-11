import net from "node:net";

import {
  CAMERA_INIT_PACKET_SIZE,
  parseCameraInitPacket,
  tryParseCameraCommand,
  type CameraCommand,
  type CameraInitPacket,
} from "./media-protocol";

export type CameraMediaSession = {
  imei: string;
  init: CameraInitPacket;
  socket: net.Socket;
  connectedAt: number;
  lastActivityAt: number;
};

export type CameraMediaServerOptions = {
  host?: string;
  port?: number;
  idleTimeoutMs?: number;
  maxBufferedBytes?: number;
  authorizeImei?: (imei: string, init: CameraInitPacket) => boolean | Promise<boolean>;
  onAuthenticated?: (session: CameraMediaSession) => void | Promise<void>;
  onCommand?: (session: CameraMediaSession, command: CameraCommand) => void | Promise<void>;
  onDisconnected?: (session: CameraMediaSession, reason: string) => void | Promise<void>;
};

export type CameraMediaServerHandle = {
  server: net.Server;
  sessions: Map<string, CameraMediaSession>;
  address: () => net.AddressInfo | string | null;
  close: () => Promise<void>;
};

const DEFAULT_IDLE_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_BUFFERED_BYTES = 128 * 1024;

export function createCameraMediaServer(options: CameraMediaServerOptions = {}): CameraMediaServerHandle {
  const host = options.host ?? "0.0.0.0";
  const port = options.port ?? 5002;
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const maxBufferedBytes = options.maxBufferedBytes ?? DEFAULT_MAX_BUFFERED_BYTES;

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("camera media port must be between 0 and 65535");
  }
  if (!Number.isSafeInteger(idleTimeoutMs) || idleTimeoutMs < 1_000) {
    throw new Error("camera media idle timeout must be at least 1000 ms");
  }
  if (!Number.isSafeInteger(maxBufferedBytes) || maxBufferedBytes < CAMERA_INIT_PACKET_SIZE) {
    throw new Error("camera media max buffer is too small");
  }

  const sessions = new Map<string, CameraMediaSession>();
  const sockets = new Set<net.Socket>();

  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.setNoDelay(true);
    socket.setKeepAlive(true, Math.min(idleTimeoutMs, 30_000));
    socket.setTimeout(idleTimeoutMs);

    let buffer = Buffer.alloc(0);
    let session: CameraMediaSession | null = null;
    let processing = false;
    let ended = false;

    const cleanupSession = () => {
      if (session && sessions.get(session.imei)?.socket === socket) {
        sessions.delete(session.imei);
      }
    };

    const notifyDisconnected = async (reason: string) => {
      if (!session || !options.onDisconnected) return;
      try {
        await options.onDisconnected(session, reason);
      } catch {
        // Disconnect cleanup must never keep a socket alive.
      }
    };

    const disconnect = async (reason: string) => {
      if (ended) return;
      ended = true;
      cleanupSession();
      await notifyDisconnected(reason);
      if (!socket.destroyed) socket.destroy();
    };

    const processBuffer = async () => {
      if (processing || ended) return;
      processing = true;

      try {
        while (!ended) {
          if (!session) {
            if (buffer.length < CAMERA_INIT_PACKET_SIZE) break;

            const initBytes = buffer.subarray(0, CAMERA_INIT_PACKET_SIZE);
            buffer = buffer.subarray(CAMERA_INIT_PACKET_SIZE);

            const init = parseCameraInitPacket(initBytes);
            const authorized = options.authorizeImei
              ? await options.authorizeImei(init.imei, init)
              : true;

            if (!authorized) {
              await disconnect("unauthorized");
              break;
            }

            const previous = sessions.get(init.imei);
            if (previous && previous.socket !== socket) {
              sessions.delete(init.imei);
              if (!previous.socket.destroyed) previous.socket.destroy();
            }

            session = {
              imei: init.imei,
              init,
              socket,
              connectedAt: Date.now(),
              lastActivityAt: Date.now(),
            };
            sessions.set(init.imei, session);

            if (options.onAuthenticated) {
              await options.onAuthenticated(session);
            }

            continue;
          }

          const parsed = tryParseCameraCommand(buffer);
          if (!parsed) break;

          buffer = parsed.rest;
          session.lastActivityAt = Date.now();

          if (options.onCommand) {
            await options.onCommand(session, parsed.command);
          }
        }
      } catch {
        await disconnect("protocol_error");
      } finally {
        processing = false;
      }
    };

    socket.on("data", (chunk: Buffer) => {
      if (ended) return;

      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
      if (buffer.length > maxBufferedBytes) {
        void disconnect("buffer_limit");
        return;
      }

      void processBuffer();
    });

    socket.on("timeout", () => {
      void disconnect("idle_timeout");
    });

    socket.on("error", () => {
      void disconnect("socket_error");
    });

    socket.on("close", () => {
      sockets.delete(socket);
      cleanupSession();

      if (!ended) {
        ended = true;
        void notifyDisconnected("closed");
      }
    });
  });

  server.listen(port, host);

  return {
    server,
    sessions,
    address: () => server.address(),
    close: async () => {
      for (const socket of sockets) {
        if (!socket.destroyed) socket.destroy();
      }

      const deadline = Date.now() + 3_000;
      while (sockets.size > 0 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      sessions.clear();

      if (!server.listening) return;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}
