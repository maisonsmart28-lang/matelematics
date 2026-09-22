/**
 * Step 10E-4F B1.1: local RabbitMQ normal-path functional test.
 * Benchmark-only: five deterministic messages, isolated negative telemetry IDs,
 * cleanup in finally. No production schema/RLS modifications.
 *
 * Run from the application root:
 *   npx tsx scripts/benchmark/step10e-rabbitmq-b1-normal.ts
 * Requires DATABASE_URL in .env.local and local RabbitMQ on 127.0.0.1:5672.
 */
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import amqp from "amqplib";
import pg from "pg";

if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Missing server-only DATABASE_URL");
const rabbitUrl = process.env.RABBITMQ_URL ?? "amqp://guest:guest@127.0.0.1:5672";
const marker = "benchmark_10e4f_b1";
const exchange = "matelematics.telemetry";
const queue = "matelematics.telemetry.persist";
const dlx = "matelematics.telemetry.dlx";
const dlq = "matelematics.telemetry.dlq";
const total = 5;
const timeoutMs = 60_000;
const pool = new Pool({
  connectionString: databaseUrl,
  max: 2,
  connectionTimeoutMillis: 15_000,
  application_name: "matelematics_step10e4f_b1",
});
type Sample = Record<string, unknown>;
type Envelope = {
  message_id: string;
  schema_version: 1;
  company_id: string;
  vehicle_id: number;
  device_id: string | number | null;
  recorded_at: string;
  received_at: string;
  source: "teltonika";
  payload: { benchmark: string; sequence: number };
  attempt: number;
};
const insertColumns = [
  "id", "company_id", "vehicle_id", "device_id", "codec", "raw_payload",
  "io_values", "can_payload", "metadata", "signal_strength",
  "battery_voltage", "ignition", "source", "recorded_at",
] as const;

