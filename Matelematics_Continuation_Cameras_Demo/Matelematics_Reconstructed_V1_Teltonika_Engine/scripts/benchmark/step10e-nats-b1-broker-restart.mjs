/** Restart only the dedicated local NATS container; verify durable backlog and quarantine. */
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager } from '@nats-io/jetstream';
import pg from 'pg';
import { benchmarkDatabaseUrl, persistThenAck } from './step10e-rabbitmq-b1-store.ts';

const dockerExec = promisify(execFile);
const container = 'matelematics-nats';
const stream = 'MATELEMATICS_LOCAL_TELEMETRY';
const quarantine = 'MATELEMATICS_LOCAL_QUARANTINE';
const durable = 'matelematics_local_persist';
const subject = 'matelematics.local.telemetry.persist';
const quarantineSubject = 'matelematics.local.telemetry.failed';
async function docker(...args) {
  const result = await dockerExec('docker', args, { timeout: 30000, windowsHide: true });
  return result.stdout.trim();
}
async function checkContainer() {
  const [item] = JSON.parse(await docker('inspect', container));
  if (item?.Name !== `/${container}` || item.Config?.Image !== 'nats:2.14.7' ||
      item.Config?.Labels?.['com.docker.compose.project'] !== 'matelematics-nats-b0' ||
      item.Config?.Labels?.['com.docker.compose.service'] !== 'nats' ||
      !item.State?.Running ||
      !item.Mounts?.some(m => m.Destination === '/data' &&
        m.Name === 'matelematics-nats-b0_nats_jetstream_data') ||
      !item.NetworkSettings?.Ports?.['4222/tcp']?.some(p =>
        p.HostIp === '127.0.0.1' && p.HostPort === '4222'))
    throw new Error('Unexpected NATS container or data volume; refusing restart');
}
async function connectReady() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const nc = await connect({ servers: '127.0.0.1:4222', timeout: 2000 });
      await jetstreamManager(nc);
      return nc;
    } catch { await sleep(500); }
  }
  throw new Error('Dedicated NATS JetStream did not become ready');
}
async function state(manager) {
  const [main, dead, worker] = await Promise.all([
    manager.streams.info(stream), manager.streams.info(quarantine),
    manager.consumers.info(stream, durable),
  ]);
  return { main, dead, worker };
}
async function quarantineRecord(manager, expectedId) {
  const { dead } = await state(manager);
  if (dead.state.messages !== 1) throw new Error('Expected one retained quarantine event');
  const msg = await manager.streams.getMessage(quarantine, { seq: dead.state.first_seq });
  const payload = JSON.parse(new TextDecoder().decode(msg.data));
  if (msg.subject !== quarantineSubject || payload.message_id !== expectedId ||
      payload.original_subject !== subject || payload.attempts !== 4 ||
      payload.original_event?.message_id !== expectedId ||
      payload.original_event?.company_id !== null)
    throw new Error('Quarantine identity or content differs; evidence retained');
}
async function main() {
  const expectedId = process.argv[2] ?? '';
  if (process.argv.length !== 3 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:poison$/i.test(expectedId))
    throw new Error('Pass the exact retained NATS poison message ID');
  const runId = randomUUID();
  const events = Array.from({ length: 3 }, (_, sequence) => {
    const now = new Date().toISOString();
    return { message_id: `${runId}:${sequence}`, schema_version: 1,
      company_id: '00000000-0000-0000-0000-000000000001',
      vehicle_id: '00000000-0000-0000-0000-000000000002',
      device_id: 'B2-SYNTHETIC', recorded_at: now, received_at: now,
      source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence }, attempt: 0 };
  });
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_nats_b1_restart_local' });
  let nc, stopped = false, completed = false, published = 0, confirmed = 0;
  let commits = 0, acks = 0, restartStarted = 0;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected dedicated local database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another benchmark run is active');
    const rows = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (rows.rows[0].n) throw new Error('Prior benchmark rows remain; inspect first');
    nc = await connectReady();
    let manager = await jetstreamManager(nc);
    const before = await state(manager);
    if (before.main.state.messages || before.worker.num_pending || before.worker.num_ack_pending ||
        before.dead.state.messages !== 1 || before.worker.config.ack_policy !== 'explicit' ||
        before.main.config.storage !== 'file' || before.dead.config.storage !== 'file')
      throw new Error('Unexpected stream/consumer state; preserve evidence');
    await quarantineRecord(manager, expectedId);
    await checkContainer();
    const js = jetstream(nc);
    for (const event of events) {
      published++;
      const ack = await js.publish(subject, new TextEncoder().encode(JSON.stringify(event)),
        { msgID: event.message_id, expect: { stream } });
      if (ack.stream !== stream || ack.duplicate) throw new Error('Publish not confirmed');
      confirmed++;
    }
    const queued = await state(manager);
    if (queued.main.state.messages !== 3 || queued.worker.num_ack_pending ||
        queued.dead.state.messages !== 1)
      throw new Error('Confirmed backlog not durable before restart');
    await nc.close(); nc = undefined;
    stopped = true;
    await docker('stop', '--time', '5', container);
    restartStarted = Date.now();
    await docker('start', container);
    nc = await connectReady();
    stopped = false;
    manager = await jetstreamManager(nc);
    let after = await state(manager);
    const settle = Date.now() + 10000;
    while ((after.main.state.messages !== 3 || after.worker.num_pending !== 3) &&
           Date.now() < settle) {
      await sleep(50); after = await state(manager);
    }
    if (after.main.state.messages !== 3 || after.worker.num_pending !== 3 ||
        after.worker.num_ack_pending || after.dead.state.messages !== 1)
      throw new Error('Durable backlog did not survive restart');
    await quarantineRecord(manager, expectedId);
    const consumer = await jetstream(nc).consumers.get(stream, durable);
    for (const event of events) {
      const msg = await consumer.next({ expires: 5000 });
      if (!msg || msg.subject !== subject || msg.redelivered ||
          msg.string() !== JSON.stringify(event))
        throw new Error('Unexpected backlog message; retained without ACK');
      let acknowledgment;
      if (!await persistThenAck(db, runId, event,
        () => { acknowledgment = msg.ackAck({ timeout: 5000 }); }))
        throw new Error('Duplicate commit after restart');
      commits++;
      if (!await acknowledgment) throw new Error('Post restart ACK not confirmed');
      acks++;
    }
    const recoveryMs = Date.now() - restartStarted;
    after = await state(manager);
    const drained = Date.now() + 10000;
    while ((after.main.state.messages || after.worker.num_pending ||
            after.worker.num_ack_pending) && Date.now() < drained) {
      await sleep(50); after = await state(manager);
    }
    await quarantineRecord(manager, expectedId);
    const committed = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (published !== 3 || confirmed !== 3 || commits !== 3 || acks !== 3 ||
        after.main.state.messages || after.worker.num_pending || after.worker.num_ack_pending ||
        committed.rows.length !== 3 ||
        committed.rows.some(row => !events.some(event => event.message_id === row.message_id)))
      throw new Error('NATS broker restart assertion failed; evidence retained');
    const removed = await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (removed.rowCount !== 3) throw new Error('NATS restart cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-nats-b1-broker-restart', result: 'PASS', runId,
      published, confirmed, uniqueLogicalCommits: commits, acks,
      pendingMessages: after.main.state.messages, ackPending: after.worker.num_ack_pending,
      quarantineMessages: after.dead.state.messages, quarantineMessageId: expectedId,
      recoveryMs, remainingRows: 0 }));
  } finally {
    if (stopped) {
      try { await docker('start', container); const restored = await connectReady(); await restored.close(); }
      catch (error) { console.error('Dedicated NATS restart failed:', error); }
    }
    if (nc) await nc.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-nats-b1-broker-restart-incomplete',
      runId, published, confirmed, commits, acks,
      cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
