export function createConnectionLimiter(maxTotal: number, maxPerIp: number) {
  if (!Number.isInteger(maxTotal) || maxTotal < 1 || maxTotal > 100_000 ||
      !Number.isInteger(maxPerIp) || maxPerIp < 1 || maxPerIp > maxTotal) {
    throw new Error("Invalid Teltonika connection limits");
  }
  let total = 0;
  const counts = new Map<string, number>();
  return {
    acquire(ip: string | undefined): (() => void) | null {
      // Reject unknown peers rather than allowing unbounded anonymous buckets.
      if (!ip || total >= maxTotal || (counts.get(ip) ?? 0) >= maxPerIp) return null;
      total++;
      counts.set(ip, (counts.get(ip) ?? 0) + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        total--;
        const count = (counts.get(ip) ?? 1) - 1;
        if (count === 0) counts.delete(ip);
        else counts.set(ip, count);
      };
    },
    snapshot() { return { total, peers: counts.size }; },
  };
}
