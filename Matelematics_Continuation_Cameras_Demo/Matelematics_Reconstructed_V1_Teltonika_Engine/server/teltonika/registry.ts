import type { DeviceRegistration } from "./types";

/**
 * Temporary in-memory registry for development.
 * Production will replace this with Supabase/PostgreSQL.
 */
const devices = new Map<string, DeviceRegistration>();

export function registerDevice(device: DeviceRegistration) {
  const normalized: DeviceRegistration = {
    ...device,
    model:
      device.model ??
      device.label ??
      null,
  };

  devices.set(
    normalized.imei,
    normalized,
  );
}

export function findDeviceByImei(imei: string) {
  return devices.get(imei) ?? null;
}

export function listRegisteredDevices() {
  return [...devices.values()];
}
