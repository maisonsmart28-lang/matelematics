/** B1.5: bounded poison redelivery to an inspectable DLQ, with a healthy event. */
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

async function acknowledgeInspectedDlq(messageId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:poison$/i.test(messageId))
    throw new Error('Pass one exact B1.5 poison message ID');
  const runId = messageId.slice(0, -':poison'.length);
  const expectedRaw = JSON.stringify({ message_id: messageId, schema_version: 1,
    payload: { benchmark: 'step10e4f_b1', sequence: 1 }, company_id: null });
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b1_local' });
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let channel: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let acked = false, verified = false;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected benchmark database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1 run is in progress');
    const rows = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (rows.rows[0].n !== 0) throw new Error('Benchmark DB contains events; refusing DLQ acknowledgment');
    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    channel = await connection.createChannel();
    const main = await channel.checkQueue(topology.queue);
    const dead = await channel.checkQueue(topology.dlq);
    if (main.messageCount || main.consumerCount || dead.messageCount !== 1 || dead.consumerCount)
      throw new Error('Expected empty main queue and exactly one DLQ message without consumers');
    const msg = await channel.get(topology.dlq, { noAck: false });
    const deaths = msg?.properties.headers?.['x-death'];
    if (!msg || msg.properties.messageId !== messageId ||
        msg.content.toString('utf8') !== expectedRaw || msg.properties.deliveryMode !== 2 ||
        !Array.isArray(deaths) || !deaths.some((entry: { reason?: string }) =>
          entry.reason === 'delivery_limit'))
      throw new Error('DLQ identity or delivery-limit evidence differs; message retained');
    channel.ack(msg); // explicit acknowledgment of this exact inspected benchmark poison
    acked = true;
    await channel.close();
    channel = undefined;
    const verify = await connection.createChannel();
    try {
      const deadline = Date.now() + 10000;
      let state = await verify.checkQueue(topology.dlq);
      while (state.messageCount !== 0 && Date.now() < deadline) {
        await sleep(50);
        state = await verify.checkQueue(topology.dlq);
      }
      const mainAfter = await verify.checkQueue(topology.queue);
      if (state.messageCount || state.consumerCount || mainAfter.messageCount || mainAfter.consumerCount)
        throw new Error('Queue state after exact DLQ acknowledgment is unexpected');
      console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-dlq-ack', result: 'PASS',
        runId, messageId, acknowledged: 1, readyDepth: mainAfter.messageCount,
        dlqDepth: state.messageCount, remainingRows: 0 }));
      verified = true;
    } finally { await verify.close().catch(() => undefined); }
  } finally {
    if (channel) await channel.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (acked && !verified) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b1-dlq-ack-audit',
      runId, messageId, action: 'exact message acknowledged' }));
  }
}

async function main() {
  const resume = process.argv[2] === '--resume-failed-run';
  const runId = resume ? process.argv[3] : randomUUID();
  if (!runId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    throw new Error('Invalid benchmark run ID');
  let healthy: Envelope = {
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
    if (before.messageCount !== (resume ? 2 : 0) || before.consumerCount ||
        deadBefore.messageCount || deadBefore.consumerCount)
      throw new Error('Unexpected queue depth or consumers; no automatic purge');
    let returned = false;
    publisher.on('return', () => { returned = true; });
    if (!resume) {
      for (const [id, raw] of [[poisonId, poisonRaw], [healthy.message_id, JSON.stringify(healthy)]]) {
        publisher.publish(topology.exchange, topology.routingKey, Buffer.from(raw),
          { persistent: true, mandatory: true, contentType: 'application/json', messageId: id });
        published++;
        await publisher.waitForConfirms();
        if (returned) throw new Error('Mandatory publish was unroutable');
        confirmed++;
      }
    }

    // Hold poison unacked while accepting the healthy event. This avoids
    // a head-of-queue retry loop starving healthy telemetry.
    const first = await worker.get(topology.queue, { noAck: false });
    const second = await worker.get(topology.queue, { noAck: false });
    if (!first || !second) throw new Error('Expected two messages; retained without ACK');
    const poisonMsg = first.properties.messageId === poisonId ? first : second;
    const healthyMsg = first.properties.messageId === `${runId}:healthy` ? first : second;
    if (poisonMsg.properties.messageId !== poisonId ||
        poisonMsg.content.toString('utf8') !== poisonRaw ||
        healthyMsg.properties.messageId !== `${runId}:healthy`)
      throw new Error('Unexpected message identities; retained without ACK');
    const healthyRaw = healthyMsg.content.toString('utf8');
    if (resume) healthy = JSON.parse(healthyRaw) as Envelope;
    if (healthyRaw !== JSON.stringify(healthy) || healthy.message_id !== `${runId}:healthy` ||
        healthy.schema_version !== 1 || healthy.payload?.benchmark !== 'step10e4f_b1' ||
        healthy.payload.sequence !== 0 || healthy.company_id !== '00000000-0000-0000-0000-000000000001' ||
        healthy.vehicle_id !== '00000000-0000-0000-0000-000000000002' ||
        healthyMsg.properties.deliveryMode !== 2)
      throw new Error('Unexpected healthy envelope; messages retained');
    if (!await persistThenAck(db, runId, healthy, () => { worker!.ack(healthyMsg); acks++; }))
      throw new Error('Healthy event identity already exists');
    healthyCommits++;
    const decoded = JSON.parse(poisonRaw) as { company_id?: unknown };
    if (typeof decoded.company_id === 'string') throw new Error('Poison unexpectedly passed validation');
    poisonDeliveries++;
    if (poisonMsg.fields.redelivered) poisonRedeliveries++;
    failedValidationAttempts++;
    worker.reject(poisonMsg, true); // actual failed delivery counts toward quorum limit
    await sleep(100);

    // basic.reject increments the delivery-failure counter; basic.nack does not
    // on recent RabbitMQ releases. Bound retries and wait between rejects.
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
        const decodedAttempt = JSON.parse(raw) as { company_id?: unknown };
        if (typeof decodedAttempt.company_id === 'string')
          throw new Error('Poison unexpectedly passed validation');
        failedValidationAttempts++;
        worker.reject(msg, true); // broker delivery limit routes to DLQ
        await sleep(100);
      } else throw new Error('Unexpected message; retained without ACK');
    }
    await worker.close();
    worker = undefined;
    const ready = await publisher.checkQueue(topology.queue);
    const dead = await publisher.checkQueue(topology.dlq);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (published !== (resume ? 0 : 2) || confirmed !== (resume ? 0 : 2) ||
        healthyCommits !== 1 || acks !== 1 ||
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
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-poison',
      result: resume ? 'RECOVERY_PASS' : 'PASS', runId,
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
(process.argv[2] === '--ack-inspected-dlq' ? acknowledgeInspectedDlq(process.argv[3] ?? '') : main()).catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
