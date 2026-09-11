export type FmsValueType = "unsigned" | "signed";

export type FmsDefinition = {
  id: number;
  name: string;
  bytes: 1 | 2 | 4 | 8;
  type: FmsValueType;
  unit: string | null;
  description: string;
};

/**
 * Teltonika FMX6XX decoded FMS/J1939 AVL elements.
 *
 * This catalog deliberately describes the documented FMS source only. Manual
 * CAN and external CAN-adapter values are separate sources and must never be
 * mixed into this table merely because an AVL numeric ID happens to overlap.
 *
 * The user's requested FMC600 remains unverified as an exact Teltonika model;
 * these definitions therefore do not claim FMC600 hardware compatibility.
 */
export const FMS_J1939_DEFINITIONS: readonly FmsDefinition[] = [
  { id: 79, name: "Brake Switch", bytes: 1, type: "unsigned", unit: null, description: "0 released, 1 pressed" },
  { id: 80, name: "Wheel Based Speed", bytes: 4, type: "unsigned", unit: "km/h", description: "FMS wheel-based vehicle speed" },
  { id: 81, name: "Cruise Control Active", bytes: 1, type: "unsigned", unit: null, description: "0 off, 1 on" },
  { id: 82, name: "Clutch Switch", bytes: 1, type: "unsigned", unit: null, description: "0 released, 1 pressed" },
  { id: 83, name: "PTO State", bytes: 1, type: "unsigned", unit: null, description: "Power take-off state" },
  { id: 84, name: "Acceleration Pedal Position", bytes: 4, type: "unsigned", unit: "%", description: "Accelerator pedal position" },
  { id: 85, name: "Engine Current Load", bytes: 1, type: "unsigned", unit: "%", description: "Current engine load" },
  { id: 86, name: "Engine Total Fuel Used", bytes: 4, type: "unsigned", unit: "L", description: "Engine total fuel used" },
  { id: 87, name: "Fuel Level", bytes: 4, type: "unsigned", unit: "%", description: "Fuel level" },
  { id: 88, name: "Engine Speed", bytes: 4, type: "unsigned", unit: "rpm", description: "Engine speed" },
  { id: 89, name: "Axle Weight 1", bytes: 2, type: "unsigned", unit: "kg", description: "Axle weight 1" },
  { id: 90, name: "Axle Weight 2", bytes: 2, type: "unsigned", unit: "kg", description: "Axle weight 2" },
  { id: 91, name: "Axle Weight 3", bytes: 2, type: "unsigned", unit: "kg", description: "Axle weight 3" },
  { id: 92, name: "Axle Weight 4", bytes: 2, type: "unsigned", unit: "kg", description: "Axle weight 4" },
  { id: 93, name: "Axle Weight 5", bytes: 2, type: "unsigned", unit: "kg", description: "Axle weight 5" },
];

const byId = new Map(FMS_J1939_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getFmsJ1939Definition(id: number): FmsDefinition | null {
  return byId.get(id) ?? null;
}
