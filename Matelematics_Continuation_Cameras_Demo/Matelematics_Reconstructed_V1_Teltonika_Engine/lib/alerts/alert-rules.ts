export type AlertCategory =
  | "diagnostic"
  | "safety"
  | "engine"
  | "electrical"
  | "driving"
  | "connectivity"
  | "location"
  | "other";


export type AlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "info";


export type AlertRuleDefinition = {
  key:
    string;

  label:
    string;

  category:
    AlertCategory;

  defaultSeverity:
    AlertSeverity;

  autoResolve:
    boolean;

  recurrenceTracking:
    boolean;

  description:
    string;
};


export const ALERT_RULES:
  AlertRuleDefinition[] = [

  {
    key:
      "check_engine",

    label:
      "Check Engine",

    category:
      "diagnostic",

    defaultSeverity:
      "high",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Temoin moteur signale par la telemetrie CAN.",
  },


  {
    key:
      "diagnostic_dtc_*",

    label:
      "Code defaut",

    category:
      "diagnostic",

    defaultSeverity:
      "high",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Code diagnostic OBD-II ou J1939 remonte par le vehicule.",
  },


  {
    key:
      "door_open_moving",

    label:
      "Porte ouverte en mouvement",

    category:
      "safety",

    defaultSeverity:
      "critical",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Le vehicule se deplace alors qu'une porte est detectee ouverte.",
  },


  {
    key:
      "coolant_temperature_high",

    label:
      "Temperature moteur elevee",

    category:
      "engine",

    defaultSeverity:
      "critical",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Temperature du liquide de refroidissement superieure au seuil configure.",
  },


  {
    key:
      "battery_voltage_low",

    label:
      "Batterie faible",

    category:
      "electrical",

    defaultSeverity:
      "medium",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Tension d'alimentation inferieure au seuil configure.",
  },


  {
    key:
      "overspeed",

    label:
      "Exces de vitesse",

    category:
      "driving",

    defaultSeverity:
      "high",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Vitesse superieure au seuil autorise pour la regle.",
  },


  {
    key:
      "low_fuel",

    label:
      "Niveau carburant faible",

    category:
      "other",

    defaultSeverity:
      "medium",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Niveau de carburant inferieur au seuil configure.",
  },


  {
    key:
      "engine_rpm_high",

    label:
      "Regime moteur eleve",

    category:
      "engine",

    defaultSeverity:
      "high",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Regime moteur superieur au seuil configure.",
  },


  {
    key:
      "engine_load_high",

    label:
      "Charge moteur elevee",

    category:
      "engine",

    defaultSeverity:
      "medium",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Charge moteur superieure au seuil configure.",
  },


  {
    key:
      "adblue_low",

    label:
      "Niveau AdBlue faible",

    category:
      "other",

    defaultSeverity:
      "high",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Niveau AdBlue inferieur au seuil configure.",
  },

  {
    key:
      "gps_lost",

    label:
      "Signal GPS perdu",

    category:
      "connectivity",

    defaultSeverity:
      "medium",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Aucune position GPS exploitable pendant la duree configuree.",
  },


  {
    key:
      "tracker_offline",

    label:
      "Tracker hors ligne",

    category:
      "connectivity",

    defaultSeverity:
      "high",

    autoResolve:
      true,

    recurrenceTracking:
      true,

    description:
      "Le tracker n'a plus transmis depuis la duree configuree.",
  },

];


export function getAlertRule(
  alertType: string,
): AlertRuleDefinition {
  if (
    alertType.startsWith(
      "diagnostic_dtc_",
    )
  ) {
    return (
      ALERT_RULES.find(
        (
          rule,
        ) =>
          rule.key ===
          "diagnostic_dtc_*",
      ) ??
      fallbackRule(
        alertType,
      )
    );
  }


  return (
    ALERT_RULES.find(
      (
        rule,
      ) =>
        rule.key ===
        alertType,
    ) ??
    fallbackRule(
      alertType,
    )
  );
}


function fallbackRule(
  alertType: string,
): AlertRuleDefinition {
  return {
    key:
      alertType,

    label:
      humanizeAlertType(
        alertType,
      ),

    category:
      "other",

    defaultSeverity:
      "info",

    autoResolve:
      false,

    recurrenceTracking:
      true,

    description:
      "Evenement telematique Matelematics.",
  };
}


export function humanizeAlertType(
  value: string,
) {
  return value
    .replace(
      /^diagnostic_dtc_/,
      "DTC ",
    )
    .replace(
      /_/g,
      " ",
    )
    .replace(
      /\b\w/g,
      (
        char,
      ) =>
        char.toUpperCase(),
    );
}


export function normalizeAlertSeverity(
  value: string | null | undefined,
): AlertSeverity {
  const severity =
    (
      value ??
      ""
    )
      .trim()
      .toLowerCase();


  if (
    severity === "critical" ||
    severity === "critique"
  ) {
    return "critical";
  }


  if (
    severity === "high" ||
    severity === "major" ||
    severity === "important" ||
    severity === "importante" ||
    severity === "error"
  ) {
    return "high";
  }


  if (
    severity === "medium" ||
    severity === "moderate" ||
    severity === "warning"
  ) {
    return "medium";
  }


  return "info";
}