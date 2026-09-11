import assert from "node:assert/strict";

import {
  CAMERA_AVL_DEFINITIONS,
  getCameraAvlDefinition,
} from "./avl-catalog";

const ids = CAMERA_AVL_DEFINITIONS.map((definition) => definition.id);
assert.equal(new Set(ids).size, ids.length, "Camera AVL catalog must not contain duplicate IDs");

for (let id = 12301; id <= 12306; id += 1) {
  const definition = getCameraAvlDefinition(id);
  assert.ok(definition, `Expected iCam AVL ${id}`);
  assert.equal(definition.family, "icam");
  assert.equal(definition.bytes, 1);
  assert.equal(definition.type, "unsigned");
}

const adasCom1 = getCameraAvlDefinition(613);
assert.ok(adasCom1);
assert.equal(adasCom1.name, "ADAS FCW");
assert.equal(adasCom1.family, "adas");
assert.equal(adasCom1.bytes, 1);

const adasCom2 = getCameraAvlDefinition(12957);
assert.ok(adasCom2);
assert.equal(adasCom2.name, "ADAS FCW");
assert.equal(adasCom2.family, "adas");
assert.equal(adasCom2.port, "COM2");

const adasRelativeSpeed = getCameraAvlDefinition(618);
assert.ok(adasRelativeSpeed);
assert.equal(adasRelativeSpeed.type, "signed");
assert.equal(adasRelativeSpeed.unit, "km/h");

const dsmDrowsinessCom1 = getCameraAvlDefinition(11700);
assert.ok(dsmDrowsinessCom1);
assert.equal(dsmDrowsinessCom1.name, "DSM Drowsiness Event");
assert.equal(dsmDrowsinessCom1.family, "dsm");
assert.equal(dsmDrowsinessCom1.port, "COM1");

const dsmDrowsinessCom2 = getCameraAvlDefinition(12923);
assert.ok(dsmDrowsinessCom2);
assert.equal(dsmDrowsinessCom2.name, "DSM Drowsiness Event");
assert.equal(dsmDrowsinessCom2.port, "COM2");

const dsmDriverName = getCameraAvlDefinition(11708);
assert.ok(dsmDriverName);
assert.equal(dsmDriverName.bytes, 10);
assert.equal(dsmDriverName.type, "ascii");

const dsmError = getCameraAvlDefinition(12935);
assert.ok(dsmError);
assert.equal(dsmError.type, "hex");
assert.equal(dsmError.bytes, 1);

// Guardrails: camera AVL metadata must stay separate from unrelated tracker,
// FMS and media-transfer concepts.
assert.equal(getCameraAvlDefinition(239), null);
assert.equal(getCameraAvlDefinition(80), null);
assert.equal(getCameraAvlDefinition(36), null);

console.log(
  `Teltonika Step 5C camera AVL catalog self-test PASS (${CAMERA_AVL_DEFINITIONS.length} definitions)`,
);
