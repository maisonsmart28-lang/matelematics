export type AvlValueType =
  | "unsigned"
  | "signed"
  | "ascii"
  | "binary";

export type AvlSourceProfile =
  | "tracker"
  | "obd"
  | "can_adapter"
  | "fmc150_can_chip"
  | "fmc125_peripheral";

export type SupportedDeviceModel =
  | "FMB140"
  | "FMC125"
  | "FMC150";

export interface AvlDefinition {
  id: number;
  name: string;
  source: AvlSourceProfile;
  models: readonly SupportedDeviceModel[];
  bytes: number | "variable";
  valueType: AvlValueType;
  multiplier: number;
  unit: string | null;
  normalizedField: string | null;
  notes?: string;
}

const ALL_TRACKERS = ["FMB140", "FMC125", "FMC150"] as const;
const CAN_ADAPTER_TRACKERS = ["FMB140", "FMC125", "FMC150"] as const;

/**
 * Step 5A typed AVL catalog.
 *
 * Important: an AVL ID is interpreted together with its source profile.
 * The same semantic concept can be exposed by different AVL IDs depending on
 * whether it came from the tracker itself, OBD, an external CAN adapter
 * (LV-CAN200 / ALL-CAN300 / CAN-CONTROL), the FMC150 CAN chip, or a peripheral.
 *
 * This catalog intentionally contains only definitions verified for the
 * current Step 5A scope. Unknown AVL IDs must remain available as raw IO and
 * must not be guessed into a normalized field.
 */