async function main() {
  // Distinct deterministic IDs: rerunning the same B1 test must not duplicate logical events.
  // Negative IDs are reserved for this benchmark; source marker allows exact cleanup.
  const base = BigInt("-9000000000000000");
  const runId = "step10e4f-b1-normal-v1";
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let producer: Awaited<ReturnType<typeof amqp.connect>> extends infer C
    ? C extends { createConfirmChannel: (...args: never[]) => Promise<infer T> } ? T : never
    : never;
  let consumer: Awaited<ReturnType<typeof amqp.connect>> extends infer C
    ? C extends { createChannel: (...args: never[]) => Promise<infer T> } ? T : never
    : never;
  let published = 0;
  let confirmed = 0;
  let deliveries = 0;
  let redeliveries = 0;
  let commits = 0;
  let duplicates = 0;
  let acks = 0;
  let failure: unknown;
  let consumerTag: string | undefined;

  try {
    const sampleResult = await pool.query<Sample>(
      `SELECT company_id, vehicle_id, device_id, codec, raw_payload, io_values,
              can_payload, metadata, signal_strength, battery_voltage, ignition
         FROM public.telemetry
        WHERE source IS DISTINCT FROM $1
        ORDER BY recorded_at DESC LIMIT 1`,
      [marker],
    );
    const sample = sampleResult.rows[0];
    if (!sample) throw new Error("No source telemetry row available for B1.1");

    // Remove only residue from this benchmark's own marker.
    await pool.query("DELETE FROM public.telemetry WHERE source = $1", [marker]);

    connection = await amqp.connect(rabbitUrl);
    producer = await connection.createConfirmChannel();
    consumer = await connection.createChannel();

    await producer.assertExchange(exchange, "direct", { durable: true });
    await producer.assertExchange(dlx, "direct", { durable: true });
    await producer.assertQueue(dlq, { durable: true, arguments: { "x-queue-type": "quorum" } });
    await producer.bindQueue(dlq, dlx, "dead");
    await producer.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-queue-type": "quorum",
        "x-dead-letter-exchange": dlx,
        "x-dead-letter-routing-key": "dead",
        "x-delivery-limit": 3,
      },
    });
    await producer.bindQueue(queue, exchange, "persist");
    await consumer.prefetch(100);

    const before = await consumer.checkQueue(queue);
    const beforeDlq = await consumer.checkQueue(dlq);
    if (before.messageCount !== 0 || beforeDlq.messageCount !== 0) {
      throw new Error(
        `B1.1 requires empty benchmark queues; ready=${before.messageCount}, dlq=${beforeDlq.messageCount}. Do not purge automatically.`,
      );
    }

    let resolveDone!: () => void;
    let rejectDone!: (reason: unknown) => void;
    const done = new Promise<void>((resolve, reject) => {
      resolveDone = resolve;
      rejectDone = reject;
    });

    const subscription = await consumer.consume(queue, (message) => {
      if (!message) return;
      void (async () => {
        deliveries++;
        if (message.fields.redelivered) redeliveries++;
        const envelope = JSON.parse(message.content.toString("utf8")) as Envelope;
        if (envelope.schema_version !== 1 || envelope.payload?.benchmark !== marker) {
          throw new Error("Unexpected/non-benchmark message. Stop without ACK.");
        }
        const sequence = envelope.payload.sequence;
        if (!Number.isInteger(sequence) || sequence < 0 || sequence >= total ||
            envelope.message_id !== `${runId}-${sequence}`) {
          throw new Error("Invalid deterministic benchmark identity.");
        }
        const rowId = (base - BigInt(sequence)).toString();
        const row: Record<string, unknown> = {
          ...sample,
          id: rowId,
          source: marker,
          recorded_at: envelope.recorded_at,
          metadata: { ...(sample.metadata && typeof sample.metadata === "object" ? sample.metadata : {}), benchmark_message_id: envelope.message_id },
        };
        const values = insertColumns.map((column) => row[column]);
        const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(",");
        const result = await pool.query(
          `INSERT INTO public.telemetry (${insertColumns.join(",")})
           VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
          values,
        );
        if (result.rowCount === 1) commits++;
        else duplicates++;
        // ACK only after PostgreSQL INSERT/commit returns successfully.
        consumer!.ack(message);
        acks++;
        if (acks === total) resolveDone();
      })().catch((error: unknown) => {
        failure = error;
        rejectDone(error);
        // No ACK on failed persistence. Stop consuming; closing channel will requeue.
      });
    }, { noAck: false });
    consumerTag = subscription.consumerTag;

    const start = Date.now();
    for (let sequence = 0; sequence < total; sequence++) {
      const now = new Date(Date.now() - sequence).toISOString();
      const envelope: Envelope = {
        message_id: `${runId}-${sequence}`,
        schema_version: 1,
        company_id: String(sample.company_id),
        vehicle_id: Number(sample.vehicle_id),
        device_id: sample.device_id == null ? null : String(sample.device_id),
        recorded_at: now,
        received_at: now,
        source: "teltonika",
        payload: { benchmark: marker, sequence },
        attempt: 0,
      };
      producer.publish(exchange, "persist", Buffer.from(JSON.stringify(envelope)), {
        persistent: true,
        mandatory: true,
        contentType: "application/json",
        messageId: envelope.message_id,
      });
      published++;
    }
    await producer.waitForConfirms();
    confirmed = published;
    await Promise.race([
      done,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("B1.1 timed out waiting for ACKs")), timeoutMs)),
    ]);
    if (consumerTag) await consumer.cancel(consumerTag);
    const remaining = await consumer.checkQueue(queue);
    const dead = await consumer.checkQueue(dlq);
    const countResult = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM public.telemetry WHERE source = $1",
      [marker],
    );
    const logicalCommits = Number(countResult.rows[0]?.count ?? 0);
    const passed = published === total && confirmed === total &&
      logicalCommits === total && commits === total && duplicates === 0 &&
      acks === total && remaining.messageCount === 0 && dead.messageCount === 0;
    console.log(JSON.stringify({
      event: "step10e-rabbitmq-b1-normal",
      passed, published, confirmed, deliveries, redeliveries,
      uniqueLogicalCommits: logicalCommits, duplicateDeliveriesDetected: duplicates,
      acks, readyDepth: remaining.messageCount, unackedDepth: 0,
      dlqDepth: dead.messageCount, elapsedMs: Date.now() - start,
      limitations: ["Single-node local RabbitMQ; not an HA test.", "Crash/replay scenarios B1.2–B1.6 not yet tested."],
    }));
    if (!passed) throw new Error("B1.1 assertions failed");
  } finally {
    if (failure) console.error("Consumer failure:", failure instanceof Error ? failure.message : String(failure));
    try { await consumer?.close(); } catch { /* channel may already be closed */ }
    try { await producer?.close(); } catch { /* channel may already be closed */ }
    try { await connection?.close(); } catch { /* connection may already be closed */ }
    try {
      await pool.query("DELETE FROM public.telemetry WHERE source = $1", [marker]);
      const residue = await pool.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM public.telemetry WHERE source = $1", [marker],
      );
      console.log(JSON.stringify({ event: "step10e-rabbitmq-b1-cleanup", remainingRows: Number(residue.rows[0]?.count ?? 0) }));
    } finally {
      await pool.end();
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
