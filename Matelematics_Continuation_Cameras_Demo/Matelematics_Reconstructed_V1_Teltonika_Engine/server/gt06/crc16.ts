export function crc16X25(data: Buffer): number {
  let crc = 0xffff;

  for (const byte of data) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >>> 1) ^ 0x8408;
      } else {
        crc >>>= 1;
      }
    }
  }

  return (~crc) & 0xffff;
}
