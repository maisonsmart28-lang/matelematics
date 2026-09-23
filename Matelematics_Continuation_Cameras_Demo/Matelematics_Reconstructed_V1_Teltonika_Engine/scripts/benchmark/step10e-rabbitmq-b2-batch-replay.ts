/** Local B2: crash after a 20-event batch COMMIT and before every ACK. */
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import type { ConsumeMessage } from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistBatchThenAck, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

const size = 20;
function localDb() {
  return new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b2_batch_replay_local' });
}
async function checkDb(db: pg.Client) {
  await db.connect();
  const identity = await db.query('SELECT current_database() AS db, current_user AS username');
  if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
    throw new Error('Unexpected local benchmark database identity');
}
function eventFor(runId: string, sequence: number): Envelope {
  const now = new Date().toISOString();
  return { message_id: `${runId}:${sequence}`, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002', device_id: 'B2-SYNTHETIC',
    recorded_at: now, received_at: now, source: 'teltonika',
    payload: { benchmark: 'step10e4f_b1', sequence }, attempt: 0 };
}
function validate(msg: ConsumeMessage,
  runId: string, expected: Map<string, string>): Envelope {
  const raw = msg.content.toString('utf8');
  const event = JSON.parse(raw) as Envelope;
  if (!expected.has(event.message_id) || expected.get(event.message_id) !== raw ||
      msg.properties.messageId !== event.message_id || msg.properties.deliveryMode !== 2)
    throw new Error('Unexpected batch message identity; retained without ACK');
  return event;
}

async function crashWorker(runId: string) {
  const db = localDb();
  await checkDb(db);
  const connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
  const channel = await connection.createChannel();
  const items: Array<{ event: Envelope; ack: () => void }> = [];
  const seen = new Set<string>();
  await channel.prefetch(size);
  await channel.consume(topology.queue, async msg => {
    if (!msg) { process.exit(43); return; }
    try {
      const event = JSON.parse(msg.content.toString('utf8')) as Envelope;
      const sequence = Number(event.message_id?.slice(runId.length + 1));
      if (!event.message_id?.startsWith(`${runId}:`) || !Number.isInteger(sequence) ||
          sequence < 0 || sequence >= size || event.message_id !== `${runId}:${sequence}` ||
          event.payload?.sequence !== sequence || event.device_id !== 'B2-SYNTHETIC' ||
          msg.properties.messageId !== event.message_id || msg.fields.redelivered ||
          seen.has(event.message_id)) throw new Error('Invalid initial batch delivery');
      seen.add(event.message_id);
      items.push({ event, ack: () => {
        // Batch transaction has committed; exit before acknowledging any delivery.
        process.stdout.write('B2_BATCH_COMMITTED\n', () => process.exit(42));
      } });
      if (items.length === size) await persistBatchThenAck(db, runId, items);
    } catch (error) { console.error(error); process.exit(43); }
  }, { noAck: false, exclusive: true });
  await sleep(15000);
  throw new Error('Batch worker timed out');
}

async function main() {
  const runId = randomUUID();
  const events = Array.from({ length: size }, (_, i) => eventFor(runId, i));
  const expected = new Map(events.map(event => [event.message_id, JSON.stringify(event)]));
  const db = localDb();
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let publisher: Awaited<ReturnType<NonNullable<typeof connection>['createConfirmChannel']>> | undefined;
  let consumer: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let completed = false, confirmed = 0, redeliveries = 0, duplicateDeliveries = 0, acks = 0;
  try {
    await checkDb(db);
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1/B2 run is in progress');
    const rowsBefore = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (rowsBefore.rows[0].n !== 0) throw new Error('Prior benchmark rows remain; inspect first');
    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    publisher = await connection.createConfirmChannel();
    await publisher.checkExchange(topology.exchange);
    const before = await publisher.checkQueue(topology.queue);
    const deadBefore = await publisher.checkQueue(topology.dlq);
    if (before.messageCount || before.consumerCount || deadBefore.messageCount !== 1 || deadBefore.consumerCount)
      throw new Error('Expected empty main queue and one retained poison in DLQ');
    let returned = false;
    publisher.on('return', () => { returned = true; });
    for (const event of events) publisher.publish(topology.exchange, topology.routingKey,
      Buffer.from(expected.get(event.message_id)!),
      { persistent: true, mandatory: true, contentType: 'application/json', messageId: event.message_id });
    await publisher.waitForConfirms();
    if (returned) throw new Error('Unroutable replay test message');
    confirmed = size;
    const child = spawn(process.execPath, ['--import', 'tsx', process.argv[1], '--crash-worker', runId],
      { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    const exit = new Promise<number | null>((resolve, reject) => {
      child.once('error', reject); child.once('exit', code => resolve(code));
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), 20000);
    let code: number | null;
    try { code = await exit; } finally { clearTimeout(timer); }
    if (code !== 42 || !stdout.includes('B2_BATCH_COMMITTED'))
      throw new Error(`Batch crash worker failed: ${stderr.slice(0, 250)}`);
    const committed = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (committed.rows.length !== size || committed.rows.some(row => !expected.has(row.message_id)))
      throw new Error('Whole batch did not commit before worker exit');
    const recoveryStarted = Date.now();
    let ready = await publisher.checkQueue(topology.queue);
    while ((ready.messageCount !== size || ready.consumerCount) && Date.now() - recoveryStarted < 10000) {
      await sleep(50); ready = await publisher.checkQueue(topology.queue);
    }
    if (ready.messageCount !== size || ready.consumerCount) throw new Error('Batch did not requeue');
    consumer = await connection.createChannel();
    for (let index = 0; index < size; index++) {
      const msg = await consumer.get(topology.queue, { noAck: false });
      if (!msg) throw new Error('Missing redelivery; evidence retained');
      const event = validate(msg, runId, expected);
      if (!msg.fields.redelivered) throw new Error('Batch delivery not marked redelivered');
      redeliveries++;
      if (await persistThenAck(db, runId, event, () => { consumer!.ack(msg); acks++; }))
        throw new Error('Replay inserted duplicate logical event');
      duplicateDeliveries++;
    }
    await consumer.close(); consumer = undefined;
    const after = await publisher.checkQueue(topology.queue);
    const deadAfter = await publisher.checkQueue(topology.dlq);
    if (confirmed !== size || redeliveries !== size || duplicateDeliveries !== size || acks !== size ||
        after.messageCount || after.consumerCount || deadAfter.messageCount !== 1)
      throw new Error('Batch replay assertion failed; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (remaining.rows[0].n !== 0) throw new Error('Batch replay cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b2-batch-replay', result: 'PASS', runId,
      published: size, confirmed, originalCommits: committed.rows.length, redeliveries,
      duplicateDeliveriesDetected: duplicateDeliveries, acks, readyDepth: after.messageCount,
      dlqDepth: deadAfter.messageCount, recoveryMs: Date.now() - recoveryStarted,
      remainingRows: remaining.rows[0].n }));
  } finally {
    if (consumer) await consumer.close().catch(() => undefined);
    if (publisher) await publisher.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b2-batch-replay-incomplete',
      runId, confirmed, acks, cleanup: 'Evidence retained for inspection' }));
  }
}

(process.argv[2] === '--crash-worker' ? crashWorker(process.argv[3]) : main()).catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
