/**
 * Step 10E-4F B1: isolated RabbitMQ topology preflight.
 * Creates only the B0-named exchange and queues; does not publish, consume or touch Supabase.
 * Run against the local Docker broker only.
 */
import * as amqp from "amqplib";
import { localRabbitUrl, topology } from "./step10e-rabbitmq-b1-config";

const { exchange, queue, dlx, dlq } = topology;

async function main() {
  const url = localRabbitUrl();
  const connection = await amqp.connect(url, { timeout: 10_000 });
  // AMQP channel failures emit error as well as rejecting the awaited RPC.
  connection.on("error", () => undefined);
  try {
    const channel = await connection.createConfirmChannel();
    channel.on("error", () => undefined);
    try {
      await channel.assertExchange(exchange, "direct", { durable: true });
      await channel.assertExchange(dlx, "direct", { durable: true });
      await channel.assertQueue(dlq, {
        durable: true,
        arguments: { "x-queue-type": "quorum" },
      });
      await channel.bindQueue(dlq, dlx, topology.deadLetterRoutingKey);
      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          "x-queue-type": "quorum",
          "x-dead-letter-exchange": dlx,
          "x-dead-letter-routing-key": topology.deadLetterRoutingKey,
          "x-delivery-limit": topology.deliveryLimit,
        },
      });
      await channel.bindQueue(queue, exchange, topology.routingKey);
      await channel.prefetch(topology.prefetch);

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
        prefetch: topology.prefetch,
        deliveryLimit: topology.deliveryLimit,
        mainDepth: mainState.messageCount,
        dlqDepth: deadState.messageCount,
        note: "Topology preflight only; DB commit, ACK, idempotency and failure/replay scenarios are not yet validated.",
      }));
    } finally {
      await channel.close().catch(() => undefined);
    }
  } finally {
    await connection.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error("RabbitMQ B1 topology preflight failed:", error instanceof Error ? error.message.replace(/amqps?:\/\/[^\s]+/g, "[RabbitMQ URL withheld]") : "Unknown error");
  console.error("If PRECONDITION_FAILED reports inequivalent queue arguments, stop and inspect the existing queue. Do not delete or purge it.");
  process.exitCode = 1;
});
