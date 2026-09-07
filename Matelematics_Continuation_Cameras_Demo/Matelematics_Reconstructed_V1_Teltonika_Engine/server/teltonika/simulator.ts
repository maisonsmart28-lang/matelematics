import net from "node:net";

import {
  crc16Ibm,
} from "./crc16";

import {
  buildCodec12Response,
  parseCodec12Packet,
} from "./codec12";


const host =
  process.env.TELTONIKA_SIM_HOST ??
  "127.0.0.1";

const port =
  Number(
    process.env.TELTONIKA_SIM_PORT ??
    5000,
  );

const imei =
  process.env.TELTONIKA_SIM_IMEI ??
  "356307042441234";

const intervalMs =
  Number(
    process.env.TELTONIKA_SIM_INTERVAL_MS ??
    3000,
  );

/*
 * Alert Engine V1.1 simulator validation mode.
 *
 * Disabled by default.
 *
 * Enable explicitly with:
 * TELTONIKA_SIM_ALERT_TEST=1
 */
const alertTestMode =
  process.env.TELTONIKA_SIM_ALERT_TEST ===
  "1";

const profile =
  (
    process.env.TELTONIKA_SIM_PROFILE ??
    "light"
  ).toLowerCase() === "j1939"
    ? "j1939"
    : "light";


let latitude =
  33.5731;

let longitude =
  -7.5898;

let speedKph =
  48;

let heading =
  90;

let packetNumber =
  0;

let fuelLevelPercent =
  76;

let fuelUsedLitres =
  38.4;

let odometerKm =
  128450;

let engineWorkMinutes =
  74400;

let adBluePercent =
  82;

let dtcCleared =
  false;

let serverBuffer =
  Buffer.alloc(0);


function state() {
  const rpm =
    Math.round(
      850 +
      speedKph * 28 +
      Math.sin(
        packetNumber / 3,
      ) * 180,
    );

  /*
   * Alert validation cycle:
   *
   * packets 10..14:
   * coolant_temperature_high
   *
   * Other packets:
   * normal coolant behaviour
   */
  const coolant =
    alertTestMode &&
    packetNumber >= 10 &&
    packetNumber <= 14
      ? 110
      : Math.round(
          Math.min(
            112,
            78 +
            Math.sin(
              packetNumber / 10,
            ) * 8,
          ),
        );

  const throttle =
    Math.max(
      8,
      Math.min(
        82,
        Math.round(
          18 +
          speedKph * 0.45 +
          Math.sin(
            packetNumber / 2,
          ) * 8,
        ),
      ),
    );

  const engineLoad =
    Math.max(
      15,
      Math.min(
        95,
        Math.round(
          25 +
          speedKph * 0.55,
        ),
      ),
    );

  const fuelRate =
    Math.max(
      1,
      3.5 +
      speedKph * 0.065,
    );

  /*
   * packets 30..34:
   * battery_voltage_low
   *
   * IMPORTANT:
   * simulator value remains expressed in mV here,
   * exactly like the existing simulator implementation.
   */
  const externalVoltage =
    alertTestMode &&
    packetNumber >= 30 &&
    packetNumber <= 34
      ? 11200
      : Math.round(
          13800 +
          Math.sin(
            packetNumber / 5,
          ) * 180,
        );

  const internalBattery =
    Math.round(
      4080 +
      Math.sin(
        packetNumber / 7,
      ) * 30,
    );

  const gsm =
    Math.max(
      1,
      Math.min(
        5,
        4 +
        Math.round(
          Math.sin(
            packetNumber / 6,
          ),
        ),
      ),
    );

  /*
   * Test scenarios.
   *
   * Door opens while moving:
   * packets 8..11
   *
   * Diagnostic / Check Engine:
   * packets 15..22
   */

  const doorFault =
    packetNumber >= 8 &&
    packetNumber <= 11;

  const diagnosticFault =
    !dtcCleared &&
    packetNumber >= 15;

  return {
    rpm,
    coolant,
    throttle,
    engineLoad,
    fuelRate,
    externalVoltage,
    internalBattery,
    gsm,
    doorFault,
    diagnosticFault,
  };
}


type IoNumber = {
  id: number;
  value: number;
};

type IoNx = {
  id: number;
  value: Buffer;
};


