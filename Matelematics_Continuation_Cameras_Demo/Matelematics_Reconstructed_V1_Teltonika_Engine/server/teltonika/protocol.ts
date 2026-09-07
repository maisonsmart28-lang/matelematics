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
) {
  let buffer =
    Buffer.alloc(0);

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
      try {
        buffer =
          Buffer.concat([
            buffer,
            chunk,
          ]);


        if (
          buffer.length >
          MAX_PACKET_SIZE
        ) {
          throw new Error(
            "Teltonika receive buffer exceeded the safety limit",
          );
        }


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
              `Unknown Teltonika device IMEI ${imei}`,
            );
          }

          socket.write(
            Buffer.from([
              1,
            ]),
          );

          authenticated =
            true;

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
      }
    },
  );
}