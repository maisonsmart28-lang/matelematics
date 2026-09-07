import {
  crc16Ibm,
} from "./crc16";


export type Codec12Message = {
  type: number;
  payload: string;
};


function buildCodec12Message(
  payloadText: string,
  type: number,
) {
  const payload =
    Buffer.from(
      payloadText,
      "utf8",
    );

  const data =
    Buffer.alloc(
      1 +
      1 +
      1 +
      4 +
      payload.length +
      1,
    );

  let offset = 0;

  data.writeUInt8(
    0x0c,
    offset,
  );

  offset += 1;

  data.writeUInt8(
    1,
    offset,
  );

  offset += 1;

  data.writeUInt8(
    type,
    offset,
  );

  offset += 1;

  data.writeUInt32BE(
    payload.length,
    offset,
  );

  offset += 4;

  payload.copy(
    data,
    offset,
  );

  offset +=
    payload.length;

  data.writeUInt8(
    1,
    offset,
  );


  const packet =
    Buffer.alloc(
      8 +
      data.length +
      4,
    );

  packet.writeUInt32BE(
    0,
    0,
  );

  packet.writeUInt32BE(
    data.length,
    4,
  );

  data.copy(
    packet,
    8,
  );

  packet.writeUInt32BE(
    crc16Ibm(data),
    8 + data.length,
  );

  return packet;
}


export function buildCodec12Command(
  command: string,
) {
  return buildCodec12Message(
    command,
    0x05,
  );
}


export function buildCodec12Response(
  response: string,
) {
  return buildCodec12Message(
    response,
    0x06,
  );
}


export function parseCodec12Packet(
  packet: Buffer,
): Codec12Message {
  if (
    packet.length <
    16
  ) {
    throw new Error(
      "Codec12 packet too short",
    );
  }

  if (
    packet.readUInt32BE(0) !==
    0
  ) {
    throw new Error(
      "Invalid Codec12 preamble",
    );
  }

  const dataLength =
    packet.readUInt32BE(4);

  const expectedLength =
    8 +
    dataLength +
    4;

  if (
    packet.length !==
    expectedLength
  ) {
    throw new Error(
      "Invalid Codec12 packet length",
    );
  }

  const data =
    packet.subarray(
      8,
      8 + dataLength,
    );

  const receivedCrc =
    packet.readUInt32BE(
      8 + dataLength,
    );

  const calculatedCrc =
    crc16Ibm(data);

  if (
    (receivedCrc & 0xffff) !==
    calculatedCrc
  ) {
    throw new Error(
      "Invalid Codec12 CRC",
    );
  }

  if (
    data.readUInt8(0) !==
    0x0c
  ) {
    throw new Error(
      "Not a Codec12 packet",
    );
  }

  const type =
    data.readUInt8(2);

  const size =
    data.readUInt32BE(3);

  const start =
    7;

  const end =
    start + size;

  if (
    end >
    data.length - 1
  ) {
    throw new Error(
      "Invalid Codec12 payload size",
    );
  }

  return {
    type,

    payload:
      data
        .subarray(
          start,
          end,
        )
        .toString(
          "utf8",
        ),
  };
}