/** B1.4: stop only the dedicated local benchmark DB; prove backlog and drain. */
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

const runDocker = promisify(execFile);
const container = 'matelematics-b1-postgres';
const count = 3;
const dbUrl = benchmarkDatabaseUrl();

function client() {
  return new pg.Client({ connectionString: dbUrl, ssl: false,
    connectionTimeoutMillis: 2000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b1_local' });
}
async function docker(...args: string[]) {
  const result = await runDocker('docker', args, { timeout: 30000, windowsHide: true });
  return result.stdout.trim();
}
async function verifyContainer() {
  const inspected = JSON.parse(await docker('inspect', container)) as Array<{
    Name: string; Config: { Image: string; Labels: Record<string, string> };
    State: { Running: boolean; Health?: { Status: string } };
  }>;
  const item = inspected[0];
  if (item?.Name !== `/${container}` || item.Config.Image !== 'postgres:17' ||
      item.Config.Labels['com.docker.compose.project'] !== 'matelematics-b1' ||
      item.Config.Labels['com.docker.compose.service'] !== 'postgres' ||
      !item.State.Running || item.State.Health?.Status !== 'healthy')
    throw new Error('Dedicated local benchmark PostgreSQL container is not healthy; refusing stop');
}
async function restoreDatabase() {
  await docker('start', container);
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const health = await docker('inspect', '--format', '{{.State.Health.Status}}', container);
    if (health === 'healthy') return;
    await sleep(500);
  }
  throw new Error('Benchmark PostgreSQL container did not become healthy after restart');
}
async function assertIdentity(db: pg.Client) {
  const identity = await db.query('SELECT current_database() AS db, current_user AS username');
  if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
    throw new Error('Unexpected database identity');
}

async function cleanupFailedRun(runId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    throw new Error('Invalid benchmark run ID');
  await verifyContainer();
  const db = client();
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  try {
    await db.connect();
    await assertIdentity(db);
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1 run is in progress');
    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    const channel = await connection.createChannel();
    try {
      const main = await channel.checkQueue(topology.queue);
      const dead = await channel.checkQueue(topology.dlq);
      if (main.messageCount || main.consumerCount || dead.messageCount || dead.consumerCount)
        throw new Error('Queues or consumers are not empty; refusing cleanup');
    } finally { await channel.close().catch(() => undefined); }
    const all = await db.query('SELECT message_id, run_id::text AS run_id FROM b1.events ORDER BY message_id');
    if (all.rows.length !== count || all.rows.some((row, index) =>
      row.run_id !== runId || row.message_id !== `${runId}:${index}`))
      throw new Error('Rows do not match this failed B1.4 run; refusing cleanup');
    const removed = await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (removed.rowCount !== count) throw new Error('Unexpected cleanup count');
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-db-outage-cleanup',
      result: 'PASS', runId, removedRows: removed.rowCount }));
  } finally {
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
  }
}

