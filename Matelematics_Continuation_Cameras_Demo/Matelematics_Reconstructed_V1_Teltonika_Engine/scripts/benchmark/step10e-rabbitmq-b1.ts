/**
 * Retired in-memory B1 experiment. Fail before connecting or deleting anything.
 * An in-memory Set cannot validate PostgreSQL commit or durable replay.
 */
console.error(
  "This obsolete B1 script is disabled: it purged queues and used in-memory commits. " +
  "Run npx tsx scripts/benchmark/step10e-rabbitmq-b1-topology.ts for topology preflight. " +
  "B1.1 PostgreSQL and crash/replay validation remain pending.",
);
process.exitCode = 1;
export {};
