/** B1.6: confirmed durable messages and existing DLQ survive a local broker restart. */
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

const runDocker = promisify(execFile);
const container = 'matelematics-rabbitmq';
const expectedDlqId = process.argv[2];
const total = 3;
async function docker(...args: string[]) {
  const result = await runDocker('docker', args, { timeout: 30000, windowsHide: true });
  return result.stdout.trim();
}
async function assertLocalContainer() {
  const data = JSON.parse(await docker('inspect', container)) as Array<{
    Name: string; Config: { Image: string }; State: { Running: boolean };
    NetworkSettings: { Ports: Record<string, Array<{ HostPort: string }> | null> };
  }>;
  const item = data[0];
  if (item?.Name !== `/${container}` || !/^rabbitmq:\d/.test(item.Config.Image) ||
      !item.State.Running ||
      !item.NetworkSettings.Ports['5672/tcp']?.some(binding => binding.HostPort === '5672'))
    throw new Error('Expected running local RabbitMQ test container; refusing stop');
}
async function waitForBroker() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const connection = await amqp.connect(localRabbitUrl(), { timeout: 2000 });
      connection.on('error', () => undefined);
      return connection;
    } catch { await sleep(500); }
  }
  throw new Error('RabbitMQ did not become available after container start');
}

async function main() {
  if (!/^[0-9a-f-]{36}:poison$/i.test(expectedDlqId ?? ''))
    throw new Error('Pass the inspected B1.5 DLQ message ID as the sole argument');
  const runId = randomUUID();
  const events: Envelope[] = Array.from({ length: total }, (_, sequence) => ({
    message_id: `${runId}:${sequence}`, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002',
    device_id: 'B1-SYNTHETIC', recorded_at: new Date().toISOString(),
    received_at: new Date().toISOString(), source: 'teltonika',
    payload: { benchmark: 'step10e4f_b1', sequence }, attempt: 0,
  }));
  const expected = new Map(events.map(event => [event.message_id, JSON.stringify(event)]));
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b1_local' });
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let publisher: Awaited<ReturnType<NonNullable<typeof connection>['createConfirmChannel']>> | undefined;
  let worker: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let stopped = false, completed = false;
  let published = 0, confirmed = 0, commits = 0, acks = 0, recoveryMs = 0;
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
    connection.on('error', () => undefined); // expected when Docker stops the broker
    publisher = await connection.createConfirmChannel();
    publisher.on('error', () => undefined);
    await publisher.checkExchange(topology.exchange);
    const before = await publisher.checkQueue(topology.queue);
    const deadBefore = await publisher.checkQueue(topology.dlq);
    if (before.messageCount || before.consumerCount || deadBefore.messageCount !== 1 || deadBefore.consumerCount)
      throw new Error('Expected empty main queue and one retained DLQ event without consumers');
    await assertLocalContainer();
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
    const queued = await publisher.checkQueue(topology.queue);
    if (queued.messageCount !== total || queued.consumerCount)
      throw new Error('Confirmed backlog not available before broker restart');
    stopped = true;
    await docker('stop', '--time', '5', container);
    const restartStarted = Date.now();
    await docker('start', container);
    connection = await waitForBroker();
    stopped = false;
    publisher = await connection.createConfirmChannel();
    worker = await connection.createChannel();
    publisher.on('error', () => undefined);
    worker.on('error', () => undefined);
    const deadline = Date.now() + 30000;
    let after = await publisher.checkQueue(topology.queue);
    while (after.messageCount !== total && Date.now() < deadline) {
      await sleep(100);
      after = await publisher.checkQueue(topology.queue);
    }
    const deadAfter = await publisher.checkQueue(topology.dlq);
    if (after.messageCount !== total || after.consumerCount || deadAfter.messageCount !== 1)
      throw new Error('Durable backlog or DLQ did not survive broker restart; evidence retained');
    for (const event of events) {
      const msg = await worker.get(topology.queue, { noAck: false });
      if (!msg || msg.properties.messageId !== event.message_id ||
          msg.content.toString('utf8') !== expected.get(event.message_id))
        throw new Error('Unexpected durable recovery delivery; retained without ACK');
      if (!await persistThenAck(db, runId, event, () => { worker!.ack(msg); acks++; }))
        throw new Error('Unexpected duplicate after broker restart');
      commits++;
    }
    recoveryMs = Date.now() - restartStarted;
    await worker.close();
    worker = undefined;
    const inspector = await connection.createChannel();
    try {
      const retained = await inspector.get(topology.dlq, { noAck: false });
      if (!retained || retained.properties.messageId !== expectedDlqId)
        throw new Error('DLQ message identity changed after broker restart');
      inspector.nack(retained, false, true); // keep exact DLQ evidence
    } finally { await inspector.close().catch(() => undefined); }
    const settleDeadline = Date.now() + 10000;
    let mainFinal = await publisher.checkQueue(topology.queue);
    let dlqFinal = await publisher.checkQueue(topology.dlq);
    while ((mainFinal.messageCount || mainFinal.consumerCount || dlqFinal.messageCount !== 1) &&
           Date.now() < settleDeadline) {
      await sleep(50);
      mainFinal = await publisher.checkQueue(topology.queue);
      dlqFinal = await publisher.checkQueue(topology.dlq);
    }
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (published !== total || confirmed !== total || commits !== total || acks !== total ||
        mainFinal.messageCount || mainFinal.consumerCount || dlqFinal.messageCount !== 1 ||
        rows.rows.length !== total || rows.rows.some(row => !expected.has(row.message_id)))
      throw new Error('B1.6 assertion failed; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (remaining.rows[0].n !== 0) throw new Error('B1.6 cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b1-broker-restart', result: 'PASS',
      runId, published, confirmed, uniqueLogicalCommits: commits, acks,
      readyDepth: mainFinal.messageCount, dlqDepth: dlqFinal.messageCount,
      dlqMessageId: expectedDlqId, recoveryMs, remainingRows: remaining.rows[0].n }));
  } finally {
    if (stopped) {
      try { await docker('start', container); await waitForBroker().then(conn => conn.close()); }
      catch (error) { console.error('RabbitMQ restart failed:', error); }
    }
    if (worker) await worker.close().catch(() => undefined);
    if (publisher) await publisher.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b1-incomplete', runId,
      published, confirmed, commits, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
