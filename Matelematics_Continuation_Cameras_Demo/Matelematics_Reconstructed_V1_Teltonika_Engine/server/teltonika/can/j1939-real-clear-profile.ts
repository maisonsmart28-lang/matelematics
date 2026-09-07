export type J1939CanChannel =
  | "CAN1"
  | "CAN2";


export type J1939IdType =
  | "29bit"
  | "11bit";


export type J1939RealClearProfile = {
  mode:
    "real";

  imei:
    string;

  vehicleVerified:
    boolean;

  canProfileVerified:
    boolean;

  clearProfileVerified:
    boolean;

  realClearEnabled:
    false;

  safetyInterlock:
    "HARD_LOCK_V1";

  transmissionEnabled:
    false;

  canChannel:
    J1939CanChannel |
    null;

  baudRate:
    number |
    null;

  idType:
    J1939IdType |
    null;

  sourceAddress:
    number |
    null;

  dm1Read:
    boolean;

  dm2Read:
    boolean;

  clearActiveConfigured:
    boolean;

  clearStoredConfigured:
    boolean;

  manufacturer:
    string |
    null;

  vehicleModel:
    string |
    null;

  vehicleYear:
    number |
    null;

  engine:
    string |
    null;

  ecu:
    string |
    null;

  status:
    | "LOCKED"
    | "PROFILE_INCOMPLETE"
    | "READY_FOR_VALIDATION";

  note:
    string;
};


type ProfileInput = {
  imei?: unknown;

  vehicleVerified?: unknown;
  canProfileVerified?: unknown;
  clearProfileVerified?: unknown;

  canChannel?: unknown;
  baudRate?: unknown;
  idType?: unknown;
  sourceAddress?: unknown;

  dm1Read?: unknown;
  dm2Read?: unknown;

  clearActiveConfigured?: unknown;
  clearStoredConfigured?: unknown;

  manufacturer?: unknown;
  vehicleModel?: unknown;
  vehicleYear?: unknown;
  engine?: unknown;
  ecu?: unknown;
};


function asString(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value
    : null;
}


function asBoolean(
  value: unknown,
) {
  return value ===
    true;
}


function asNumber(
  value: unknown,
) {
  return typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
    ? value
    : null;
}


function emptyProfile(
  imei: string,
): J1939RealClearProfile {
  return {
    mode:
      "real",

    imei,

    vehicleVerified:
      false,

    canProfileVerified:
      false,

    clearProfileVerified:
      false,

    /*
     * V1 ABSOLUTE SAFETY LOCK.
     *
     * These two values cannot be enabled
     * from environment configuration.
     */
    realClearEnabled:
      false,

    safetyInterlock:
      "HARD_LOCK_V1",

    transmissionEnabled:
      false,

    canChannel:
      null,

    baudRate:
      null,

    idType:
      null,

    sourceAddress:
      null,

    dm1Read:
      false,

    dm2Read:
      false,

    clearActiveConfigured:
      false,

    clearStoredConfigured:
      false,

    manufacturer:
      null,

    vehicleModel:
      null,

    vehicleYear:
      null,

    engine:
      null,

    ecu:
      null,

    status:
      "LOCKED",

    note:
      "Aucune emission J1939 reelle autorisee dans Safe Architecture V1.",
  };
}


function normalizeProfile(
  imei: string,
  input: ProfileInput,
): J1939RealClearProfile {
  const profile =
    emptyProfile(
      imei,
    );


  profile.vehicleVerified =
    asBoolean(
      input.vehicleVerified,
    );

  profile.canProfileVerified =
    asBoolean(
      input.canProfileVerified,
    );

  profile.clearProfileVerified =
    asBoolean(
      input.clearProfileVerified,
    );


  profile.canChannel =
    input.canChannel ===
        "CAN1" ||
      input.canChannel ===
        "CAN2"
      ? input.canChannel
      : null;


  profile.baudRate =
    asNumber(
      input.baudRate,
    );


  profile.idType =
    input.idType ===
        "29bit" ||
      input.idType ===
        "11bit"
      ? input.idType
      : null;


  profile.sourceAddress =
    asNumber(
      input.sourceAddress,
    );


  profile.dm1Read =
    asBoolean(
      input.dm1Read,
    );

  profile.dm2Read =
    asBoolean(
      input.dm2Read,
    );


  profile.clearActiveConfigured =
    asBoolean(
      input.clearActiveConfigured,
    );

  profile.clearStoredConfigured =
    asBoolean(
      input.clearStoredConfigured,
    );


  profile.manufacturer =
    asString(
      input.manufacturer,
    );

  profile.vehicleModel =
    asString(
      input.vehicleModel,
    );

  profile.vehicleYear =
    asNumber(
      input.vehicleYear,
    );

  profile.engine =
    asString(
      input.engine,
    );

  profile.ecu =
    asString(
      input.ecu,
    );


  const identificationReady =
    profile.vehicleVerified &&
    Boolean(
      profile.manufacturer &&
      profile.vehicleModel,
    );


  const canReady =
    profile.canProfileVerified &&
    Boolean(
      profile.canChannel &&
      profile.baudRate &&
      profile.idType,
    );


  const diagnosticReady =
    profile.dm1Read &&
    profile.dm2Read;


  const clearDefinitionReady =
    profile.clearProfileVerified &&
    profile.clearActiveConfigured &&
    profile.clearStoredConfigured;


  if (
    identificationReady &&
    canReady &&
    diagnosticReady &&
    clearDefinitionReady
  ) {
    /*
     * Still HARD LOCKED.
     *
     * "READY_FOR_VALIDATION" means the profile
     * is structurally complete.
     * It does NOT mean CAN transmission is allowed.
     */
    profile.status =
      "READY_FOR_VALIDATION";

    profile.note =
      "Profil complet mais emission CAN toujours verrouillee par HARD_LOCK_V1.";
  } else {
    profile.status =
      "PROFILE_INCOMPLETE";

    profile.note =
      "Profil J1939 reel incomplet. Emission CAN interdite.";
  }


  return profile;
}


function loadConfiguredProfiles() {
  const raw =
    process.env
      .J1939_REAL_CLEAR_PROFILES_JSON;


  if (
    !raw
  ) {
    return [] as ProfileInput[];
  }


  try {
    const parsed =
      JSON.parse(
        raw,
      );


    if (
      !Array.isArray(
        parsed,
      )
    ) {
      console.warn(
        "[J1939 Real Clear] J1939_REAL_CLEAR_PROFILES_JSON must be an array.",
      );

      return [];
    }


    return parsed as ProfileInput[];
  } catch (error) {
    console.error(
      "[J1939 Real Clear] Invalid profile JSON:",
      error,
    );

    return [];
  }
}


export function getJ1939RealClearProfile(
  imei: string,
): J1939RealClearProfile {
  const configured =
    loadConfiguredProfiles()
      .find(
        (
          item,
        ) =>
          item.imei ===
          imei,
      );


  if (
    !configured
  ) {
    return emptyProfile(
      imei,
    );
  }


  return normalizeProfile(
    imei,
    configured,
  );
}


export function canTransmitRealJ1939Clear(
  _profile:
    J1939RealClearProfile,
) {
  /*
   * ABSOLUTE INTERLOCK V1.
   *
   * Deliberately hard-coded false.
   * No environment variable,
   * UI button or API request can override it.
   */
  return false;
}