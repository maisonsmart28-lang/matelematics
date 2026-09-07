import type {
  DiagnosticCode,
} from "./types-v2";

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
    value.length === 0
  ) {
    return null;
  }

  try {
    return Buffer
      .from(value, "hex")
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
  } catch {
    return null;
  }
}

/*
 * 9001 and 9003 are MATELEMATICS SIMULATOR ONLY.
 *
 * They are deliberately outside the official mapping layer.
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
  const active: DiagnosticCode[] = [];
  const stored: DiagnosticCode[] = [];

  const obd =
    asciiIo(io, 9001);

  if (obd) {
    active.push({
      code: obd,
      source: "simulator",
      status: "active",
    });
  }

  const dm1 =
    asciiIo(io, 9003);

  if (dm1) {
    active.push({
      code: dm1,
      source: "j1939_dm1",
      status: "active",
    });
  }

  const dm2 =
    asciiIo(io, 9004);

  if (dm2) {
    stored.push({
      code: dm2,
      source: "j1939_dm2",
      status: "stored",
    });
  }

  return {
    active,
    stored,
  };
}