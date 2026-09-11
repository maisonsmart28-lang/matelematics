import assert from "node:assert/strict";

import {
  AVL_CATALOG,
  getAvlDefinition,
  listAvlDefinitionsForModel,
} from "./catalog";

function requireDefinition(
  source: Parameters<typeof getAvlDefinition>[0],
  id: number,
) {
  const definition = getAvlDefinition(source, id);
  assert.ok(
    definition,
    `Missing AVL definition for ${source}:${id}`,
  );
  return definition;
}

const uniqueKeys = new Set<string>();
for (const definition of AVL_CATALOG) {
  const key = `${definition.source}:${definition.id}`;
  assert.equal(
    uniqueKeys.has(key),
    false,
    `Duplicate AVL definition: ${key}`,
  );
  uniqueKeys.add(key);

  assert.ok(definition.models.length > 0, `${key} has no device model`);
  assert.ok(definition.multiplier > 0, `${key} has invalid multiplier`);
}

const ignition = requireDefinition("tracker", 239);
assert.equal(ignition.name, "Ignition");
assert.equal(ignition.bytes, 1);
assert.equal(ignition.valueType, "unsigned");

const movement = requireDefinition("tracker", 240);
assert.equal(movement.name, "Movement");

const obdRpm = requireDefinition("obd", 36);
assert.equal(obdRpm.normalizedField, "engine.rpm");
assert.equal(obdRpm.unit, "rpm");

const obdVin = requireDefinition("obd", 256);
assert.equal(obdVin.valueType, "ascii");
assert.equal(obdVin.bytes, 17);

const allCanSpeed = requireDefinition("can_adapter", 81);
assert.equal(allCanSpeed.normalizedField, "vehicle.speedKph");

const allCanThrottle = requireDefinition("can_adapter", 82);
assert.equal(allCanThrottle.multiplier, 0.1);

const allCanDoors = requireDefinition("can_adapter", 90);
assert.equal(allCanDoors.normalizedField, "doors");

const allCanMileage = requireDefinition("can_adapter", 105);
assert.equal(allCanMileage.unit, "m");

const allCanFuelCounted = requireDefinition("can_adapter", 107);
assert.equal(allCanFuelCounted.multiplier, 0.1);
assert.equal(allCanFuelCounted.unit, "L");

const fmc150Rpm = requireDefinition("fmc150_can_chip", 85);
assert.deepEqual(fmc150Rpm.models, ["FMC150"]);
assert.equal(fmc150Rpm.normalizedField, "engine.rpm");

const fmc150Temperature = requireDefinition("fmc150_can_chip", 115);
assert.equal(fmc150Temperature.valueType, "signed");
assert.equal(fmc150Temperature.multiplier, 0.1);
assert.equal(fmc150Temperature.unit, "°C");

const fmc150Vin = requireDefinition("fmc150_can_chip", 325);
assert.equal(fmc150Vin.valueType, "ascii");
assert.equal(fmc150Vin.bytes, 17);

const fmc125LlsTemperature = requireDefinition("fmc125_peripheral", 202);
assert.deepEqual(fmc125LlsTemperature.models, ["FMC125"]);
assert.equal(fmc125LlsTemperature.valueType, "signed");

// Critical non-regression checks from the Step 5A audit:
// - AVL 35 must not be guessed as RPM in any verified Step 5A profile.
// - AVL 38 must not be guessed as the ALL-CAN300 door bit field.
assert.equal(getAvlDefinition("obd", 35)?.normalizedField, undefined);
assert.equal(getAvlDefinition("can_adapter", 38)?.normalizedField, undefined);
assert.equal(getAvlDefinition("can_adapter", 90)?.normalizedField, "doors");

const fmb140Definitions = listAvlDefinitionsForModel("FMB140");
const fmc125Definitions = listAvlDefinitionsForModel("FMC125");
const fmc150Definitions = listAvlDefinitionsForModel("FMC150");

assert.ok(fmb140Definitions.some((item) => item.source === "can_adapter"));
assert.ok(fmc125Definitions.some((item) => item.source === "fmc125_peripheral"));
assert.ok(fmc150Definitions.some((item) => item.source === "fmc150_can_chip"));

console.log(
  `Teltonika Step 5A AVL catalog self-test PASS (${AVL_CATALOG.length} definitions)`,
);
