/**
 * Step 10E-4F B1: isolated RabbitMQ topology preflight.
 * Creates only the B0-named exchange and queues; does not publish, consume or touch Supabase.
 * Run against the local Docker broker only.
 */
import * as amqp from "amqplib";

const exchange = "matelematics.telemetry";
const queue = "matelematics.telemetry.persist";
const dlx = "matelematics.telemetry.dlx";
const dlq = "matelematics.telemetry.dlq";

async function main() {
  const url = process.env.RABBITMQ_B1_URL ?? "amqp://guest:guest@127.0.0.1:5672";
  const parsed = new URL(url);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(parsed.hostname)) {
    throw new Error("B1 preflight is local-only. Refusing non-local RabbitMQ host.");
  }

  const connection = await amqp.connect(url);
  try {
    const channel = await connection.createConfirmChannel();
    try {
      await channel.assertExchange(exchange, "direct", { durable: true });
      await channel.assertExchange(dlx, "direct", { durable: true });
      await channel.assertQueue(dlq, {
        durable: true,
        arguments: { "x-queue-type": "quorum" },
      });
      await channel.bindQueue(dlq, dlx, "failed");
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          "x-queue-type": "quorum",
          "x-dead-letter-exchange": dlx,
          "x-dead-letter-routing-key": "failed",
          "x-delivery-limit": 3,
        },
      });
      await channel.bindQueue(queue, exchange, "persist");
      await channel.prefetch(100);

      const mainState = await channel.checkQueue(queue);
      const deadState = await channel.checkQueue(dlq);
      console.log(JSON.stringify({
        event: "step10e-rabbitmq-b1-topology",
        status: "ok",
        broker: "local",
        exchange,
        queue,
        queueType: "quorum",
        dlx,
        dlq,
        publisherConfirmChannel: true,
        manualAckRequiredForConsumers: true,
        prefetch: 100,
        deliveryLimit: 3,
        mainDepth: mainState.messageCount,
        dlqDepth: deadState.messageCount,
        note: "Topology preflight only; DB commit, ACK, idempotency and failure/replay scenarios are not yet validated.",
      }));
    } finally {
      await channel.close();
    }
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error("RabbitMQ B1 topology preflight failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
