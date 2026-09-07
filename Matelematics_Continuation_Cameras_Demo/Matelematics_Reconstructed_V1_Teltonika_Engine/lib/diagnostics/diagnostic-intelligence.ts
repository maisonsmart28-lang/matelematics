export type DiagnosticRisk =
  | "critical"
  | "high"
  | "moderate"
  | "low"
  | "unknown";


export type DrivingAdvice =
  | "stop"
  | "limited"
  | "service_soon"
  | "monitor"
  | "unknown";


export type DiagnosticIntelligence = {
  code:
    string;

  protocol:
    "obd2" |
    "j1939" |
    "unknown";

  known:
    boolean;

  risk:
    DiagnosticRisk;

  family:
    string;

  title:
    string;

  explanation:
    string;

  possibleEffects:
    string[];

  recommendedActions:
    string[];

  drivingAdvice:
    DrivingAdvice;

  drivingAdviceText:
    string;

  disclaimer:
    string;
};


type KnownDiagnostic =
  Omit<
    DiagnosticIntelligence,
    | "code"
    | "known"
    | "protocol"
    | "disclaimer"
  >;


const DISCLAIMER =
  "Aide au diagnostic uniquement. La telemetrie ne remplace pas le diagnostic constructeur ou atelier.";


/*
 * Curated Matelematics knowledge base.
 *
 * Only codes explicitly registered here receive
 * a code-specific explanation.
 *
 * Unknown codes always use a safe fallback.
 */
const OBD2_KNOWLEDGE:
  Record<
    string,
    KnownDiagnostic
  > = {

  P0069: {
    risk:
      "high",

    family:
      "Admission / gestion moteur",

    title:
      "Correlation pression collecteur / pression barometrique",

    explanation:
      "Le calculateur detecte une incoherence entre les informations de pression d'admission et de pression atmospherique utilisees pour calculer la charge moteur.",

    possibleEffects: [
      "Perte de puissance",
      "Mode degrade possible",
      "Reponse moteur anormale",
      "Consommation pouvant augmenter",
      "Temoin moteur possible",
    ],

    recommendedActions: [
      "Controler la coherence des valeurs MAP et BARO",
      "Verifier capteur MAP et connectique",
      "Verifier alimentation et masse des capteurs",
      "Inspecter le faisceau",
      "Verifier les durites et le circuit d'admission",
      "Comparer les valeurs avant remplacement d'une piece",
    ],

    drivingAdvice:
      "limited",

    drivingAdviceText:
      "Conduite prudente uniquement si le vehicule reste stable. En cas de forte perte de puissance, mode degrade ou comportement anormal, effectuer un diagnostic atelier.",
  },

};


/*
 * J1939 FMI semantics.
 *
 * We can explain the FMI without pretending to know
 * the exact vehicle/ECU implementation of every SPN.
 */
