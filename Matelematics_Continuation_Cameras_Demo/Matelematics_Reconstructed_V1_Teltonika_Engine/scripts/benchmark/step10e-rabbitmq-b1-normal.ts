/** Step 10E-4F B1.1: local RabbitMQ -> local isolated PostgreSQL. */
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

type Connection = Awaited<ReturnType<typeof amqp.connect>>;
type Channel = Awaited<ReturnType<Connection['createChannel']>>;
const total = 5;
async function main() {
  const rabbitUrl = localRabbitUrl();
  const dbUrl = benchmarkDatabaseUrl();
  const runId = randomUUID();
  const db = new pg.Client({ connectionString: dbUrl, ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000,
    query_timeout: 15000, application_name: 'matelematics_b1_local' });
  const events: Envelope[] = Array.from({ length: total }, (_, sequence) => ({
    message_id: `${runId}:${sequence}`, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002', device_id: 'B1-SYNTHETIC',
    recorded_at: new Date().toISOString(), received_at: new Date().toISOString(),
    source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence }, attempt: 0,
  }));
  const expected = new Map(events.map(e => [e.message_id, JSON.stringify(e)]));
  const seen = new Set<string>();
  let conn: Connection | undefined;
  let publisher: Awaited<ReturnType<Connection['createConfirmChannel']>> | undefined;
  let consumer: Channel | undefined;
  let consumerTag: string | undefined;
  let closing = false;
  let fatal: Error | undefined;
  let work = Promise.resolve();
  let published = 0, confirmed = 0, deliveries = 0, committed = 0, acks = 0;
  const fail = (e: unknown) => { fatal ??= e instanceof Error ? e : new Error('Broker failure'); };
  let completed = false;
  try {
    await db.connect();
    db.on('error', fail);
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1 run is in progress');
    await db.query('CREATE SCHEMA IF NOT EXISTS b1');
    await db.query(`CREATE TABLE IF NOT EXISTS b1.events (
      message_id text PRIMARY KEY, run_id uuid NOT NULL, envelope jsonb NOT NULL,
      committed_at timestamptz NOT NULL DEFAULT clock_timestamp())`);
    const leftovers = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (leftovers.rows[0].n !== 0) throw new Error('Prior B1 events remain; inspect them before rerunning');

    conn = await amqp.connect(rabbitUrl, { timeout: 10000 });
    conn.on('error', fail);
    conn.on('close', () => { if (!closing) fail(new Error('Broker connection closed')); });
    publisher = await conn.createConfirmChannel();
    consumer = await conn.createChannel();
    for (const ch of [publisher, consumer]) {
      ch.on('error', fail);
      ch.on('close', () => { if (!closing) fail(new Error('Broker channel closed')); });
    }
    publisher.on('return', () => fail(new Error('Mandatory publish was unroutable')));
    await publisher.checkExchange(topology.exchange);
    const before = await consumer.checkQueue(topology.queue);
    const deadBefore = await consumer.checkQueue(topology.dlq);
    if (before.messageCount || before.consumerCount || deadBefore.messageCount || deadBefore.consumerCount)
      throw new Error('Queues must be empty without consumers; no automatic purge');
    await consumer.prefetch(topology.prefetch);
    const worker = consumer;
    const subscription = await worker.consume(topology.queue, msg => {
      if (!msg) { fail(new Error('Consumer unexpectedly cancelled')); return; }
      work = work.then(async () => {
        if (fatal) return;
        deliveries++;
        if (msg.fields.redelivered) throw new Error('Unexpected redelivery in B1.1');
        const raw = msg.content.toString('utf8');
        const event = JSON.parse(raw) as Envelope;
        if (expected.get(event.message_id) !== raw || msg.properties.messageId !== event.message_id)
          throw new Error('Unexpected message: preserved without ACK');
        if (seen.has(event.message_id)) throw new Error('Unexpected duplicate delivery in B1.1');
        const inserted = await persistThenAck(db, runId, event, () => {
          if (fatal) throw fatal;
          worker.ack(msg);
          acks++;
        });
        if (!inserted) throw new Error('Unexpected pre-existing identity');
        committed++;
        seen.add(event.message_id);
      }).catch(fail);
    }, { noAck: false, exclusive: true });
    consumerTag = subscription.consumerTag;
    for (const event of events) {
      if (fatal) throw fatal;
      publisher.publish(topology.exchange, topology.routingKey, Buffer.from(JSON.stringify(event)),
        { persistent: true, mandatory: true, contentType: 'application/json', messageId: event.message_id });
      published++;
      await publisher.waitForConfirms();
      if (fatal) throw fatal;
      confirmed++;
    }
    const deadline = Date.now() + 60000;
    while (seen.size < total && !fatal && Date.now() < deadline) await sleep(25);
    if (fatal) throw fatal;
    if (seen.size !== total) throw new Error('Timed out waiting for committed events');
    await worker.cancel(consumerTag);
    consumerTag = undefined;
    await work;
    closing = true;
    await worker.close();
    consumer = undefined;
    const queue = await publisher.checkQueue(topology.queue);
    const dlq = await publisher.checkQueue(topology.dlq);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (published !== total || confirmed !== total || deliveries !== total || committed !== total ||
        acks !== total || rows.rows.length !== total ||
        rows.rows.some(row => !expected.has(row.message_id)) ||
        queue.messageCount || queue.consumerCount || dlq.messageCount)
      throw new Error('B1.1 failed assertions; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (remaining.rows[0].n !== 0) throw new Error('B1.1 cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-normal', result: 'PASS', runId,
      published, confirmed, deliveries, uniqueLogicalCommits: rows.rows.length,
      acks, readyDepth: queue.messageCount, dlqDepth: dlq.messageCount,
      unackedDepth: null, consumerChannelClosed: true, remainingRows: remaining.rows[0].n,
      note: 'Broker-wide unacked counter and crash/replay scenarios remain to be checked' }));
  } finally {
    closing = true;
    fail(new Error('Stopping B1 run'));
    if (consumer && consumerTag) await consumer.cancel(consumerTag).catch(() => undefined);
    await work;
    if (consumer) await consumer.close().catch(() => undefined);
    if (publisher) await publisher.close().catch(() => undefined);
    if (conn) await conn.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b1-incomplete', runId,
      published, confirmed, committed, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => {
  const message = error instanceof Error ? error.message : 'Unknown B1 error';
  console.error(message.replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
