import type {
  AvlSourceProfile,
  SupportedDeviceModel,
} from "../avl/catalog";

import {
  findDeviceByImei,
} from "../registry";

export type RegisteredCanSourceProfile =
  | AvlSourceProfile
  | "j1939_fms";

export type RegisteredCanContext = {
  model: SupportedDeviceModel | null;
  sourceProfile: RegisteredCanSourceProfile | null;
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

function explicitlyRequestsFmsJ1939(
  rawModel: string | null | undefined,
) {
  const text = canonicalText(rawModel);

  return (
    text.includes("J1939") ||
    text.includes("FMS")
  );
}

export function inferSourceProfileFromDeviceModel(
  model: SupportedDeviceModel | null,
  rawModel: string | null | undefined,
): RegisteredCanSourceProfile | null {
  const text = canonicalText(rawModel);

  /*
   * Step 5B: FMS/J1939 must be explicitly configured in the registered device
   * label/model metadata. We deliberately do not infer FMS from "FMC600" alone
   * because that exact hardware model is not verified in the current official
   * Teltonika documentation set.
   */
  if (explicitlyRequestsFmsJ1939(rawModel)) {
    return "j1939_fms";
  }

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

  if (model === "FMC150") {
    return "fmc150_can_chip";
  }

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