const FMI_KNOWLEDGE:
  Record<
    number,
    {
      title: string;
      risk: DiagnosticRisk;
      explanation: string;
    }
  > = {

  0: {
    title:
      "Valeur au-dessus de la plage normale",
    risk:
      "high",
    explanation:
      "Le parametre J1939 est valide mais sa valeur est superieure a la plage de fonctionnement normale.",
  },

  1: {
    title:
      "Valeur en dessous de la plage normale",
    risk:
      "high",
    explanation:
      "Le parametre J1939 est valide mais sa valeur est inferieure a la plage de fonctionnement normale.",
  },

  2: {
    title:
      "Donnees intermittentes ou incorrectes",
    risk:
      "moderate",
    explanation:
      "Le signal J1939 est instable, intermittent ou considere incorrect par l'ECU.",
  },

  3: {
    title:
      "Tension au-dessus de la normale",
    risk:
      "high",
    explanation:
      "L'ECU detecte une tension ou un court-circuit vers une source haute sur le circuit associe.",
  },

  4: {
    title:
      "Tension en dessous de la normale",
    risk:
      "high",
    explanation:
      "L'ECU detecte une tension trop basse ou un court-circuit vers la masse sur le circuit associe.",
  },

  5: {
    title:
      "Courant en dessous de la normale",
    risk:
      "moderate",
    explanation:
      "Le courant mesure sur le circuit associe est inferieur a la valeur attendue.",
  },

  6: {
    title:
      "Courant au-dessus de la normale",
    risk:
      "high",
    explanation:
      "Le courant mesure sur le circuit associe est superieur a la valeur attendue.",
  },

  7: {
    title:
      "Systeme mecanique ne repondant pas correctement",
    risk:
      "high",
    explanation:
      "Le composant ou mecanisme associe ne repond pas comme attendu par le calculateur.",
  },

  8: {
    title:
      "Frequence ou largeur d'impulsion anormale",
    risk:
      "moderate",
    explanation:
      "Le signal presente une frequence, une periode ou une largeur d'impulsion en dehors de la plage attendue.",
  },

  9: {
    title:
      "Taux de mise a jour anormal",
    risk:
      "moderate",
    explanation:
      "Les informations du parametre ne sont pas actualisees au rythme attendu.",
  },

  12: {
    title:
      "Composant ou dispositif defectueux",
    risk:
      "high",
    explanation:
      "Le calculateur identifie une defaillance interne ou fonctionnelle du composant associe.",
  },

  13: {
    title:
      "Hors calibration",
    risk:
      "moderate",
    explanation:
      "Le parametre ou composant est considere hors calibration par l'ECU.",
  },

  14: {
    title:
      "Instruction speciale",
    risk:
      "moderate",
    explanation:
      "Le FMI indique une condition speciale definie par le constructeur ou le systeme concerne.",
  },

  15: {
    title:
      "Valeur haute - niveau peu severe",
    risk:
      "moderate",
    explanation:
      "La valeur est superieure a la normale avec un niveau de severite limite.",
  },

  16: {
    title:
      "Valeur haute - niveau modere",
    risk:
      "high",
    explanation:
      "La valeur est superieure a la normale avec un niveau de severite modere.",
  },

  17: {
    title:
      "Valeur basse - niveau peu severe",
    risk:
      "moderate",
    explanation:
      "La valeur est inferieure a la normale avec un niveau de severite limite.",
  },

  18: {
    title:
      "Valeur basse - niveau modere",
    risk:
      "high",
    explanation:
      "La valeur est inferieure a la normale avec un niveau de severite modere.",
  },

  19: {
    title:
      "Donnees reseau recues avec erreur",
    risk:
      "moderate",
    explanation:
      "Les donnees provenant du reseau sont considerees erronees ou non fiables.",
  },

  31: {
    title:
      "Condition existante",
    risk:
      "unknown",
    explanation:
      "Le calculateur signale qu'une condition definie par le constructeur est presente.",
  },

};


function parseJ1939Code(
  code: string,
) {
  const match =
    /^SPN\s*(\d+)[-_ /]?FMI\s*(\d+)$/i
      .exec(
        code.trim(),
      );


  if (
    !match
  ) {
    return null;
  }


  const spn =
    Number(
      match[1],
    );

  const fmi =
    Number(
      match[2],
    );


  if (
    !Number.isFinite(spn) ||
    !Number.isFinite(fmi)
  ) {
    return null;
  }


  return {
    spn,
    fmi,
  };
}


function unknownDiagnostic(
  code: string,
): DiagnosticIntelligence {
  return {
    code,

    protocol:
      "unknown",

    known:
      false,

    risk:
      "unknown",

    family:
      "Non classe",

    title:
      "Code diagnostic non documente",

    explanation:
      "Le code a bien ete recu du vehicule, mais Matelematics ne dispose pas encore d'une fiche technique validee pour ce code.",

    possibleEffects: [],

    recommendedActions: [
      "Consulter la documentation constructeur correspondant au vehicule et a l'ECU",
      "Conserver le code et les conditions d'apparition",
      "Effectuer un diagnostic atelier si le defaut est actif ou recurrent",
    ],

    drivingAdvice:
      "unknown",

    drivingAdviceText:
      "Impossible de determiner de maniere fiable la conduite a tenir uniquement a partir de ce code.",

    disclaimer:
      DISCLAIMER,
  };
}


function genericObd2(
  code: string,
): DiagnosticIntelligence {
  let family =
    "Diagnostic OBD-II";

  const prefix =
    code
      .charAt(0)
      .toUpperCase();


  if (
    prefix === "P"
  ) {
    family =
      "Groupe motopropulseur";
  } else if (
    prefix === "B"
  ) {
    family =
      "Carrosserie";
  } else if (
    prefix === "C"
  ) {
    family =
      "Chassis";
  } else if (
    prefix === "U"
  ) {
    family =
      "Communication reseau";
  }


  return {
    ...unknownDiagnostic(
      code,
    ),

    protocol:
      "obd2",

    family,

    title:
      "Code OBD-II non encore documente",

    explanation:
      "Le format du code OBD-II est reconnu, mais sa signification detaillee n'est pas encore presente dans la base Matelematics.",
  };
}


