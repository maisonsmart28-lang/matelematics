export type Feature = "camera" | "fuel" | "diagnostics";

export type LiveHardware = {
  hardware?: { capabilities?: string[] } | null;
  telemetry?: { can_payload?: Record<string, unknown> | null } | null;
};

function measured(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value);
}

export function availableHardwareFeatures(data: LiveHardware): Set<Feature> {
  const capabilities = new Set(data.hardware?.capabilities ?? []);
  const can = data.telemetry?.can_payload ?? {};
  const features = new Set<Feature>();

  if (capabilities.has("camera") && capabilities.has("video")) features.add("camera");
  if (
    (capabilities.has("fuel_level") && measured(can, "fuel_level_percent")) ||
    (capabilities.has("fuel_used") && measured(can, "fuel_used_litres"))
  ) features.add("fuel");

  const canMeasurement = [
    "rpm", "speed_kph", "coolant_temperature_c", "throttle_percent",
    "odometer_km", "fuel_level_percent", "fuel_used_litres",
  ].some((key) => measured(can, key));
  if (capabilities.has("dtc") && (canMeasurement || Array.isArray(can.dtc_codes))) {
    features.add("diagnostics");
  }
  return features;
}
