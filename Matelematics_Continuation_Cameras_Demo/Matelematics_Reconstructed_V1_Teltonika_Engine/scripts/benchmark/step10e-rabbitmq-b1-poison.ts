/** B1.5: bounded poison redelivery to an inspectable DLQ, with a healthy event. */
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

async function main() {
  const runId = randomUUID();
  const healthy: Envelope = {
    message_id: `${runId}:healthy`, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002',
    device_id: 'B1-SYNTHETIC', recorded_at: new Date().toISOString(),
    received_at: new Date().toISOString(), source: 'teltonika',
    payload: { benchmark: 'step10e4f_b1', sequence: 0 }, attempt: 0,
  };
  const poisonId = `${runId}:poison`;
  // Deliberately violates the envelope contract, while retaining a traceable ID.
  const poisonRaw = JSON.stringify({ message_id: poisonId, schema_version: 1,
    payload: { benchmark: 'step10e4f_b1', sequence: 1 }, company_id: null });
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b1_local' });
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let publisher: Awaited<ReturnType<NonNullable<typeof connection>['createConfirmChannel']>> | undefined;
  let worker: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let inspector: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let published = 0, confirmed = 0, poisonDeliveries = 0;
  let poisonRedeliveries = 0, failedValidationAttempts = 0;
  let healthyCommits = 0, acks = 0, completed = false;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected benchmark database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1 run is in progress');
    await db.query('CREATE SCHEMA IF NOT EXISTS b1');
    await db.query(`CREATE TABLE IF NOT EXISTS b1.events (
      message_id text PRIMARY KEY, run_id uuid NOT NULL, envelope jsonb NOT NULL,
      committed_at timestamptz NOT NULL DEFAULT clock_timestamp())`);
    const leftovers = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (leftovers.rows[0].n !== 0) throw new Error('Prior B1 events remain; inspect before rerunning');
    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    publisher = await connection.createConfirmChannel();
    worker = await connection.createChannel();
    await publisher.checkExchange(topology.exchange);
    const before = await publisher.checkQueue(topology.queue);
    const deadBefore = await publisher.checkQueue(topology.dlq);
    if (before.messageCount || before.consumerCount || deadBefore.messageCount || deadBefore.consumerCount)
      throw new Error('Queues must be empty without consumers; no automatic purge');
    let returned = false;
    publisher.on('return', () => { returned = true; });
    for (const [id, raw] of [[poisonId, poisonRaw], [healthy.message_id, JSON.stringify(healthy)]]) {
      publisher.publish(topology.exchange, topology.routingKey, Buffer.from(raw),
        { persistent: true, mandatory: true, contentType: 'application/json', messageId: id });
      published++;
      await publisher.waitForConfirms();
      if (returned) throw new Error('Mandatory publish was unroutable');
      confirmed++;
    }

    // basic.get has no consumer registration. Bound retries and wait between nacks.
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const msg = await worker.get(topology.queue, { noAck: false });
      if (!msg) {
        const dead = await publisher.checkQueue(topology.dlq);
        if (dead.messageCount === 1 && healthyCommits === 1) break;
        await sleep(100);
        continue;
      }
      const raw = msg.content.toString('utf8');
      if (msg.properties.messageId === poisonId && raw === poisonRaw) {
        poisonDeliveries++;
        if (msg.fields.redelivered) poisonRedeliveries++;
        if (poisonDeliveries > topology.deliveryLimit + 2)
          throw new Error('Poison retry bound exceeded; message retained without ACK');
        const decoded = JSON.parse(raw) as { company_id?: unknown };
        if (typeof decoded.company_id === 'string')
          throw new Error('Poison unexpectedly passed validation');
        failedValidationAttempts++;
        worker.nack(msg, false, true); // broker delivery limit routes to DLQ
        await sleep(100);
      } else if (msg.properties.messageId === healthy.message_id && raw === JSON.stringify(healthy)) {
        if (healthyCommits) throw new Error('Unexpected healthy duplicate; message retained');
        if (!await persistThenAck(db, runId, healthy, () => { worker!.ack(msg); acks++; }))
          throw new Error('Healthy event identity already exists');
        healthyCommits++;
      } else throw new Error('Unexpected message; retained without ACK');
    }
    await worker.close();
    worker = undefined;
    const ready = await publisher.checkQueue(topology.queue);
    const dead = await publisher.checkQueue(topology.dlq);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (published !== 2 || confirmed !== 2 || healthyCommits !== 1 || acks !== 1 ||
        poisonDeliveries < 2 || poisonDeliveries > topology.deliveryLimit + 2 ||
        failedValidationAttempts !== poisonDeliveries || poisonRedeliveries < 1 ||
        ready.messageCount || ready.consumerCount || dead.messageCount !== 1 ||
        rows.rows.length !== 1 || rows.rows[0].message_id !== healthy.message_id)
      throw new Error('B1.5 assertion failed; evidence retained');
    inspector = await connection.createChannel();
    const deadMessage = await inspector.get(topology.dlq, { noAck: false });
    if (!deadMessage || deadMessage.properties.messageId !== poisonId ||
        deadMessage.content.toString('utf8') !== poisonRaw)
      throw new Error('Unexpected DLQ message; retained without ACK');
    const death = deadMessage.properties.headers?.['x-death'];
    if (!Array.isArray(death) || !death.some((entry: { reason?: string }) =>
      entry.reason === 'delivery_limit'))
      throw new Error('DLQ death reason is not delivery_limit; retained without ACK');
    inspector.nack(deadMessage, false, true); // inspect only; never delete poison
    await inspector.close();
    inspector = undefined;
    const settledDeadline = Date.now() + 10000;
    let settled = await publisher.checkQueue(topology.dlq);
    while (settled.messageCount !== 1 && Date.now() < settledDeadline) {
      await sleep(50);
      settled = await publisher.checkQueue(topology.dlq);
    }
    if (settled.messageCount !== 1) throw new Error('Poison not retained in DLQ');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (remaining.rows[0].n !== 0) throw new Error('B1.5 healthy-row cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-poison', result: 'PASS', runId,
      published, confirmed, poisonDeliveries, poisonRedeliveries,
      failedValidationAttempts, healthyCommits, acks, readyDepth: ready.messageCount,
      dlqDepth: settled.messageCount, poisonMessageId: poisonId,
      dlqReason: 'delivery_limit', remainingRows: remaining.rows[0].n,
      note: 'Poison retained in DLQ for inspection; do not purge' }));
  } finally {
    if (inspector) await inspector.close().catch(() => undefined);
    if (worker) await worker.close().catch(() => undefined);
    if (publisher) await publisher.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b1-incomplete', runId,
      published, confirmed, poisonDeliveries, healthyCommits, acks,
      cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