function j1939Diagnostic(
  code: string,
  spn: number,
  fmi: number,
): DiagnosticIntelligence {
  const fmiInfo =
    FMI_KNOWLEDGE[
      fmi
    ];


  if (
    !fmiInfo
  ) {
    return {
      ...unknownDiagnostic(
        code,
      ),

      protocol:
        "j1939",

      family:
        `J1939 - SPN ${spn}`,

      title:
        `SPN ${spn} / FMI ${fmi}`,

      explanation:
        "Le format J1939 est reconnu, mais ce FMI n'est pas encore documente dans la base locale Matelematics.",
    };
  }


  return {
    code,

    protocol:
      "j1939",

    /*
     * FMI is known, but the SPN itself is not
     * automatically given an OEM-specific meaning.
     */
    known:
      true,

    risk:
      fmiInfo.risk,

    family:
      `J1939 - SPN ${spn}`,

    title:
      `SPN ${spn} / FMI ${fmi} - ${fmiInfo.title}`,

    explanation:
      `${fmiInfo.explanation} La signification exacte du SPN ${spn} doit etre confirmee avec la documentation du vehicule ou de l'ECU.`,

    possibleEffects: [
      "Effet dependant du parametre SPN concerne",
      "Impact pouvant varier selon le constructeur et l'ECU",
    ],

    recommendedActions: [
      `Identifier la definition constructeur du SPN ${spn}`,
      "Verifier si le defaut est actif, memorise ou recurrent",
      "Comparer les donnees CAN associees avant remplacement d'un composant",
      "Consulter la documentation atelier du vehicule",
    ],

    drivingAdvice:
      fmiInfo.risk ===
        "high"
        ? "limited"
        : "service_soon",

    drivingAdviceText:
      fmiInfo.risk ===
        "high"
        ? "Limiter l'utilisation tant que le SPN concerne n'a pas ete identifie et controle, surtout si le vehicule presente un symptome."
        : "Controle recommande. La conduite a tenir depend du parametre SPN et des symptomes presents.",

    disclaimer:
      DISCLAIMER,
  };
}


export function getDiagnosticIntelligence(
  rawCode: string,
): DiagnosticIntelligence {
  const code =
    rawCode
      .trim()
      .toUpperCase();


  const exact =
    OBD2_KNOWLEDGE[
      code
    ];


  if (
    exact
  ) {
    return {
      code,

      protocol:
        "obd2",

      known:
        true,

      ...exact,

      disclaimer:
        DISCLAIMER,
    };
  }


  const j1939 =
    parseJ1939Code(
      code,
    );


  if (
    j1939
  ) {
    return j1939Diagnostic(
      code,
      j1939.spn,
      j1939.fmi,
    );
  }


  if (
    /^[PBCU][0-9A-F]{4}$/i.test(
      code,
    )
  ) {
    return genericObd2(
      code,
    );
  }


  return unknownDiagnostic(
    code,
  );
}


export function riskLabel(
  risk: DiagnosticRisk,
) {
  if (
    risk === "critical"
  ) {
    return "CRITIQUE";
  }


  if (
    risk === "high"
  ) {
    return "ELEVE";
  }


  if (
    risk === "moderate"
  ) {
    return "MODERE";
  }


  if (
    risk === "low"
  ) {
    return "FAIBLE";
  }


  return "INCONNU";
}


export function riskClasses(
  risk: DiagnosticRisk,
) {
  if (
    risk === "critical"
  ) {
    return "bg-red-500/10 text-red-300 ring-red-500/20";
  }


  if (
    risk === "high"
  ) {
    return "bg-orange-500/10 text-orange-300 ring-orange-500/20";
  }


  if (
    risk === "moderate"
  ) {
    return "bg-amber-500/10 text-amber-300 ring-amber-500/20";
  }


  if (
    risk === "low"
  ) {
    return "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20";
  }


  return "bg-slate-500/10 text-slate-300 ring-slate-500/20";
}


export function drivingAdviceLabel(
  advice: DrivingAdvice,
) {
  if (
    advice === "stop"
  ) {
    return "ARRET RECOMMANDE";
  }


  if (
    advice === "limited"
  ) {
    return "UTILISATION LIMITEE";
  }


  if (
    advice === "service_soon"
  ) {
    return "CONTROLE RAPIDE";
  }


  if (
    advice === "monitor"
  ) {
    return "SURVEILLER";
  }


  return "A DETERMINER";
}