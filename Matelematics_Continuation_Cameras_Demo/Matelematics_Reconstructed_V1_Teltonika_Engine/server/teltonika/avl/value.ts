import type { IoValue } from "../types";
import type { AvlDefinition } from "./catalog";

function rawBytes(io: IoValue): Buffer {
  return Buffer.from(io.rawHex, "hex");
}

function unsignedBigInt(io: IoValue): bigint {
  const bytes = rawBytes(io);
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return value;
}

function signedBigInt(io: IoValue): bigint {
  const unsigned = unsignedBigInt(io);
  const bits = BigInt(io.size * 8);

  if (bits === 0n) {
    return 0n;
  }

  const signBit = 1n << (bits - 1n);
  return (unsigned & signBit) === 0n
    ? unsigned
    : unsigned - (1n << bits);
}

function numericValue(
  exact: bigint,
  multiplier: number,
): number | string {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafe = BigInt(Number.MIN_SAFE_INTEGER);

  if (exact <= maxSafe && exact >= minSafe) {
    return Number(exact) * multiplier;
  }

  if (multiplier === 1) {
    return exact.toString(10);
  }

  throw new Error(
    `AVL value ${exact} cannot be multiplied by ${multiplier} without losing integer precision`,
  );
}

function validateLength(io: IoValue, definition: AvlDefinition) {
  if (
    definition.bytes !== "variable" &&
    io.size !== definition.bytes
  ) {
    throw new Error(
      `AVL ${definition.id} (${definition.name}) expected ${definition.bytes} bytes, received ${io.size}`,
    );
  }
}

/**
 * Interpret the raw wire value only after a source-specific AVL definition has
 * been selected. This prevents the same numeric AVL ID from being guessed as
 * the wrong physical quantity when different Teltonika sources reuse IDs.
 */
export function interpretAvlValue(
  io: IoValue,
  definition: AvlDefinition,
): number | string {
  if (io.id !== definition.id) {
    throw new Error(
      `AVL definition mismatch: IO ${io.id} cannot use definition ${definition.id}`,
    );
  }

  validateLength(io, definition);

  if (definition.valueType === "ascii") {
    return rawBytes(io)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
  }

  if (definition.valueType === "binary") {
    return io.rawHex;
  }

  const exact = definition.valueType === "signed"
    ? signedBigInt(io)
    : unsignedBigInt(io);

  return numericValue(exact, definition.multiplier);
}

export function exactUnsignedDecimal(io: IoValue): string {
  return unsignedBigInt(io).toString(10);
}

export function exactSignedDecimal(io: IoValue): string {
  return signedBigInt(io).toString(10);
}
