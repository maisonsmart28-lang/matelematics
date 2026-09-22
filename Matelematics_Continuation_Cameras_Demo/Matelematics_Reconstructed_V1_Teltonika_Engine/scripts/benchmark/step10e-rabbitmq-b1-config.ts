/** One topology for all B1 scripts. Existing incompatible queues are never purged. */
export const topology = {
  exchange: "matelematics.telemetry",
  queue: "matelematics.telemetry.persist",
  routingKey: "persist",
  dlx: "matelematics.telemetry.dlx",
  dlq: "matelematics.telemetry.dlq",
  deadLetterRoutingKey: "failed",
  deliveryLimit: 3,
  prefetch: 100,
} as const;

export function localRabbitUrl(env: Record<string, string | undefined> = process.env) {
  const primary = env.RABBITMQ_B1_URL;
  const legacy = env.RABBITMQ_URL;
  if (primary && legacy && primary !== legacy) {
    throw new Error("Conflicting RABBITMQ_B1_URL and RABBITMQ_URL. Set only one local URL.");
  }
  const url = primary ?? legacy ?? "amqp://guest:guest@127.0.0.1:5672";
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error("Invalid local RabbitMQ URL (value withheld)."); }
  if (!["amqp:", "amqps:"].includes(parsed.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)) {
    throw new Error("B1 is local-only. Refusing non-local RabbitMQ endpoint.");
  }
  return url;
}
