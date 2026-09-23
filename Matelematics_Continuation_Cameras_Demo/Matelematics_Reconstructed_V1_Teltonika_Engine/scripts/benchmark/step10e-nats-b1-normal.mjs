/** B1 normal: five confirmed JetStream publishes, DB commits, then explicit ACKs. */
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager } from '@nats-io/jetstream';
import pg from 'pg';
import { benchmarkDatabaseUrl, persistThenAck } from './step10e-rabbitmq-b1-store.ts';

const stream = 'MATELEMATICS_LOCAL_TELEMETRY';
const quarantine = 'MATELEMATICS_LOCAL_QUARANTINE';
const durable = 'matelematics_local_persist';
const subject = 'matelematics.local.telemetry.persist';
const size = 5;

async function main() {
  if (process.argv.length !== 2) throw new Error('B1 normal test takes no arguments');
  const runId = randomUUID();
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_nats_b1_local' });
  let nc;
  let published = 0, confirmed = 0, deliveries = 0, commits = 0, acks = 0;
  let completed = false;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected local benchmark DB identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1/B2 run is active');
    await db.query('CREATE SCHEMA IF NOT EXISTS b1');
    await db.query(`CREATE TABLE IF NOT EXISTS b1.events (
      message_id text PRIMARY KEY, run_id uuid NOT NULL, envelope jsonb NOT NULL,
      committed_at timestamptz NOT NULL DEFAULT clock_timestamp())`);
    const existing = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (existing.rows[0].n !== 0) throw new Error('Prior benchmark rows remain; inspect first');
    nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
    const manager = await jetstreamManager(nc);
    const mainBefore = await manager.streams.info(stream);
    const deadBefore = await manager.streams.info(quarantine);
    const consumerBefore = await manager.consumers.info(stream, durable);
    if (mainBefore.config.storage !== 'file' || mainBefore.config.retention !== 'workqueue' ||
        mainBefore.state.messages || deadBefore.state.messages || consumerBefore.num_pending ||
        consumerBefore.num_ack_pending || consumerBefore.num_redelivered ||
        consumerBefore.config.ack_policy !== 'explicit')
      throw new Error('NATS streams or durable consumer contain previous evidence; inspect first');
    const js = jetstream(nc);
    const expected = new Map();
    for (let i = 0; i < size; i++) {
      const now = new Date().toISOString();
      const event = { message_id: `${runId}:${i}`, schema_version: 1,
        company_id: '00000000-0000-0000-0000-000000000001',
        vehicle_id: '00000000-0000-0000-0000-000000000002',
        device_id: 'B2-SYNTHETIC', recorded_at: now, received_at: now,
        source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence: i }, attempt: 0 };
      const raw = JSON.stringify(event);
      expected.set(event.message_id, raw);
      const ack = await js.publish(subject, new TextEncoder().encode(raw), { msgID: event.message_id, expect: { stream } });
      published++;
      if (ack.stream !== stream || ack.duplicate) throw new Error('Unexpected JetStream publisher response');
      confirmed++;
    }
    const consumer = await js.consumers.get(stream, durable);
    const seen = new Set();
    for (let index = 0; index < size; index++) {
      const msg = await consumer.next({ expires: 5000 });
      if (!msg) throw new Error('Timed out waiting for a confirmed JetStream event');
      deliveries++;
      const raw = new TextDecoder().decode(msg.data);
      const event = JSON.parse(raw);
      if (msg.subject !== subject || msg.redelivered || !expected.has(event.message_id) ||
          expected.get(event.message_id) !== raw || seen.has(event.message_id))
        throw new Error('Unexpected JetStream delivery; retained without ACK');
      seen.add(event.message_id);
      let acknowledgment;
      const inserted = await persistThenAck(db, runId, event, () => { acknowledgment = msg.ackAck({ timeout: 5000 }); });
      if (!inserted) throw new Error('Unexpected duplicate logical commit');
      commits++;
      if (!await acknowledgment) throw new Error('JetStream did not confirm the ACK');
      acks++;
    }
    let final = await manager.streams.info(stream);
    let state = await manager.consumers.info(stream, durable);
    const until = Date.now() + 10000;
    while ((final.state.messages || state.num_ack_pending || state.num_pending) && Date.now() < until) {
      await sleep(50);
      final = await manager.streams.info(stream);
      state = await manager.consumers.info(stream, durable);
    }
    const deadAfter = await manager.streams.info(quarantine);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (published !== size || confirmed !== size || deliveries !== size || commits !== size || acks !== size ||
        seen.size !== size || final.state.messages || state.num_ack_pending || state.num_pending ||
        deadAfter.state.messages || rows.rows.length !== size ||
        rows.rows.some(row => !expected.has(row.message_id)))
      throw new Error('NATS B1 normal assertion failed; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (remaining.rows[0].n !== 0) throw new Error('NATS B1 cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-nats-b1-normal', result: 'PASS', runId,
      published, confirmed, deliveries, uniqueLogicalCommits: commits, acks,
      pendingMessages: final.state.messages, ackPending: state.num_ack_pending,
      quarantineMessages: deadAfter.state.messages, remainingRows: remaining.rows[0].n,
      note: 'Single-node local control; crash/replay and capacity not yet validated' }));
  } finally {
    if (nc) await nc.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-nats-b1-normal-incomplete',
      runId, published, confirmed, deliveries, commits, acks,
      cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|nats):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
