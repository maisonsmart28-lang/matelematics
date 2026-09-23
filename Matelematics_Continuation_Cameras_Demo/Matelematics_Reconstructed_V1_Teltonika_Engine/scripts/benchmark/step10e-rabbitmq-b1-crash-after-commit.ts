/** B1.3: kill a separate worker after PostgreSQL COMMIT, before RabbitMQ ACK. */
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

const workerMode = process.argv[2] === '--crash-worker';

async function crashWorker(runId: string) {
  const connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
  const channel = await connection.createChannel();
  await channel.prefetch(1);
  await channel.consume(topology.queue, async msg => {
    if (!msg || msg.properties.messageId !== `${runId}:0` || msg.fields.redelivered) {
      console.error('Unexpected first delivery; message retained without ACK');
      process.exit(43);
    }
    try {
      const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
        connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
        application_name: 'matelematics_b1_crash_worker' });
      await db.connect();
      const identity = await db.query('SELECT current_database() AS db, current_user AS username');
      if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
        throw new Error('Unexpected database identity in crash worker');
      const event = JSON.parse(msg.content.toString('utf8')) as Envelope;
      if (event.message_id !== `${runId}:0` || event.payload?.benchmark !== 'step10e4f_b1')
        throw new Error('Unexpected event identity in crash worker');
      const inserted = await persistThenAck(db, runId, event, () => {
        // The callback runs only after COMMIT. Exit with RabbitMQ delivery unacked.
        process.stdout.write('B1.3_COMMITTED\n', () => process.exit(42));
      });
      if (!inserted) throw new Error('Expected first logical commit');
    } catch (error) {
      console.error(error);
      process.exit(43);
    }
  }, { noAck: false, exclusive: true });
  await sleep(15000);
  throw new Error('Crash worker timed out without delivery');
}

async function main() {
  const runId = randomUUID();
  const event: Envelope = {
    message_id: `${runId}:0`, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002',
    device_id: 'B1-SYNTHETIC', recorded_at: new Date().toISOString(),
    received_at: new Date().toISOString(), source: 'teltonika',
    payload: { benchmark: 'step10e4f_b1', sequence: 0 }, attempt: 0,
  };
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b1_local' });
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let publisher: Awaited<ReturnType<NonNullable<typeof connection>['createConfirmChannel']>> | undefined;
  let consumer: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let published = 0, confirmed = 0, deliveries = 0, redeliveries = 0;
  let duplicateDeliveriesDetected = 0, acks = 0, completed = false;
  try {
    await db.connect();
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
    if (leftovers.rows[0].n !== 0) throw new Error('Prior B1 events remain; inspect before rerunning');

    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    publisher = await connection.createConfirmChannel();
    consumer = await connection.createChannel();
    await publisher.checkExchange(topology.exchange);
    const before = await publisher.checkQueue(topology.queue);
    const deadBefore = await publisher.checkQueue(topology.dlq);
    if (before.messageCount || before.consumerCount || deadBefore.messageCount || deadBefore.consumerCount)
      throw new Error('Queues must be empty without consumers; no automatic purge');
    let returned = false;
    publisher.on('return', () => { returned = true; });
    publisher.publish(topology.exchange, topology.routingKey, Buffer.from(JSON.stringify(event)),
      { persistent: true, mandatory: true, contentType: 'application/json', messageId: event.message_id });
    published++;
    await publisher.waitForConfirms();
    if (returned) throw new Error('Mandatory publish was unroutable');
    confirmed++;

    const child = spawn(process.execPath, ['--import', 'tsx', process.argv[1], '--crash-worker', runId],
      { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let childOutput = '', childError = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { childOutput += chunk; });
    child.stderr.on('data', chunk => { childError += chunk; });
    const exit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
    let outcome;
    try { outcome = await exit; } finally { clearTimeout(timer); }
    if (outcome.code !== 42 || !childOutput.includes('B1.3_COMMITTED'))
      throw new Error(`Crash worker failed: ${childError.slice(0, 300)} (exit ${outcome.code}, ${outcome.signal})`);
    deliveries++;
    const beforeRecovery = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (beforeRecovery.rows.length !== 1 || beforeRecovery.rows[0].message_id !== event.message_id)
      throw new Error('Worker exited without a durable database commit');
    const recoveryStarted = Date.now();
    const deadline = recoveryStarted + 10000;
    let ready = await publisher.checkQueue(topology.queue);
    while (ready.messageCount !== 1 && Date.now() < deadline) {
      await sleep(50);
      ready = await publisher.checkQueue(topology.queue);
    }
    if (ready.messageCount !== 1 || ready.consumerCount !== 0)
      throw new Error('Unacked delivery was not requeued after worker exit');
    const recovered = await consumer.get(topology.queue, { noAck: false });
    if (!recovered) throw new Error('Recovery worker did not receive message');
    deliveries++;
    if (!recovered.fields.redelivered) throw new Error('Recovery delivery was not marked redelivered');
    redeliveries++;
    if (recovered.properties.messageId !== event.message_id ||
        recovered.content.toString('utf8') !== JSON.stringify(event))
      throw new Error('Recovery message differs from published event; retained without ACK');
    if (await persistThenAck(db, runId, event, () => { consumer!.ack(recovered); acks++; }))
      throw new Error('Replay inserted a duplicate logical event');
    duplicateDeliveriesDetected++;
    await consumer.close();
    consumer = undefined;
    const after = await publisher.checkQueue(topology.queue);
    const deadAfter = await publisher.checkQueue(topology.dlq);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (rows.rows.length !== 1 || rows.rows[0].message_id !== event.message_id ||
        after.messageCount || after.consumerCount || deadAfter.messageCount ||
        published !== 1 || confirmed !== 1 || deliveries !== 2 || redeliveries !== 1 ||
        duplicateDeliveriesDetected !== 1 || acks !== 1)
      throw new Error('B1.3 assertion failed; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (remaining.rows[0].n !== 0) throw new Error('B1.3 cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-crash-after-commit', result: 'PASS', runId,
      published, confirmed, deliveries, redeliveries, uniqueLogicalCommits: rows.rows.length,
      duplicateDeliveriesDetected,
      acks, readyDepth: after.messageCount, dlqDepth: deadAfter.messageCount,
      recoveryMs: Date.now() - recoveryStarted, remainingRows: remaining.rows[0].n }));
  } finally {
    if (consumer) await consumer.close().catch(() => undefined);
    if (publisher) await publisher.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b1-incomplete', runId,
      published, confirmed, deliveries, duplicateDeliveriesDetected, acks,
      cleanup: 'Evidence retained for inspection' }));
  }
}

(workerMode ? crashWorker(process.argv[3]) : main()).catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
