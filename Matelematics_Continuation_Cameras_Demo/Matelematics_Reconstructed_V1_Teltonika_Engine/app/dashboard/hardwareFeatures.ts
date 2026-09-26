export type Feature = "camera" | "fuel" | "diagnostics";

export type LiveHardware = { hardware?: { capabilities?: string[] } | null };

export function availableHardwareFeatures(data: LiveHardware): Set<Feature> {
  const capabilities = new Set(data.hardware?.capabilities ?? []);
  const features = new Set<Feature>();

  if (capabilities.has("camera") && capabilities.has("video")) features.add("camera");
  if (capabilities.has("fuel_level") || capabilities.has("fuel_used")) features.add("fuel");
  if (capabilities.has("dtc")) features.add("diagnostics");
  return features;
}
