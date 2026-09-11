import type {
  AvlSourceProfile,
  SupportedDeviceModel,
} from "../avl/catalog";

import {
  findDeviceByImei,
} from "../registry";

export type RegisteredCanContext = {
  model: SupportedDeviceModel | null;
  sourceProfile: AvlSourceProfile | null;
  registered: boolean;
  rawModel: string | null;
};

function canonicalText(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[_]+/g, "-")
    .replace(/\s+/g, " ");
}

export function parseSupportedDeviceModel(
  value: string | null | undefined,
): SupportedDeviceModel | null {
  const text = canonicalText(value);

  if (text.includes("FMB140")) {
    return "FMB140";
  }

  if (text.includes("FMC125")) {
    return "FMC125";
  }

  if (text.includes("FMC150")) {
    return "FMC150";
  }

  return null;
}

export function inferSourceProfileFromDeviceModel(
  model: SupportedDeviceModel | null,
  rawModel: string | null | undefined,
): AvlSourceProfile | null {
  const text = canonicalText(rawModel);

  if (
    text.includes("ALL-CAN300") ||
    text.includes("ALLCAN300") ||
    text.includes("LV-CAN200") ||
    text.includes("LVCAN200") ||
    text.includes("CAN-CONTROL") ||
    text.includes("CANCONTROL")
  ) {
    return "can_adapter";
  }

  if (text.includes("OBD")) {
    return "obd";
  }

  if (
    model === "FMC125" &&
    (
      text.includes("LLS") ||
      text.includes("FUEL SENSOR") ||
      text.includes("RS232")
    )
  ) {
    return "fmc125_peripheral";
  }

  /*
   * FMC150 is the Step 5A model with an integrated CAN chip profile in the
   * current catalog. External adapter / OBD markers above always win.
   */
  if (model === "FMC150") {
    return "fmc150_can_chip";
  }

  /*
   * FMB140 and FMC125 are intentionally not guessed from the base model alone.
   * Their CAN/OBD/peripheral source must be explicit in the configured model
   * label, otherwise normalization fails closed instead of assigning false
   * physical meanings to overlapping AVL IDs.
   */
  return null;
}

export function resolveRegisteredCanContext(
  imei: string,
): RegisteredCanContext {
  const registration =
    findDeviceByImei(imei);

  if (!registration) {
    return {
      model: null,
      sourceProfile: null,
      registered: false,
      rawModel: null,
    };
  }

  const rawModel =
    registration.model ??
    registration.label ??
    null;

  const model =
    parseSupportedDeviceModel(
      rawModel,
    );

  return {
    model,
    sourceProfile:
      inferSourceProfileFromDeviceModel(
        model,
        rawModel,
      ),
    registered: true,
    rawModel,
  };
}
