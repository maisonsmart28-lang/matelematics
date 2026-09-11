import assert from "node:assert/strict";

import {
  FMS_J1939_DEFINITIONS,
  getFmsJ1939Definition,
} from "./fms-catalog";

function expectDefinition(
  id: number,
  expected: {
    name: string;
    bytes: 1 | 2 | 4 | 8;
    type: "unsigned" | "signed";
    multiplier: number;
    unit: string | null;
  },
): void {
  const definition = getFmsJ1939Definition(id);
  assert.ok(definition, `Expected FMS AVL ${id} to be defined`);
  assert.equal(definition.name, expected.name, `Unexpected name for AVL ${id}`);
  assert.equal(definition.bytes, expected.bytes, `Unexpected byte length for AVL ${id}`);
  assert.equal(definition.type, expected.type, `Unexpected type for AVL ${id}`);
  assert.equal(definition.multiplier, expected.multiplier, `Unexpected multiplier for AVL ${id}`);
  assert.equal(definition.unit, expected.unit, `Unexpected unit for AVL ${id}`);
}

const ids = FMS_J1939_DEFINITIONS.map((definition) => definition.id);
assert.equal(new Set(ids).size, ids.length, "FMS catalog must not contain duplicate AVL IDs");

expectDefinition(79, {
  name: "Brake Switch",
  bytes: 1,
  type: "unsigned",
  multiplier: 1,
  unit: null,
});

expectDefinition(80, {
  name: "Wheel Based Speed",
  bytes: 4,
  type: "unsigned",
  multiplier: 1,
  unit: "km/h",
});

expectDefinition(84, {
  name: "Acceleration Pedal Position",
  bytes: 4,
  type: "unsigned",
  multiplier: 1,
  unit: "%",
});

expectDefinition(85, {
  name: "Engine Current Load",
  bytes: 1,
  type: "unsigned",
  multiplier: 1,
  unit: "%",
});

expectDefinition(86, {
  name: "Engine Total Fuel Used",
  bytes: 4,
  type: "unsigned",
  multiplier: 1,
  unit: "L",
});

expectDefinition(87, {
  name: "Fuel Level",
  bytes: 4,
  type: "unsigned",
  multiplier: 1,
  unit: "%",
});

expectDefinition(88, {
  name: "Engine Speed",
  bytes: 4,
  type: "unsigned",
  multiplier: 1,
  unit: "rpm",
});

for (const id of [89, 90, 91, 92, 93]) {
  const definition = getFmsJ1939Definition(id);
  assert.ok(definition, `Expected axle weight AVL ${id}`);
  assert.equal(definition.bytes, 2);
  assert.equal(definition.type, "unsigned");
  assert.equal(definition.multiplier, 1);
  assert.equal(definition.unit, "kg");
}

expectDefinition(10349, {
  name: "MIL Indicator",
  bytes: 1,
  type: "unsigned",
  multiplier: 1,
  unit: null,
});

// Guardrail: AVL 36 belongs to another source/profile and must not silently
// become an FMS odometer merely because legacy normalization used it.
assert.equal(
  getFmsJ1939Definition(36),
  null,
  "AVL 36 must not be treated as an FMS/J1939 definition",
);

// Guardrail: tracker-level permanent I/O is deliberately outside this catalog.
assert.equal(getFmsJ1939Definition(239), null);
assert.equal(getFmsJ1939Definition(240), null);

console.log(
  `Teltonika Step 5B FMS/J1939 catalog self-test PASS (${FMS_J1939_DEFINITIONS.length} definitions)`,
);
