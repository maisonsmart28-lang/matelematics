import assert from "node:assert/strict";

import {
  asciiIo,
  parseDiagnosticPayload,
  simulatorDiagnostics,
} from "./diagnostics";

function hex(value: string) {
  return Buffer
    .from(value, "utf8")
    .toString("hex");
}

assert.equal(
  asciiIo(
    {
      io_9001:
        hex("P0069"),
    },
    9001,
  ),
  "P0069",
);

assert.equal(
  asciiIo(
    {
      io_9001: "abc",
    },
    9001,
  ),
  null,
  "Odd-length hexadecimal must fail closed",
);

assert.equal(
  asciiIo(
    {
      io_9001: "zz",
    },
    9001,
  ),
  null,
  "Non-hexadecimal payload must fail closed",
);

assert.deepEqual(
  parseDiagnosticPayload({
    payload:
      "p0069; P0101\np0069 | U0100",
    source:
      "simulator",
    status:
      "active",
  }),
  [
    {
      code: "P0069",
      source: "simulator",
      status: "active",
    },
    {
      code: "P0101",
      source: "simulator",
      status: "active",
    },
    {
      code: "U0100",
      source: "simulator",
      status: "active",
    },
  ],
  "OBD-style codes must be canonicalized and deduplicated",
);

assert.deepEqual(
  parseDiagnosticPayload({
    payload:
      "SPN: 123 FMI: 4 | spn 123 fmi 4 | SPN-456 FMI-7",
    source:
      "j1939_dm1",
    status:
      "active",
  }),
  [
    {
      code: "SPN 123 FMI 4",
      source: "j1939_dm1",
      status: "active",
    },
    {
      code: "SPN 456 FMI 7",
      source: "j1939_dm1",
      status: "active",
    },
  ],
  "J1939 SPN/FMI diagnostic identities must be canonical and stable",
);

assert.deepEqual(
  simulatorDiagnostics({
    io_9001:
      hex("P0069"),
  }),
  {
    active: [],
    stored: [],
  },
  "Simulator diagnostic IDs without explicit AVL 9005 profile must fail closed",
);

const diagnostics =
  simulatorDiagnostics({
    io_9005:
      hex("j1939"),
    io_9001:
      hex("p0069;P0101;p0069"),
    io_9003:
      hex("SPN: 123 FMI: 4|SPN 123 FMI 4"),
    io_9004:
      hex("P0069,U0100"),
  });

assert.deepEqual(
  diagnostics.active,
  [
    {
      code: "P0069",
      source: "simulator",
      status: "active",
    },
    {
      code: "P0101",
      source: "simulator",
      status: "active",
    },
    {
      code: "SPN 123 FMI 4",
      source: "j1939_dm1",
      status: "active",
    },
  ],
);

assert.deepEqual(
  diagnostics.stored,
  [
    {
      code: "P0069",
      source: "j1939_dm2",
      status: "stored",
    },
    {
      code: "U0100",
      source: "j1939_dm2",
      status: "stored",
    },
  ],
);

const longDiagnostic =
  parseDiagnosticPayload({
    payload:
      "X".repeat(200),
    source:
      "simulator",
    status:
      "active",
  });

assert.equal(
  longDiagnostic[0]?.code.length,
  80,
  "Diagnostic identifiers must remain bounded",
);

console.log(
  "Teltonika Step 6C diagnostics/DTC parser self-test PASS",
);
