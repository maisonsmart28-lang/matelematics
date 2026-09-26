import assert from "node:assert/strict";
import { availableHardwareFeatures } from "./hardwareFeatures";

const gt06 = availableHardwareFeatures({
  hardware: { capabilities: ["gps_position", "gps_speed"] },
  telemetry: { can_payload: null },
});
assert.deepEqual([...gt06], []);

const profileWithoutValues = availableHardwareFeatures({
  hardware: { capabilities: ["fuel_level", "fuel_used", "dtc"] },
});
assert.deepEqual([...profileWithoutValues], ["fuel", "diagnostics"]);

const measuredZero = availableHardwareFeatures({
  hardware: { capabilities: ["fuel_level", "dtc"] },
});
assert.deepEqual([...measuredZero], ["fuel", "diagnostics"]);

const noCapability = availableHardwareFeatures({
  hardware: { capabilities: ["gps_position"] },
});
assert.deepEqual([...noCapability], []);

console.log("PASS: navigation selon les possibilités du matériel");
