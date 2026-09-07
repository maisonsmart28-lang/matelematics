export type CanProfile =
  | "light_vehicle_can"
  | "j1939_fms"
  | "unknown";

export type DiagnosticCode = {
  code: string;
  source:
    | "can_adapter"
    | "j1939_dm1"
    | "j1939_dm2"
    | "simulator";
  status:
    | "active"
    | "stored";
  description?: string | null;
};

export type NormalizedCanV2 = {
  version: 2;

  source: {
    manufacturer: "teltonika";
    profile: CanProfile;
    simulator: boolean;
    mappingVersion: "2.0";
  };

  engine: {
    rpm: number | null;
    coolantTemperatureC: number | null;
    loadPercent: number | null;
    throttlePercent: number | null;
    engineHours: number | null;
  };

  vehicle: {
    speedKph: number | null;
    odometerKm: number | null;
    ignition: boolean | null;
    movement: boolean | null;
  };

  fuel: {
    levelPercent: number | null;
    levelLiters: number | null;
    consumedLiters: number | null;
    rateLph: number | null;
    averageL100km: number | null;
    adBluePercent: number | null;
    adBlueLiters: number | null;
  };

  doors: {
    frontLeft: boolean | null;
    frontRight: boolean | null;
    rearLeft: boolean | null;
    rearRight: boolean | null;
    hood: boolean | null;
    trunk: boolean | null;
  };

  safety: {
    seatbelt: boolean | null;
    handbrake: boolean | null;
  };

  warnings: {
    checkEngine: boolean | null;
    abs: boolean | null;
    airbag: boolean | null;
    esp: boolean | null;
    oilPressure: boolean | null;
    tpms: boolean | null;
  };

  diagnostics: {
    dtcCount: number | null;
    active: DiagnosticCode[];
    stored: DiagnosticCode[];
  };

  tracker: {
    gsmSignal: number | null;
    externalVoltage: number | null;
    internalBatteryVoltage: number | null;
    satellites: number | null;
  };

  /*
   * Compatibility aliases.
   * Current dashboard V1 can keep reading these fields.
   */
  rpm: number | null;
  speed_kph: number | null;
  fuel_level_percent: number | null;
  fuel_used_litres: number | null;
  coolant_temperature_c: number | null;
  throttle_percent: number | null;
  odometer_km: number | null;
  simulator: boolean;
};