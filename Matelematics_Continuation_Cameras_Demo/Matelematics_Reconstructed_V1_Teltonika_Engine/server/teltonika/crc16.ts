/** Teltonika CRC-16/IBM used for AVL packet validation. */
export function crc16Ibm(buffer: Buffer): number {
  let crc = 0;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xa001;
      } else {
        crc >>>= 1;
      }
    }
  }

  return crc & 0xffff;
}
