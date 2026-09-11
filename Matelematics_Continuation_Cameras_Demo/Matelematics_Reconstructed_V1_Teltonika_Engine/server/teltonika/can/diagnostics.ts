import type {
  DiagnosticCode,
} from "./types-v2";

const MAX_DIAGNOSTIC_CODE_LENGTH = 80;

export function numericIo(
  io: Record<string, number | string>,
  id: number,
) {
  const value =
    io[`io_${id}`];

  return typeof value === "number"
    ? value
    : null;
}

export function signed16(
  value: number | null,
) {
  if (value === null) {
    return null;
  }

  return value > 0x7fff
    ? value - 0x10000
    : value;
}

export function asciiIo(
  io: Record<string, number | string>,
  id: number,
) {
  const value =
    io[`io_${id}`];

  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(value)
  ) {
    return null;
  }

  const decoded =
    Buffer
      .from(value, "hex")
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();

  if (
    decoded.length === 0 ||
    decoded.includes("\uFFFD")
  ) {
    return null;
  }

  return decoded;
}

function canonicalDiagnosticCode(
  value: string,
) {
  const cleaned =
    value
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_DIAGNOSTIC_CODE_LENGTH);

  if (!cleaned) {
    return null;
  }

  if (/^[PCBU][0-9A-F]{4}$/i.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  const j1939 =
    cleaned.match(
      /^SPN\s*[:#-]?\s*(\d+)\s+FMI\s*[:#-]?\s*(\d+)$/i,
    );

  if (j1939) {
    return `SPN ${j1939[1]} FMI ${j1939[2]}`;
  }

  return cleaned;
}

export function parseDiagnosticPayload({
  payload,
  source,
  status,
}: {
  payload: string | null;
  source: DiagnosticCode["source"];
  status: DiagnosticCode["status"];
}): DiagnosticCode[] {
  if (!payload) {
    return [];
  }

  const result: DiagnosticCode[] = [];
  const seen = new Set<string>();

  for (
    const rawCode of
    payload.split(/[\r\n,;|]+/)
  ) {
    const code =
      canonicalDiagnosticCode(rawCode);

    if (!code) {
      continue;
    }

    const key =
      `${source}|${status}|${code.toUpperCase()}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    result.push({
      code,
      source,
      status,
    });
  }

  return result;
}

function mergeDiagnostics(
  ...groups: DiagnosticCode[][]
) {
  const result: DiagnosticCode[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    for (const diagnostic of group) {
      const key =
        `${diagnostic.source}|${diagnostic.status}|${diagnostic.code.toUpperCase()}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      result.push(diagnostic);
    }
  }

  return result;
}

/*
 * 9001, 9003 and 9004 are MATELEMATICS SIMULATOR ONLY.
 *
 * They are deliberately outside the official Teltonika mapping layer.
 * No production device is allowed to infer DTC payloads from these IDs.
 *
 * 9001 = simulated light vehicle DTC text
 * 9003 = simulated J1939 DM1 text
 * 9004 = simulated J1939 DM2 text
 * 9005 = simulator profile name
 */
export function simulatorDiagnostics(
  io: Record<string, number | string>,
): {
  active: DiagnosticCode[];
  stored: DiagnosticCode[];
} {
  const obdActive =
    parseDiagnosticPayload({
      payload:
        asciiIo(io, 9001),
      source: "simulator",
      status: "active",
    });

  const dm1Active =
    parseDiagnosticPayload({
      payload:
        asciiIo(io, 9003),
      source: "j1939_dm1",
      status: "active",
    });

  const dm2Stored =
    parseDiagnosticPayload({
      payload:
        asciiIo(io, 9004),
      source: "j1939_dm2",
      status: "stored",
    });

  return {
    active:
      mergeDiagnostics(
        obdActive,
        dm1Active,
      ),
    stored:
      mergeDiagnostics(
        dm2Stored,
      ),
  };
}
