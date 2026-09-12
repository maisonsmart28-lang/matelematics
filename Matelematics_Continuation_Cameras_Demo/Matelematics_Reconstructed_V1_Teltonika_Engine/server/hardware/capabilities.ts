export type HardwareCapability =
  | "gps_position"
  | "gps_speed"
  | "gps_heading"
  | "gps_satellites"
  | "ignition"
  | "movement"
  | "external_voltage"
  | "internal_battery"
  | "gsm_signal"
  | "io"
  | "can_rpm"
  | "can_speed"
  | "can_coolant"
  | "can_throttle"
  | "can_odometer"
  | "fuel_level"
  | "fuel_used"
  | "adblue"
  | "j1939_fms"
  | "dtc"
  | "camera"
  | "video";

export type HardwareFamily =
  | "accurate_gt06"
  | "teltonika_fmc125"
  | "teltonika_fmc150"
  | "teltonika_fmc650"
  | "teltonika_other"
  | "unknown";

export type HardwareCapabilityInput = {
  manufacturer?: string | null;
  model?: string | null;
  sourceProfile?: string | null;
  cameraConfigured?: boolean;
};

export type HardwareCapabilityResolution = {
  family: HardwareFamily;
  capabilities: readonly HardwareCapability[];
};

const TELTONIKA_BASE: readonly HardwareCapability[] = [
  "gps_position",
  "gps_speed",
  "gps_heading",
  "gps_satellites",
  "ignition",
  "movement",
  "external_voltage",
  "internal_battery",
  "gsm_signal",
  "io",
];

const FMC150_CAN: readonly HardwareCapability[] = [
  "can_rpm",
  "can_speed",
  "can_coolant",
  "can_throttle",
  "can_odometer",
  "fuel_level",
  "fuel_used",
];

const CAN_ADAPTER: readonly HardwareCapability[] = [
  "can_speed",
  "can_throttle",
  "can_odometer",
  "fuel_used",
  "adblue",
];

const LIGHT_VEHICLE_CAN: readonly HardwareCapability[] = [
  "can_rpm",
  "can_speed",
  "can_coolant",
  "can_throttle",
  "can_odometer",
  "fuel_level",
  "fuel_used",
  "adblue",
];

const J1939_FMS: readonly HardwareCapability[] = [
  "j1939_fms",
  "can_rpm",
  "can_speed",
  "can_throttle",
  "can_odometer",
  "fuel_level",
  "fuel_used",
];

function canonical(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[_]+/g, "-")
    .replace(/\s+/g, " ");
}

function unique(
  ...groups: readonly (readonly HardwareCapability[])[]
): HardwareCapability[] {
  return [...new Set(groups.flat())];
}

export function detectHardwareFamily(
  input: Pick<HardwareCapabilityInput, "manufacturer" | "model">,
): HardwareFamily {
  const manufacturer = canonical(input.manufacturer);
  const model = canonical(input.model);
  const combined = `${manufacturer} ${model}`;

  if (
    combined.includes("GT06") ||
    combined.includes("ACCURATE")
  ) {
    return "accurate_gt06";
  }

  if (combined.includes("FMC125")) {
    return "teltonika_fmc125";
  }

  if (combined.includes("FMC150")) {
    return "teltonika_fmc150";
  }

  if (combined.includes("FMC650")) {
    return "teltonika_fmc650";
  }

  if (manufacturer.includes("TELTONIKA")) {
    return "teltonika_other";
  }

  return "unknown";
}

export function resolveHardwareCapabilities(
  input: HardwareCapabilityInput,
): HardwareCapabilityResolution {
  const family = detectHardwareFamily(input);
  const sourceProfile = canonical(input.sourceProfile).toLowerCase();
  const camera = input.cameraConfigured === true;

  if (family === "accurate_gt06") {
    return {
      family,
      capabilities: [
        "gps_position",
        "gps_speed",
        "gps_heading",
        "gps_satellites",
      ],
    };
  }

  if (family === "unknown") {
    return {
      family,
      capabilities: [],
    };
  }

  let capabilities = [...TELTONIKA_BASE];

  if (family === "teltonika_fmc150") {
    capabilities = unique(capabilities, FMC150_CAN);
  }

  if (sourceProfile === "can-adapter") {
    capabilities = unique(capabilities, CAN_ADAPTER);
  }

  if (sourceProfile === "light-vehicle-can") {
    capabilities = unique(capabilities, LIGHT_VEHICLE_CAN);
  }

  if (sourceProfile === "obd") {
    capabilities = unique(capabilities, ["can_rpm"]);
  }

  if (sourceProfile === "j1939-fms") {
    capabilities = unique(capabilities, J1939_FMS);
  }

  if (family === "teltonika_fmc650") {
    capabilities = unique(capabilities, J1939_FMS);
  }

  if (camera) {
    capabilities = unique(capabilities, ["camera", "video"]);
  }

  return {
    family,
    capabilities,
  };
}

export function hasHardwareCapability(
  resolution: HardwareCapabilityResolution,
  capability: HardwareCapability,
) {
  return resolution.capabilities.includes(capability);
}