function buildCodec8EPacket() {
  const s =
    state();

  const one:
    IoNumber[] =
    [
      {
        id: 239,
        value: 1,
      },

      {
        id: 240,
        value:
          speedKph > 0
            ? 1
            : 0,
      },

      {
        id: 21,
        value:
          s.gsm,
      },
    ];

  const two:
    IoNumber[] =
    [
      {
        id: 66,
        value:
          s.externalVoltage,
      },

      {
        id: 67,
        value:
          s.internalBattery,
      },
    ];

  const four:
    IoNumber[] =
    [];

  const eight:
    IoNumber[] =
    [];

  const nx:
    IoNx[] =
    [];


  if (
    profile === "light"
  ) {
    one.push(
      {
        id: 81,
        value:
          Math.round(
            speedKph,
          ),
      },

      {
        id: 82,
        value:
          s.throttle,
      },

      {
        id: 37,
        value:
          Math.round(
            fuelLevelPercent,
          ),
      },

      {
        id: 19,
        value:
          Math.round(
            adBluePercent,
          ),
      },

      {
        id: 23,
        value:
          s.engineLoad,
      },

      {
        id: 176,
        value:
          s.diagnosticFault
            ? 1
            : 0,
      },
    );

    two.push(
      {
        id: 18,
        value:
          Math.round(
            s.fuelRate * 10,
          ),
      },

      {
        id: 34,
        value:
          Math.round(
            58 *
            fuelLevelPercent /
            100 *
            10,
          ),
      },

      {
        id: 35,
        value:
          s.rpm,
      },

      {
        id: 25,
        value:
          Math.round(
            s.coolant * 10,
          ),
      },
    );

    four.push(
      {
        id: 14,
        value:
          Math.round(
            engineWorkMinutes,
          ),
      },

      {
        id: 16,
        value:
          Math.round(
            odometerKm *
            1000,
          ),
      },

      {
        id: 17,
        value:
          Math.round(
            fuelUsedLitres *
            10,
          ),
      },

      {
        id: 33,
        value:
          Math.round(
            fuelUsedLitres *
            10,
          ),
      },

      {
        id: 36,
        value:
          Math.round(
            odometerKm *
            1000,
          ),
      },

      {
        id: 38,
        value:
          s.doorFault
            ? 0x100
            : 0,
      },
    );

    if (
      s.diagnosticFault
    ) {
      nx.push({
        id: 9001,
        value:
          Buffer.from(
            "P0069",
            "utf8",
          ),
      });
    }
  }


  if (
    profile === "j1939"
  ) {
    /*
     * FMC650 FMS/J1939 profile.
     */

    one.push(
      {
        id: 85,
        value:
          s.engineLoad,
      },

      {
        id: 10349,
        value:
          s.diagnosticFault
            ? 2
            : 0,
      },
    );

    four.push(
      {
        id: 80,
        value:
          Math.round(
            speedKph,
          ),
      },

      {
        id: 84,
        value:
          s.throttle,
      },

      {
        id: 86,
        value:
          Math.round(
            fuelUsedLitres,
          ),
      },

      {
        id: 87,
        value:
          Math.round(
            fuelLevelPercent,
          ),
      },

      {
        id: 88,
        value:
          s.rpm,
      },

      /*
       * Mileage from CAN adapter fallback.
       */
      {
        id: 36,
        value:
          Math.round(
            odometerKm *
            1000,
          ),
      },
    );

    if (
      s.diagnosticFault
    ) {
      /*
       * Simulator-only DM1 representation.
       *
       * This is NOT claimed to be the real
       * FMC650 DM1 AVL wire encoding.
       */
      nx.push({
        id: 9003,
        value:
          Buffer.from(
            "SPN100-FMI1",
            "utf8",
          ),
      });

      nx.push({
        id: 9004,
        value:
          Buffer.from(
            "SPN110-FMI3",
            "utf8",
          ),
      });
    }
  }


  nx.push({
    id: 9005,
    value:
      Buffer.from(
        profile,
        "utf8",
      ),
  });


  const parts:
    Buffer[] =
    [];


  const u8 =
    (value: number) => {
      const b =
        Buffer.alloc(1);

      b.writeUInt8(
        value,
      );

      parts.push(b);
    };


  const u16 =
    (value: number) => {
      const b =
        Buffer.alloc(2);

      b.writeUInt16BE(
        value,
      );

      parts.push(b);
    };


  const u32 =
    (value: number) => {
      const b =
        Buffer.alloc(4);

      b.writeUInt32BE(
        value >>> 0,
      );

      parts.push(b);
    };


  const i32 =
    (value: number) => {
      const b =
        Buffer.alloc(4);

      b.writeInt32BE(
        value,
      );

      parts.push(b);
    };


  const u64 =
    (value: bigint) => {
      const b =
        Buffer.alloc(8);

      b.writeBigUInt64BE(
        value,
      );

      parts.push(b);
    };


  /*
   * Codec 8 Extended
   */

  u8(142);
  u8(1);

  u64(
    BigInt(
      Date.now(),
    ),
  );

  u8(1);

  i32(
    Math.round(
      longitude *
      10_000_000,
    ),
  );

  i32(
    Math.round(
      latitude *
      10_000_000,
    ),
  );

  u16(35);

  u16(
    Math.round(
      heading,
    ),
  );

  u8(11);

  u16(
    Math.round(
      speedKph,
    ),
  );


  /*
   * Codec 8E IO
   */

  u16(239);

  const totalIo =
    one.length +
    two.length +
    four.length +
    eight.length +
    nx.length;

  u16(totalIo);


  u16(one.length);

  for (
    const item of one
  ) {
    u16(item.id);
    u8(item.value);
  }


  u16(two.length);

  for (
    const item of two
  ) {
    u16(item.id);
    u16(item.value);
  }


  u16(four.length);

  for (
    const item of four
  ) {
    u16(item.id);
    u32(item.value);
  }


  u16(eight.length);

  for (
    const item of eight
  ) {
    u16(item.id);
    u64(
      BigInt(
        item.value,
      ),
    );
  }


  u16(nx.length);

  for (
    const item of nx
  ) {
    u16(item.id);

    u16(
      item.value.length,
    );

    parts.push(
      item.value,
    );
  }


  u8(1);


  const data =
    Buffer.concat(
      parts,
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


function advance() {
  longitude +=
    0.00015;

  latitude +=
    0.00005;

  heading =
    (
      heading + 3
    ) % 360;

  /*
   * packets 20..24:
   * overspeed
   *
   * Normal simulator behaviour is preserved when
   * alertTestMode is disabled.
   */
  speedKph =
    alertTestMode &&
    packetNumber >= 20 &&
    packetNumber <= 24
      ? 135
      : Math.max(
          20,
          Math.round(
            48 +
            Math.sin(
              packetNumber / 4,
            ) * 8,
          ),
        );

  const distanceKm =
    speedKph *
    (
      intervalMs /
      3_600_000
    );

  odometerKm +=
    distanceKm;

  engineWorkMinutes +=
    intervalMs /
    60_000;

  const consumption =
    (
      7.2 +
      speedKph *
      0.035
    );

  const consumed =
    distanceKm *
    consumption /
    100;

  fuelUsedLitres +=
    consumed;

  fuelLevelPercent =
    Math.max(
      0,
      fuelLevelPercent -
      consumed * 0.55,
    );

  adBluePercent =
    Math.max(
      0,
      adBluePercent -
      consumed * 0.015,
    );
}


const socket =
  net.createConnection(
    {
      host,
      port,
    },

    () => {
      console.log(
        `[Teltonika simulator V2] Connected ${host}:${port}`,
      );

      console.log(
        `[Teltonika simulator V2] Profile = ${profile}`,
      );

      console.log(
        `[Teltonika simulator V2] Alert test mode = ${
          alertTestMode
            ? "ON"
            : "OFF"
        }`,
      );

      if (
        alertTestMode
      ) {
        console.log(
          "[Teltonika simulator V2] Alert test cycle: TEMP packets 10-14 | OVERSPEED packets 20-24 | BATTERY packets 30-34",
        );
      }

      const imeiBuffer =
        Buffer.from(
          imei,
          "ascii",
        );

      const handshake =
        Buffer.alloc(
          2 +
          imeiBuffer.length,
        );

      handshake.writeUInt16BE(
        imeiBuffer.length,
        0,
      );

      imeiBuffer.copy(
        handshake,
        2,
      );

      socket.write(
        handshake,
      );
    },
  );


let authenticated =
  false;

let waiting =
  false;


function sendRecord() {
  if (
    !authenticated ||
    waiting
  ) {
    return;
  }

  packetNumber += 1;

  const s =
    state();

  const packet =
    buildCodec8EPacket();

  waiting =
    true;

  socket.write(
    packet,
  );

  console.log(
    `[Teltonika V2:${profile}] #${packetNumber} ` +
    `${speedKph}km/h ` +
    `RPM=${s.rpm} ` +
    `Fuel=${fuelLevelPercent.toFixed(1)}% ` +
    `Temp=${s.coolant}C ` +
    `ExtV=${(s.externalVoltage / 1000).toFixed(2)}V ` +
    `Door=${s.doorFault ? "OPEN" : "CLOSED"} ` +
    `Fault=${s.diagnosticFault ? "ACTIVE" : "NONE"}`,
  );

  advance();
}


socket.on(
  "data",

  (incoming) => {
    let data =
      incoming;

    if (
      !authenticated
    ) {
      if (
        data.length < 1 ||
        data[0] !== 1
      ) {
        console.error(
          `[Teltonika simulator V2] IMEI rejected: ${imei}`,
        );

        socket.end();
        return;
      }

      authenticated =
        true;

      console.log(
        `[Teltonika simulator V2] IMEI ${imei} accepted`,
      );

      data =
        data.subarray(1);

      sendRecord();

      if (
        data.length === 0
      ) {
        return;
      }
    }


    serverBuffer =
      Buffer.concat([
        serverBuffer,
        data,
      ]);


    while (
      serverBuffer.length >=
      4
    ) {
      /*
       * Normal AVL ACK = 4 byte integer.
       */
      if (
        serverBuffer.readUInt32BE(0) !==
        0
      ) {
        const accepted =
          serverBuffer.readUInt32BE(
            0,
          );

        serverBuffer =
          serverBuffer.subarray(
            4,
          );

        console.log(
          `[Teltonika simulator V2] Server ACK = ${accepted}`,
        );

        waiting =
          false;

        continue;
      }


      /*
       * Codec12 packet begins with 4 zero bytes.
       */
      if (
        serverBuffer.length <
        8
      ) {
        return;
      }

      const dataLength =
        serverBuffer.readUInt32BE(
          4,
        );

      const totalLength =
        8 +
        dataLength +
        4;

      if (
        serverBuffer.length <
        totalLength
      ) {
        return;
      }

      const packet =
        serverBuffer.subarray(
          0,
          totalLength,
        );

      serverBuffer =
        serverBuffer.subarray(
          totalLength,
        );


      if (
        packet.readUInt8(8) !==
        0x0c
      ) {
        console.warn(
          "[Teltonika simulator V2] Unknown server packet",
        );

        continue;
      }


      const message =
        parseCodec12Packet(
          packet,
        );

      if (
        message.type !==
        0x05
      ) {
        continue;
      }


      const command =
        message.payload.trim();

      console.log(
        `[Teltonika simulator V2] Command received: ${command}`,
      );


      let response =
        "Command not supported.";


      if (
        command ===
        "lvcandtcclear"
      ) {
        if (
          profile ===
          "light"
        ) {
          dtcCleared =
            true;

          response =
            "DTCs cleared. DTCs read: 1";
        } else {
          response =
            "DTC clear cmd not supported.";
        }
      }


      /*
       * J1939 CLEAR SIMULATION ONLY.
       *
       * This models:
       * DM11 -> active DTC clear
       * DM3  -> previously active/stored DTC clear
       *
       * It is NOT a real FMC650 Manual CAN command.
       */
      if (
        command ===
        "matelematics_sim_j1939_dm11_dm3_clear"
      ) {
        if (
          profile ===
          "j1939"
        ) {
          dtcCleared =
            true;

          response =
            "J1939 simulator clear confirmed. DM11=OK DM3=OK";
        } else {
          response =
            "J1939 clear cmd not supported.";
        }
      }


      socket.write(
        buildCodec12Response(
          response,
        ),
      );


      console.log(
        `[Teltonika simulator V2] Command response: ${response}`,
      );
    }
  },
);


const timer =
  setInterval(
    sendRecord,
    intervalMs,
  );


function shutdown() {
  clearInterval(
    timer,
  );

  socket.end();
}


process.on(
  "SIGINT",
  shutdown,
);

process.on(
  "SIGTERM",
  shutdown,
);


socket.on(
  "error",

  (error) => {
    console.error(
      "[Teltonika simulator V2]",
      error.message,
    );

    process.exitCode =
      1;
  },
);