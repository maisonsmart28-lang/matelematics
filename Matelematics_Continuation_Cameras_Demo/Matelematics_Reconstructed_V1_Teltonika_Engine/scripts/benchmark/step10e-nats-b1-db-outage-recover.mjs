/** Targeted recovery of one fully published, interrupted three-event local NATS B1 outage. */
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager } from '@nats-io/jetstream';
import pg from 'pg';
import { benchmarkDatabaseUrl, persistThenAck } from './step10e-rabbitmq-b1-store.ts';

const stream = 'MATELEMATICS_LOCAL_TELEMETRY';
const quarantine = 'MATELEMATICS_LOCAL_QUARANTINE';
const durable = 'matelematics_local_persist';
const subject = 'matelematics.local.telemetry.persist';
function sequence(id, runId) {
  if (typeof id !== 'string' || !id.startsWith(`${runId}:`)) return -1;
  const number = Number(id.slice(runId.length + 1));
  return Number.isInteger(number) && number >= 0 && number < 3 && id === `${runId}:${number}` ? number : -1;
}
async function main() {
  const runId = process.argv[2] ?? '';
  if (process.argv.length !== 3 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    throw new Error('Pass exactly one interrupted local NATS outage run UUID');
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_nats_b1_outage_recovery_local' });
  let nc, completed = false, acks = 0, recoveredCommits = 0, duplicates = 0;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected local benchmark database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another benchmark run is active');
    const previous = await db.query('SELECT message_id, run_id, envelope FROM b1.events');
    if (previous.rows.length > 3) throw new Error('Unexpected benchmark rows; preserve evidence');
    for (const row of previous.rows) {
      const i = sequence(row.message_id, runId);
      if (i < 0 || row.run_id !== runId || row.envelope?.message_id !== row.message_id ||
          row.envelope.payload?.benchmark !== 'step10e4f_b1' ||
          row.envelope.payload.sequence !== i || row.envelope.device_id !== 'B2-SYNTHETIC')
        throw new Error('Existing row differs from expected synthetic run');
    }
    nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
    const manager = await jetstreamManager(nc);
    const [before, dead, worker] = await Promise.all([
      manager.streams.info(stream), manager.streams.info(quarantine), manager.consumers.info(stream, durable),
    ]);
    if (before.state.messages < 1 || before.state.messages > 3 || dead.state.messages ||
        worker.num_ack_pending > 3 || worker.config.ack_policy !== 'explicit' ||
        before.state.messages + previous.rows.length < 3)
      throw new Error('Interrupted run state does not match three confirmed events; preserve evidence');
    const consumer = await jetstream(nc).consumers.get(stream, durable);
    const seen = new Set(previous.rows.map(row => sequence(row.message_id, runId)));
    const deadline = Date.now() + 90000;
    while (acks < before.state.messages && Date.now() < deadline) {
      const msg = await consumer.next({ expires: 5000 });
      if (!msg) continue;
      const event = msg.json();
      const i = sequence(event.message_id, runId);
      if (msg.subject !== subject || i < 0 || event.schema_version !== 1 ||
          event.payload?.benchmark !== 'step10e4f_b1' || event.payload.sequence !== i ||
          event.device_id !== 'B2-SYNTHETIC')
        throw new Error('Unexpected queued message; preserve without ACK');
      let acknowledgment;
      const inserted = await persistThenAck(db, runId, event, () => {
        acknowledgment = msg.ackAck({ timeout: 5000 });
      });
      if (inserted) recoveredCommits++;
      else duplicates++;
      if (!await acknowledgment) throw new Error('JetStream recovery ACK was not confirmed');
      acks++;
      seen.add(i);
    }
    let after = await manager.streams.info(stream);
    let finalWorker = await manager.consumers.info(stream, durable);
    const settle = Date.now() + 10000;
    while ((after.state.messages || finalWorker.num_pending || finalWorker.num_ack_pending) && Date.now() < settle) {
      await sleep(50);
      after = await manager.streams.info(stream);
      finalWorker = await manager.consumers.info(stream, durable);
    }
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (acks !== before.state.messages || seen.size !== 3 || rows.rows.length !== 3 ||
        after.state.messages || finalWorker.num_pending || finalWorker.num_ack_pending)
      throw new Error('NATS outage recovery assertion failed; evidence retained');
    const removed = await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (removed.rowCount !== 3) throw new Error('NATS outage recovery cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-nats-b1-db-outage-recovery', result: 'PASS',
      runId, priorRows: previous.rows.length, recoveredCommits, duplicateDeliveriesDetected: duplicates,
      acks, totalUniqueCommits: 3, pendingMessages: after.state.messages,
      quarantineMessages: dead.state.messages, removedRows: removed.rowCount }));
  } finally {
    if (nc) await nc.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-nats-b1-db-outage-recovery-incomplete',
      runId, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