export const AVL_CATALOG: readonly AvlDefinition[] = [
  // Permanent tracker IO shared by the Step 5A devices.
  {
    id: 21,
    name: "GSM Signal",
    source: "tracker",
    models: ALL_TRACKERS,
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: null,
    normalizedField: "tracker.gsmSignal",
  },
  {
    id: 67,
    name: "Battery Voltage",
    source: "tracker",
    models: ALL_TRACKERS,
    bytes: 2,
    valueType: "unsigned",
    multiplier: 0.001,
    unit: "V",
    normalizedField: "tracker.internalBatteryVoltage",
  },
  {
    id: 239,
    name: "Ignition",
    source: "tracker",
    models: ALL_TRACKERS,
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: null,
    normalizedField: "vehicle.ignition",
  },
  {
    id: 240,
    name: "Movement",
    source: "tracker",
    models: ALL_TRACKERS,
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: null,
    normalizedField: "vehicle.movement",
  },

  // OBD values. Keep separate from CAN adapter and CAN chip mappings.
  {
    id: 36,
    name: "Engine RPM",
    source: "obd",
    models: ALL_TRACKERS,
    bytes: 2,
    valueType: "unsigned",
    multiplier: 1,
    unit: "rpm",
    normalizedField: "engine.rpm",
  },
  {
    id: 256,
    name: "VIN",
    source: "obd",
    models: ALL_TRACKERS,
    bytes: 17,
    valueType: "ascii",
    multiplier: 1,
    unit: null,
    normalizedField: "vehicle.vin",
  },

  // External CAN adapter family: LV-CAN200 / ALL-CAN300 / CAN-CONTROL.
  {
    id: 81,
    name: "Vehicle Speed",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: "km/h",
    normalizedField: "vehicle.speedKph",
  },
  {
    id: 82,
    name: "Accelerator Pedal Position",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 1,
    valueType: "unsigned",
    multiplier: 0.1,
    unit: "%",
    normalizedField: "engine.throttlePercent",
  },
  {
    id: 90,
    name: "Door Status",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 4,
    valueType: "unsigned",
    multiplier: 1,
    unit: null,
    normalizedField: "doors",
    notes: "Bit field; availability and bit support depend on the vehicle.",
  },
  {
    id: 105,
    name: "Total Mileage Counted",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 4,
    valueType: "unsigned",
    multiplier: 1,
    unit: "m",
    normalizedField: "vehicle.odometerKm",
  },
  {
    id: 107,
    name: "Fuel Consumed Counted",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 4,
    valueType: "unsigned",
    multiplier: 0.1,
    unit: "L",
    normalizedField: "fuel.consumedLiters",
  },
  {
    id: 110,
    name: "Fuel Rate",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 2,
    valueType: "unsigned",
    multiplier: 0.1,
    unit: "L/h",
    normalizedField: "fuel.rateLph",
  },
  {
    id: 111,
    name: "AdBlue Level",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: "%",
    normalizedField: "fuel.adBluePercent",
  },
  {
    id: 112,
    name: "AdBlue Level Liters",
    source: "can_adapter",
    models: CAN_ADAPTER_TRACKERS,
    bytes: 2,
    valueType: "unsigned",
    multiplier: 0.1,
    unit: "L",
    normalizedField: "fuel.adBlueLiters",
  },

  // FMC150 integrated CAN chip.
  {
    id: 81,
    name: "Vehicle Speed",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: "km/h",
    normalizedField: "vehicle.speedKph",
  },
  {
    id: 82,
    name: "Throttle Position",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: "%",
    normalizedField: "engine.throttlePercent",
  },
  {
    id: 84,
    name: "Fuel Level Liters",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 2,
    valueType: "unsigned",
    multiplier: 0.1,
    unit: "L",
    normalizedField: "fuel.levelLiters",
  },
  {
    id: 85,
    name: "Engine Speed",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 2,
    valueType: "unsigned",
    multiplier: 1,
    unit: "rpm",
    normalizedField: "engine.rpm",
  },
  {
    id: 87,
    name: "Total Mileage",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 4,
    valueType: "unsigned",
    multiplier: 1,
    unit: "m",
    normalizedField: "vehicle.odometerKm",
  },
  {
    id: 89,
    name: "Fuel Level",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 1,
    valueType: "unsigned",
    multiplier: 1,
    unit: "%",
    normalizedField: "fuel.levelPercent",
  },
  {
    id: 105,
    name: "Total Mileage Counted",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 4,
    valueType: "unsigned",
    multiplier: 1,
    unit: "m",
    normalizedField: "vehicle.odometerKm",
  },
  {
    id: 107,
    name: "Fuel Consumed Counted",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 4,
    valueType: "unsigned",
    multiplier: 0.1,
    unit: "L",
    normalizedField: "fuel.consumedLiters",
  },
  {
    id: 115,
    name: "Engine Coolant Temperature",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 2,
    valueType: "signed",
    multiplier: 0.1,
    unit: "°C",
    normalizedField: "engine.coolantTemperatureC",
  },
  {
    id: 325,
    name: "VIN",
    source: "fmc150_can_chip",
    models: ["FMC150"],
    bytes: 17,
    valueType: "ascii",
    multiplier: 1,
    unit: null,
    normalizedField: "vehicle.vin",
  },

  // FMC125 peripheral examples that must remain separate from CAN mappings.
  {
    id: 201,
    name: "LLS1 Fuel Level",
    source: "fmc125_peripheral",
    models: ["FMC125"],
    bytes: 2,
    valueType: "signed",
    multiplier: 1,
    unit: null,
    normalizedField: null,
    notes: "Raw LLS sensor value; physical conversion depends on the configured sensor.",
  },
  {
    id: 202,
    name: "LLS1 Temperature",
    source: "fmc125_peripheral",
    models: ["FMC125"],
    bytes: 2,
    valueType: "signed",
    multiplier: 0.1,
    unit: "°C",
    normalizedField: null,
  },
] as const;

export function getAvlDefinition(
  source: AvlSourceProfile,
  id: number,
): AvlDefinition | undefined {
  return AVL_CATALOG.find(
    (definition) =>
      definition.source === source &&
      definition.id === id,
  );
}

export function listAvlDefinitionsForModel(
  model: SupportedDeviceModel,
): readonly AvlDefinition[] {
  return AVL_CATALOG.filter((definition) =>
    definition.models.includes(model),
  );
}