async function main() {
  const runId = randomUUID();
  const events: Envelope[] = Array.from({ length: count }, (_, sequence) => ({
    message_id: `${runId}:${sequence}`, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002', device_id: 'B1-SYNTHETIC',
    recorded_at: new Date().toISOString(), received_at: new Date().toISOString(),
    source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence }, attempt: 0,
  }));
  const expected = new Map(events.map(e => [e.message_id, JSON.stringify(e)]));
  let db: pg.Client | undefined;
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let publisher: Awaited<ReturnType<NonNullable<typeof connection>['createConfirmChannel']>> | undefined;
  let worker: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let stopped = false, completed = false;
  let published = 0, confirmed = 0, deliveries = 0, redeliveries = 0;
  let failedDbAttempts = 0, commits = 0, acks = 0, peakBacklog = 0;
  let recoveryMs = 0;
  try {
    db = client();
    await db.connect();
    await assertIdentity(db);
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
    const dlqBefore = await publisher.checkQueue(topology.dlq);
    if (before.messageCount || before.consumerCount || dlqBefore.messageCount || dlqBefore.consumerCount)
      throw new Error('Queues must be empty without consumers; no automatic purge');
    await verifyContainer();
    await db.end();
    db = undefined;
    stopped = true;
    await docker('stop', '--time', '5', container);
    let returned = false;
    publisher.on('return', () => { returned = true; });
    for (const event of events) {
      publisher.publish(topology.exchange, topology.routingKey, Buffer.from(JSON.stringify(event)),
        { persistent: true, mandatory: true, contentType: 'application/json', messageId: event.message_id });
      published++;
      await publisher.waitForConfirms();
      if (returned) throw new Error('Mandatory publish was unroutable');
      confirmed++;
    }
    const first = await worker.get(topology.queue, { noAck: false });
    if (!first || first.properties.messageId !== events[0].message_id)
      throw new Error('Unexpected first delivery; preserved without ACK');
    deliveries++;
    const probe = client();
    try {
      await probe.connect();
      throw new Error('Benchmark DB unexpectedly accepted connections during outage');
    } catch (error) {
      if (error instanceof Error && error.message.includes('unexpectedly accepted')) throw error;
      failedDbAttempts++;
    } finally { await probe.end().catch(() => undefined); }
    // Closing the channel requeues its unacked delivery; no ACK occurred while DB was down.
    await worker.close();
    worker = undefined;
    const backlog = await publisher.checkQueue(topology.queue);
    peakBacklog = backlog.messageCount;
    if (peakBacklog !== count || backlog.consumerCount !== 0 || acks !== 0)
      throw new Error('Outage backlog or ACK assertion failed; evidence retained');
    const recoveryStarted = Date.now();
    await restoreDatabase();
    stopped = false;
    db = client();
    await db.connect();
    await assertIdentity(db);
    worker = await connection.createChannel();
    for (const event of events) {
      const msg = await worker.get(topology.queue, { noAck: false });
      if (!msg || msg.properties.messageId !== event.message_id ||
          expected.get(event.message_id) !== msg.content.toString('utf8'))
        throw new Error('Unexpected recovery delivery; preserved without ACK');
      deliveries++;
      if (msg.fields.redelivered) redeliveries++;
      if (!await persistThenAck(db, runId, event, () => { worker!.ack(msg); acks++; }))
        throw new Error('Unexpected duplicate logical event');
      commits++;
    }
    recoveryMs = Date.now() - recoveryStarted;
    await worker.close();
    worker = undefined;
    const after = await publisher.checkQueue(topology.queue);
    const dlq = await publisher.checkQueue(topology.dlq);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const checks = {
      published: published === count, confirmed: confirmed === count,
      failedDbAttempts: failedDbAttempts === 1,
      deliveries: deliveries === count + 1, redeliveries: redeliveries === 1,
      commits: commits === count, acks: acks === count,
      rows: rows.rows.length === count && rows.rows.every(row => expected.has(row.message_id)),
      ready: after.messageCount === 0, consumers: after.consumerCount === 0,
      dlq: dlq.messageCount === 0,
    };
    const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
    if (failures.length) {
      console.error(JSON.stringify({ event: 'step10e-rabbitmq-b1-db-outage-assertion', runId,
        failures, published, confirmed, failedDbAttempts, deliveries, redeliveries,
        commits, acks, rows: rows.rows.length, readyDepth: after.messageCount,
        consumers: after.consumerCount, dlqDepth: dlq.messageCount }));
      throw new Error('B1.4 assertion failed; evidence retained');
    }
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (remaining.rows[0].n !== 0) throw new Error('B1.4 cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-db-outage', result: 'PASS', runId,
      published, confirmed, deliveries, redeliveries, failedDbAttempts,
      uniqueLogicalCommits: commits, acks, peakBacklog, readyDepth: after.messageCount,
      dlqDepth: dlq.messageCount, recoveryMs, remainingRows: remaining.rows[0].n }));
  } finally {
    // Restore the dedicated benchmark DB even if any assertion or broker call fails.
    if (stopped) {
      try { await restoreDatabase(); }
      catch (error) { console.error('Benchmark PostgreSQL restart failed:', error); }
    }
    if (worker) await worker.close().catch(() => undefined);
    if (publisher) await publisher.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    if (db) await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b1-incomplete', runId,
      published, confirmed, failedDbAttempts, commits, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
(process.argv[2] === '--cleanup-failed-run' ? cleanupFailedRun(process.argv[3] ?? '') : main()).catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
