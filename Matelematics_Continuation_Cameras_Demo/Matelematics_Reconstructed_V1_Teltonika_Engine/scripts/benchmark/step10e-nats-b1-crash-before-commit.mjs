/** Local B1: worker exits before DB commit; durable consumer redelivers. */
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager } from '@nats-io/jetstream';
import pg from 'pg';
import { benchmarkDatabaseUrl, persistThenAck } from './step10e-rabbitmq-b1-store.ts';

const stream = 'MATELEMATICS_LOCAL_TELEMETRY';
const quarantine = 'MATELEMATICS_LOCAL_QUARANTINE';
const durable = 'matelematics_local_persist';
const subject = 'matelematics.local.telemetry.persist';

async function crashWorker(runId) {
  const nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
  const consumer = await jetstream(nc).consumers.get(stream, durable);
  const msg = await consumer.next({ expires: 5000 });
  if (!msg || msg.redelivered || msg.subject !== subject) throw new Error('Unexpected first delivery');
  const event = msg.json();
  if (event.message_id !== `${runId}:0` || event.payload?.sequence !== 0)
    throw new Error('Unexpected first delivery identity');
  // No DB query and no ACK: emulate a process termination at this exact point.
  process.stdout.write('B1_BEFORE_COMMIT_RECEIVED\n', () => process.exit(42));
}

async function main() {
  if (process.argv.length !== 2) throw new Error('B1 crash control takes no arguments');
  const runId = randomUUID();
  const now = new Date().toISOString();
  const event = { message_id: `${runId}:0`, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002',
    device_id: 'B2-SYNTHETIC', recorded_at: now, received_at: now,
    source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence: 0 }, attempt: 0 };
  const raw = JSON.stringify(event);
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_nats_b1_crash_local' });
  let nc, confirmed = 0, deliveries = 0, acks = 0, completed = false;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected local benchmark DB identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another benchmark is active');
    const before = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (before.rows[0].n !== 0) throw new Error('Prior benchmark rows remain; inspect first');
    nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
    const manager = await jetstreamManager(nc);
    const mainBefore = await manager.streams.info(stream);
    const deadBefore = await manager.streams.info(quarantine);
    const consumerBefore = await manager.consumers.info(stream, durable);
    if (mainBefore.state.messages || deadBefore.state.messages || consumerBefore.num_pending ||
        consumerBefore.num_ack_pending || consumerBefore.num_redelivered ||
        consumerBefore.config.ack_wait !== 30_000_000_000 || consumerBefore.config.max_deliver !== 4)
      throw new Error('NATS B1 state is not empty or expected; inspect first');
    const ack = await jetstream(nc).publish(subject, new TextEncoder().encode(raw),
      { msgID: event.message_id, expect: { stream } });
    if (ack.stream !== stream || ack.duplicate) throw new Error('Unexpected publisher response');
    confirmed++;
    const child = spawn(process.execPath, [process.argv[1], '--crash-worker', runId],
      { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
    const exit = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => resolve(code));
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), 12000);
    let code;
    try { code = await exit; } finally { clearTimeout(timer); }
    if (code !== 42 || !stdout.includes('B1_BEFORE_COMMIT_RECEIVED'))
      throw new Error(`Crash worker failed: ${stderr.slice(0, 250)}`);
    deliveries++;
    const rowsBeforeReplay = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (rowsBeforeReplay.rows[0].n !== 0) throw new Error('Worker committed before simulated crash');
    const recoveryStarted = Date.now();
    const consumer = await jetstream(nc).consumers.get(stream, durable);
    let replay = null;
    while (!replay && Date.now() - recoveryStarted < 45000)
      replay = await consumer.next({ expires: 5000 });
    if (!replay) throw new Error('Redelivery did not arrive before timeout; evidence retained');
    deliveries++;
    if (!replay.redelivered || replay.subject !== subject ||
        new TextDecoder().decode(replay.data) !== raw)
      throw new Error('Unexpected redelivery; message retained without ACK');
    let acknowledgment;
    if (!await persistThenAck(db, runId, event, () => { acknowledgment = replay.ackAck({ timeout: 5000 }); }))
      throw new Error('Unexpected duplicate logical commit');
    if (!await acknowledgment) throw new Error('Redelivery ACK was not confirmed');
    acks++;
    let final = await manager.streams.info(stream);
    let state = await manager.consumers.info(stream, durable);
    const settleDeadline = Date.now() + 10000;
    while ((final.state.messages || state.num_pending || state.num_ack_pending) && Date.now() < settleDeadline) {
      await sleep(50);
      final = await manager.streams.info(stream);
      state = await manager.consumers.info(stream, durable);
    }
    const deadAfter = await manager.streams.info(quarantine);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (confirmed !== 1 || deliveries !== 2 || acks !== 1 || rows.rows.length !== 1 ||
        rows.rows[0].message_id !== event.message_id || final.state.messages || state.num_pending ||
        state.num_ack_pending || deadAfter.state.messages)
      throw new Error('NATS B1 crash-before-commit assertion failed; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (remaining.rows[0].n !== 0) throw new Error('NATS B1 cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-nats-b1-crash-before-commit', result: 'PASS', runId,
      published: 1, confirmed, deliveries, redeliveries: 1, uniqueLogicalCommits: 1, acks,
      recoveryMs: Date.now() - recoveryStarted, pendingMessages: final.state.messages,
      ackPending: state.num_ack_pending, quarantineMessages: deadAfter.state.messages,
      remainingRows: remaining.rows[0].n }));
  } finally {
    if (nc) await nc.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-nats-b1-incomplete', runId,
      confirmed, deliveries, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
(process.argv[2] === '--crash-worker' ? crashWorker(process.argv[3]) : main()).catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|nats):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
