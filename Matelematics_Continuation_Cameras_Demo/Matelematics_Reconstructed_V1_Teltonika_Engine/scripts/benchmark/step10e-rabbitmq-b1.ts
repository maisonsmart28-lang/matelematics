import { randomUUID } from "node:crypto";
import amqp from "amqplib";

type Envelope = {
  message_id: string;
  schema_version: 1;
  company_id: string;
  vehicle_id: number;
  device_id: string | null;
  recorded_at: string;
  received_at: string;
  source: "teltonika";
  payload: Record<string, unknown>;
  attempt: number;
};

const url = process.env.RABBITMQ_URL ?? "amqp://guest:guest@127.0.0.1:5672";
const exchange = "matelematics.telemetry";
const routingKey = "telemetry.persist";
const queue = "matelematics.telemetry.persist";
const dlx = "matelematics.telemetry.dlx";
const dlq = "matelematics.telemetry.dlq";
const dlqRoutingKey = "telemetry.dlq";
const count = Math.max(1, Number(process.env.RABBITMQ_B1_COUNT ?? 25));
const prefetch = 100;
const timeoutMs = Math.max(5_000, Number(process.env.RABBITMQ_B1_TIMEOUT_MS ?? 30_000));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const connection = await amqp.connect(url);
  const setup = await connection.createChannel();
  const publisher = await connection.createConfirmChannel();
  const consumer = await connection.createChannel();

  const metrics = {
    published: 0,
    publisherConfirmed: 0,
    consumedDeliveries: 0,
    redeliveries: 0,
    uniqueLogicalCommits: 0,
    duplicateDeliveriesDetected: 0,
    failedDbAttempts: 0,
    ackCount: 0,
    retryCount: 0,
    dlqCount: 0,
    readyDepth: 0,
    unackedDepth: 0,
    peakBacklog: 0,
    cleanupStatus: "pending",
  };

  const committed = new Set<string>();
  let consumerTag: string | undefined;

  try {
    await setup.assertExchange(exchange, "direct", { durable: true });
    await setup.assertExchange(dlx, "direct", { durable: true });

    await setup.assertQueue(dlq, {
      durable: true,
      arguments: { "x-queue-type": "quorum" },
    });
    await setup.bindQueue(dlq, dlx, dlqRoutingKey);

    await setup.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-queue-type": "quorum",
        "x-dead-letter-exchange": dlx,
        "x-dead-letter-routing-key": dlqRoutingKey,
      },
    });
    await setup.bindQueue(queue, exchange, routingKey);

    // B1.1 starts from an isolated empty benchmark topology.
    await setup.purgeQueue(queue);
    await setup.purgeQueue(dlq);

    await consumer.prefetch(prefetch);

    const done = new Promise<void>(async (resolve, reject) => {
      const result = await consumer.consume(
        queue,
        async (msg) => {
          if (!msg) return;
          metrics.consumedDeliveries++;
          if (msg.fields.redelivered) metrics.redeliveries++;

          try {
            const envelope = JSON.parse(msg.content.toString("utf8")) as Envelope;
            if (!envelope.message_id || envelope.schema_version !== 1) {
              throw new Error("Invalid benchmark envelope");
            }

            // B1.1 isolated persistence guard. Failure scenarios will replace this
            // with the benchmark PostgreSQL target without changing production schema.
            if (committed.has(envelope.message_id)) metrics.duplicateDeliveriesDetected++;
            else {
              committed.add(envelope.message_id);
              metrics.uniqueLogicalCommits++;
            }

            consumer.ack(msg);
            metrics.ackCount++;
            if (metrics.ackCount === count) resolve();
          } catch (error) {
            reject(error);
          }
        },
        { noAck: false },
      );
      consumerTag = result.consumerTag;
    });

    for (let i = 0; i < count; i++) {
      const now = new Date().toISOString();
      const envelope: Envelope = {
        message_id: `benchmark_10e4f_b11_${i.toString().padStart(6, "0")}_${randomUUID()}`,
        schema_version: 1,
        company_id: "00000000-0000-0000-0000-000000000001",
        vehicle_id: i + 1,
        device_id: `BENCH-B1-${i + 1}`,
        recorded_at: now,
        received_at: now,
        source: "teltonika",
        payload: { benchmark: "step10e-4f-b1.1", sequence: i + 1 },
        attempt: 0,
      };

      const accepted = publisher.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(envelope)),
        {
          persistent: true,
          contentType: "application/json",
          messageId: envelope.message_id,
          type: "matelematics.telemetry.benchmark",
          headers: { "x-matelematics-benchmark": "step10e-4f-b1.1" },
        },
      );
      metrics.published++;
      if (!accepted) await new Promise<void>((resolve) => publisher.once("drain", resolve));
    }

    await publisher.waitForConfirms();
    metrics.publisherConfirmed = metrics.published;

    const deadline = Date.now() + timeoutMs;
    while (metrics.ackCount < count && Date.now() < deadline) {
      await Promise.race([done, sleep(25)]);
    }
    if (metrics.ackCount !== count) {
      throw new Error(`Timed out waiting for ACKs: ${metrics.ackCount}/${count}`);
    }

    if (consumerTag) await consumer.cancel(consumerTag);

    const mainState = await setup.checkQueue(queue);
    const dlqState = await setup.checkQueue(dlq);
    metrics.readyDepth = mainState.messageCount;
    metrics.dlqCount = dlqState.messageCount;
    metrics.peakBacklog = count;

    if (
      metrics.publisherConfirmed !== count ||
      metrics.uniqueLogicalCommits !== count ||
      metrics.ackCount !== count ||
      metrics.redeliveries !== 0 ||
      metrics.duplicateDeliveriesDetected !== 0 ||
      metrics.readyDepth !== 0 ||
      metrics.dlqCount !== 0
    ) {
      throw new Error(`B1.1 assertions failed: ${JSON.stringify(metrics)}`);
    }

    metrics.cleanupStatus = "clean";
    console.log(JSON.stringify({
      event: "step10e-rabbitmq-b1.1-summary",
      rabbitmqUrl: "configured",
      exchange,
      queue,
      dlq,
      prefetch,
      expected: count,
      ...metrics,
      result: "PASS",
      limitation: "B1.1 validates RabbitMQ normal-path semantics with an isolated in-process idempotency guard; PostgreSQL commit/replay is validated in subsequent B1 failure scenarios.",
    }));
  } finally {
    if (consumerTag) {
      try { await consumer.cancel(consumerTag); } catch {}
    }
    await Promise.allSettled([consumer.close(), publisher.close(), setup.close()]);
    await connection.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
