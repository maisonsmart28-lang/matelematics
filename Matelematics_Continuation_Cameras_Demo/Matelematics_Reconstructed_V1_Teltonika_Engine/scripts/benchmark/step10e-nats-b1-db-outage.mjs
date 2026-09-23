/** B1 local: stop only the dedicated benchmark PostgreSQL container, then drain JetStream. */
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager } from '@nats-io/jetstream';
import pg from 'pg';
import { benchmarkDatabaseUrl, persistThenAck } from './step10e-rabbitmq-b1-store.ts';

const runFile = promisify(execFile);
const container = 'matelematics-b1-postgres';
const stream = 'MATELEMATICS_LOCAL_TELEMETRY';
const quarantine = 'MATELEMATICS_LOCAL_QUARANTINE';
const durable = 'matelematics_local_persist';
const subject = 'matelematics.local.telemetry.persist';
const count = 3;
function dbClient() {
  return new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 2000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_nats_b1_db_outage_local' });
}
async function docker(...args) {
  const result = await runFile('docker', args, { timeout: 30000, windowsHide: true });
  return result.stdout.trim();
}
async function verifyContainer() {
  const [item] = JSON.parse(await docker('inspect', container));
  if (item?.Name !== `/${container}` || item.Config.Image !== 'postgres:17' ||
      item.Config.Labels['com.docker.compose.project'] !== 'matelematics-b1' ||
      item.Config.Labels['com.docker.compose.service'] !== 'postgres' ||
      !item.State.Running || item.State.Health?.Status !== 'healthy')
    throw new Error('Dedicated local benchmark PostgreSQL container is not healthy; refusing stop');
}
async function restoreDb() {
  await docker('start', container);
  const until = Date.now() + 45000;
  while (Date.now() < until) {
    if (await docker('inspect', '--format', '{{.State.Health.Status}}', container) === 'healthy') return;
    await sleep(500);
  }
  throw new Error('Benchmark PostgreSQL did not become healthy after restart');
}
async function assertIdentity(db) {
  const identity = await db.query('SELECT current_database() AS db, current_user AS username');
  if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
    throw new Error('Unexpected local database identity');
}
async function state(manager) {
  const [primary, dead, worker] = await Promise.all([
    manager.streams.info(stream), manager.streams.info(quarantine), manager.consumers.info(stream, durable),
  ]);
  return { primary, dead, worker };
}
function valid(event, runId) {
  const number = Number(event?.message_id?.slice(runId.length + 1));
  return event?.message_id?.startsWith(`${runId}:`) && Number.isInteger(number) &&
    number >= 0 && number < count && event.message_id === `${runId}:${number}` &&
    event.schema_version === 1 && event.payload?.benchmark === 'step10e4f_b1' &&
    event.payload.sequence === number && event.device_id === 'B2-SYNTHETIC';
}
async function drain(js, manager, db, runId) {
  const consumer = await js.consumers.get(stream, durable);
  const seen = new Set();
  let deliveries = 0, commits = 0, duplicateDeliveries = 0, acks = 0, redeliveries = 0;
  const until = Date.now() + 60000;
  while (acks < count && Date.now() < until) {
    const msg = await consumer.next({ expires: 5000 });
    if (!msg) continue;
    deliveries++;
    const event = msg.json();
    if (msg.subject !== subject || !valid(event, runId) || seen.has(event.message_id))
      throw new Error('Unexpected NATS outage delivery; message retained without ACK');
    seen.add(event.message_id);
    if (msg.redelivered) redeliveries++;
    let acknowledgment;
    const inserted = await persistThenAck(db, runId, event, () => {
      acknowledgment = msg.ackAck({ timeout: 5000 });
    });
    if (inserted) commits++;
    else duplicateDeliveries++;
    if (!await acknowledgment) throw new Error('JetStream did not confirm recovery ACK');
    acks++;
  }
  let final = await state(manager);
  const settleUntil = Date.now() + 10000;
  while ((final.primary.state.messages || final.worker.num_pending || final.worker.num_ack_pending) &&
         Date.now() < settleUntil) {
    await sleep(50); final = await state(manager);
  }
  const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
  if (acks !== count || seen.size !== count || rows.rows.length !== count ||
      rows.rows.some(row => !valid({ message_id: row.message_id, schema_version: 1,
        payload: { benchmark: 'step10e4f_b1', sequence: Number(row.message_id.slice(runId.length + 1)) },
        device_id: 'B2-SYNTHETIC' }, runId)) ||
      final.primary.state.messages || final.worker.num_pending || final.worker.num_ack_pending ||
      final.dead.state.messages)
    throw new Error('NATS outage drain assertion failed; evidence retained');
  return { deliveries, commits, duplicateDeliveries, acks, redeliveries, final };
}
async function main() {
  if (process.argv.length !== 2) throw new Error('NATS B1 outage test takes no arguments');
  const runId = randomUUID();
  let nc, db, stopped = false, completed = false;
  let confirmed = 0, failedDbAttempts = 0, backlog = 0;
  try {
    db = dbClient(); await db.connect(); await assertIdentity(db);
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another benchmark run is active');
    const existing = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (existing.rows[0].n !== 0) throw new Error('Prior benchmark rows remain; inspect first');
    nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
    const manager = await jetstreamManager(nc);
    const before = await state(manager);
    if (before.primary.state.messages || before.worker.num_pending || before.worker.num_ack_pending ||
        before.dead.state.messages || before.worker.config.ack_policy !== 'explicit')
      throw new Error('NATS B1 stream/consumer has prior evidence; inspect first');
    await verifyContainer();
    await db.end(); db = undefined;
    stopped = true;
    await docker('stop', '--time', '5', container);
    const js = jetstream(nc);
    for (let sequence = 0; sequence < count; sequence++) {
      const now = new Date().toISOString();
      const event = { message_id: `${runId}:${sequence}`, schema_version: 1,
        company_id: '00000000-0000-0000-0000-000000000001',
        vehicle_id: '00000000-0000-0000-0000-000000000002',
        device_id: 'B2-SYNTHETIC', recorded_at: now, received_at: now,
        source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence }, attempt: 0 };
      const ack = await js.publish(subject, new TextEncoder().encode(JSON.stringify(event)),
        { msgID: event.message_id, expect: { stream } });
      if (ack.stream !== stream || ack.duplicate) throw new Error('Unexpected JetStream publisher response');
      confirmed++;
    }
    const consumer = await js.consumers.get(stream, durable);
    const first = await consumer.next({ expires: 5000 });
    if (!first || first.redelivered || first.json().message_id !== `${runId}:0`)
      throw new Error('Unexpected delivery during DB outage; retained without ACK');
    const probe = dbClient();
    try {
      await probe.connect();
      throw new Error('Benchmark DB unexpectedly accepted a connection during outage');
    } catch (error) {
      if (error instanceof Error && error.message.includes('unexpectedly accepted')) throw error;
      failedDbAttempts++;
    } finally { await probe.end().catch(() => undefined); }
    let down = await state(manager);
    const backlogDeadline = Date.now() + 5000;
    while ((down.primary.state.messages !== count || down.worker.num_ack_pending !== 1 ||
            down.worker.num_pending !== count - 1) && Date.now() < backlogDeadline) {
      await sleep(50);
      down = await state(manager);
    }
    backlog = down.primary.state.messages;
    if (backlog !== count || down.worker.num_ack_pending !== 1 ||
        down.worker.num_pending !== count - 1 || down.dead.state.messages)
      throw new Error('DB outage backlog assertion failed; evidence retained');
    const recoveryStart = Date.now();
    await restoreDb(); stopped = false;
    db = dbClient(); await db.connect(); await assertIdentity(db);
    const results = await drain(js, manager, db, runId);
    if (results.commits !== count || results.duplicateDeliveries ||
        results.redeliveries !== 1 || results.deliveries !== count)
      throw new Error('Unexpected post-outage commits or redeliveries; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (remaining.rows[0].n !== 0) throw new Error('NATS outage cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-nats-b1-db-outage', result: 'PASS', runId,
      published: count, confirmed, failedDbAttempts, peakBacklog: backlog,
      ...Object.fromEntries(Object.entries(results).filter(([key]) => key !== 'final')),
      uniqueLogicalCommits: count, recoveryMs: Date.now() - recoveryStart,
      pendingMessages: results.final.primary.state.messages,
      ackPending: results.final.worker.num_ack_pending,
      quarantineMessages: results.final.dead.state.messages, remainingRows: 0 }));
  } finally {
    if (stopped) {
      try { await restoreDb(); }
      catch (error) { console.error('Benchmark PostgreSQL restart failed:', error); }
    }
    if (nc) await nc.close().catch(() => undefined);
    if (db) await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-nats-b1-incomplete', runId,
      confirmed, failedDbAttempts, backlog, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|nats):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
