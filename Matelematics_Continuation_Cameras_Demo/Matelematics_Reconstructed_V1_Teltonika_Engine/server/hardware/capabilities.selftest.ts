import assert from "node:assert/strict";

import {
  hasHardwareCapability,
  resolveHardwareCapabilities,
} from "./capabilities";

function expect(
  label: string,
  condition: boolean,
) {
  assert.equal(condition, true, label);
}

const gt06 = resolveHardwareCapabilities({
  manufacturer: "Accurate",
  model: "GT06",
});

assert.equal(gt06.family, "accurate_gt06");
expect("GT06 GPS position", hasHardwareCapability(gt06, "gps_position"));
expect("GT06 GPS speed", hasHardwareCapability(gt06, "gps_speed"));
expect("GT06 GPS heading", hasHardwareCapability(gt06, "gps_heading"));
expect("GT06 GPS satellites", hasHardwareCapability(gt06, "gps_satellites"));
assert.equal(hasHardwareCapability(gt06, "can_rpm"), false);
assert.equal(hasHardwareCapability(gt06, "fuel_level"), false);
assert.equal(hasHardwareCapability(gt06, "camera"), false);

const fmc150 = resolveHardwareCapabilities({
  manufacturer: "Teltonika",
  model: "FMC150",
});

assert.equal(fmc150.family, "teltonika_fmc150");
expect("FMC150 IO", hasHardwareCapability(fmc150, "io"));
expect("FMC150 CAN RPM", hasHardwareCapability(fmc150, "can_rpm"));
expect("FMC150 CAN speed", hasHardwareCapability(fmc150, "can_speed"));
expect("FMC150 fuel level", hasHardwareCapability(fmc150, "fuel_level"));
assert.equal(hasHardwareCapability(fmc150, "camera"), false);

const fmc125Camera = resolveHardwareCapabilities({
  manufacturer: "Teltonika",
  model: "FMC125",
  sourceProfile: "can_adapter",
  cameraConfigured: true,
});

assert.equal(fmc125Camera.family, "teltonika_fmc125");
expect("FMC125 CAN adapter speed", hasHardwareCapability(fmc125Camera, "can_speed"));
expect("FMC125 camera", hasHardwareCapability(fmc125Camera, "camera"));
expect("FMC125 video", hasHardwareCapability(fmc125Camera, "video"));

const fmc125LightVehicleCan = resolveHardwareCapabilities({
  manufacturer: "Teltonika",
  model: "FMC125",
  sourceProfile: "light_vehicle_can",
});

assert.equal(fmc125LightVehicleCan.family, "teltonika_fmc125");
expect(
  "FMC125 light vehicle CAN RPM",
  hasHardwareCapability(fmc125LightVehicleCan, "can_rpm"),
);
expect(
  "FMC125 light vehicle CAN speed",
  hasHardwareCapability(fmc125LightVehicleCan, "can_speed"),
);
expect(
  "FMC125 light vehicle CAN coolant",
  hasHardwareCapability(fmc125LightVehicleCan, "can_coolant"),
);
expect(
  "FMC125 light vehicle CAN throttle",
  hasHardwareCapability(fmc125LightVehicleCan, "can_throttle"),
);
expect(
  "FMC125 light vehicle CAN odometer",
  hasHardwareCapability(fmc125LightVehicleCan, "can_odometer"),
);
expect(
  "FMC125 light vehicle CAN fuel level",
  hasHardwareCapability(fmc125LightVehicleCan, "fuel_level"),
);
expect(
  "FMC125 light vehicle CAN fuel used",
  hasHardwareCapability(fmc125LightVehicleCan, "fuel_used"),
);
expect(
  "FMC125 light vehicle CAN AdBlue",
  hasHardwareCapability(fmc125LightVehicleCan, "adblue"),
);
assert.equal(hasHardwareCapability(fmc125LightVehicleCan, "j1939_fms"), false);
assert.equal(hasHardwareCapability(fmc125LightVehicleCan, "camera"), false);

const fmc650 = resolveHardwareCapabilities({
  manufacturer: "Teltonika",
  model: "FMC650",
  sourceProfile: "j1939_fms",
  cameraConfigured: true,
});

assert.equal(fmc650.family, "teltonika_fmc650");
expect("FMC650 J1939/FMS", hasHardwareCapability(fmc650, "j1939_fms"));
expect("FMC650 CAN RPM", hasHardwareCapability(fmc650, "can_rpm"));
expect("FMC650 fuel level", hasHardwareCapability(fmc650, "fuel_level"));
expect("FMC650 camera", hasHardwareCapability(fmc650, "camera"));
expect("FMC650 video", hasHardwareCapability(fmc650, "video"));

const unknown = resolveHardwareCapabilities({
  manufacturer: "Unknown",
  model: "Mystery",
});

assert.equal(unknown.family, "unknown");
assert.deepEqual(unknown.capabilities, []);

console.log("PASS: Step 7B hardware capability resolver self-test");
