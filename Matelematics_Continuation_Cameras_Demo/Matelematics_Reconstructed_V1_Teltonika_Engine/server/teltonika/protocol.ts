import type {
  Socket,
} from "node:net";

import {
  decodeAvlPacket,
} from "./codec8";

import {
  parseCodec12Packet,
} from "./codec12";

import {
  normalizeMessage,
} from "./normalize";

import {
  findDeviceByImei,
} from "./registry";


const MAX_PACKET_SIZE =
  2 * 1024 * 1024;


type PacketHandler =
  (input: {
    socket: Socket;
    imei: string;
    normalized:
      ReturnType<
        typeof normalizeMessage
      >;
  }) =>
    void |
    Promise<void>;


type ProtocolHooks = {
  onAuthenticated?: (
    input: {
      socket: Socket;
      imei: string;
    },
  ) =>
    void |
    Promise<void>;

  onAvlStart?: (
    input: {
      socket: Socket;
      imei: string;
    },
  ) =>
    void |
    Promise<void>;

  onAvlAcked?: (
    input: {
      socket: Socket;
      imei: string;
    },
  ) =>
    void |
    Promise<void>;

  onCommandResponse?: (
    input: {
      socket: Socket;
      imei: string;
      response: string;
    },
  ) =>
    void |
    Promise<void>;

  onDisconnected?: (
    input: {
      socket: Socket;
      imei: string;
    },
  ) =>
    void |
    Promise<void>;
};


export function attachTeltonikaProtocol(
  socket: Socket,
  onMessage: PacketHandler,
  hooks: ProtocolHooks = {},
  limits: { idleTimeoutMs?: number; authTimeoutMs?: number } = {},
) {
  let buffer =
    Buffer.alloc(0);

  const idleTimeoutMs = limits.idleTimeoutMs ?? 300_000;
  if (!Number.isInteger(idleTimeoutMs) || idleTimeoutMs < 1_000 || idleTimeoutMs > 86_400_000) {
    throw new Error("Invalid Teltonika idle timeout");
  }
  const authTimeoutMs = limits.authTimeoutMs ?? 30_000;
  if (!Number.isInteger(authTimeoutMs) || authTimeoutMs < 1_000 || authTimeoutMs > 300_000) {
    throw new Error("Invalid Teltonika authentication timeout");
  }
  // Absolute deadline: incoming fragments do not extend authentication.
  const authTimer = setTimeout(() => socket.destroy(), authTimeoutMs);
  authTimer.unref();
  socket.setTimeout(idleTimeoutMs, () => socket.destroy());
  let processing = false;

  let authenticated =
    false;

  let imei =
    "";


  const closeWithError =
    (
      error: unknown,
    ) => {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      socket.destroy(
        new Error(message),
      );
    };


  socket.on(
    "close",
    () => {
      clearTimeout(authTimer);
      if (imei) {
        void hooks
          .onDisconnected?.({
            socket,
            imei,
          });
      }
    },
  );


  socket.on(
    "data",
    async (
      chunk,
    ) => {
      if (socket.destroyed) return;
      // Check before allocating; queued data events may run during persistence.
      if (buffer.length + chunk.length > MAX_PACKET_SIZE) {
        closeWithError(new Error("Teltonika receive buffer exceeded the safety limit"));
        return;
      }
      buffer = Buffer.concat([buffer, chunk]);
      if (processing) return;
      processing = true;
      socket.pause();
      try {


        if (
          !authenticated
        ) {
          if (
            buffer.length <
            2
          ) {
            return;
          }

          const imeiLength =
            buffer.readUInt16BE(
              0,
            );

          if (
            imeiLength <
              10 ||
            imeiLength >
              32
          ) {
            throw new Error(
              `Invalid Teltonika IMEI length: ${imeiLength}`,
            );
          }

          if (
            buffer.length <
            2 + imeiLength
          ) {
            return;
          }

          imei =
            buffer
              .subarray(
                2,
                2 +
                  imeiLength,
              )
              .toString(
                "ascii",
              );

          buffer =
            buffer.subarray(
              2 +
              imeiLength,
            );

          if (
            !/^\d{10,20}$/.test(
              imei,
            )
          ) {
            throw new Error(
              "Invalid Teltonika IMEI format",
            );
          }

          const registration =
            findDeviceByImei(
              imei,
            );

          if (
            !registration
          ) {
            socket.write(
              Buffer.from([
                0,
              ]),
            );

            throw new Error(
              "Unknown Teltonika device",
            );
          }

          socket.write(
            Buffer.from([
              1,
            ]),
          );

          authenticated =
            true;
          clearTimeout(authTimer);

          await hooks
            .onAuthenticated?.({
              socket,
              imei,
            });
        }


        while (
          authenticated
        ) {
          if (
            buffer.length <
            12
          ) {
            return;
          }

          const preamble =
            buffer.readUInt32BE(
              0,
            );

          if (
            preamble !==
            0
          ) {
            throw new Error(
              "Invalid Teltonika packet preamble",
            );
          }

          const dataLength =
            buffer.readUInt32BE(
              4,
            );

          const totalLength =
            8 +
            dataLength +
            4;

          if (
            dataLength <=
              0 ||
            totalLength >
              MAX_PACKET_SIZE
          ) {
            throw new Error(
              `Invalid Teltonika data length: ${dataLength}`,
            );
          }

          if (
            buffer.length <
            totalLength
          ) {
            return;
          }

          const packet =
            buffer.subarray(
              0,
              totalLength,
            );

          buffer =
            buffer.subarray(
              totalLength,
            );


          const codecId =
            packet.readUInt8(
              8,
            );


          /*
           * Codec 12:
           * command response from tracker.
           */
          if (
            codecId ===
            0x0c
          ) {
            const message =
              parseCodec12Packet(
                packet,
              );

            if (
              message.type ===
              0x06
            ) {
              await hooks
                .onCommandResponse?.({
                  socket,
                  imei,
                  response:
                    message.payload,
                });
            }

            continue;
          }


          /*
           * Existing AVL path.
           */
          await hooks
            .onAvlStart?.({
              socket,
              imei,
            });


          const decoded =
            decodeAvlPacket(
              packet,
            );

          const normalized =
            normalizeMessage(
              imei,
              decoded,
            );


          /*
           * Durable ACK preserved:
           * ACK only after persistence.
           */
          await onMessage({
            socket,
            imei,
            normalized,
          });


          if (socket.destroyed) return;

          const ack =
            Buffer.alloc(
              4,
            );

          ack.writeUInt32BE(
            normalized.length,
            0,
          );

          socket.write(
            ack,
          );


          await hooks
            .onAvlAcked?.({
              socket,
              imei,
            });
        }
      } catch (error) {
        closeWithError(
          error,
        );
      } finally {
        processing = false;
        if (!socket.destroyed) socket.resume();
      }
    },
  );
}