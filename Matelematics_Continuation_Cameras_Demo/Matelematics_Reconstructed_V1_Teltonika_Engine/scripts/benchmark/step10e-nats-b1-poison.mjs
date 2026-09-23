/** Local B1 poison: bounded retries and explicit, inspectable quarantine. */
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
const quarantineSubject = 'matelematics.local.telemetry.failed';

async function state(manager) {
  const [main, dead, worker] = await Promise.all([
    manager.streams.info(stream), manager.streams.info(quarantine),
    manager.consumers.info(stream, durable),
  ]);
  return { main, dead, worker };
}
function invalidPoison(msg, raw) {
  if (msg.string() !== raw) return false;
  const event = JSON.parse(msg.string());
  return event.company_id === null && event.message_id?.endsWith(':poison') &&
    event.payload?.benchmark === 'step10e4f_b1';
}
async function main() {
  if (process.argv.length !== 2) throw new Error('NATS poison test takes no arguments');
  const runId = randomUUID();
  const poisonId = `${runId}:poison`;
  const healthyId = `${runId}:healthy`;
  const poisonRaw = JSON.stringify({ message_id: poisonId, schema_version: 1,
    payload: { benchmark: 'step10e4f_b1', sequence: 1 }, company_id: null });
  const now = new Date().toISOString();
  const healthy = { message_id: healthyId, schema_version: 1,
    company_id: '00000000-0000-0000-0000-000000000001',
    vehicle_id: '00000000-0000-0000-0000-000000000002',
    device_id: 'B2-SYNTHETIC', recorded_at: now, received_at: now,
    source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence: 0 }, attempt: 0 };
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_nats_b1_poison_local' });
  let nc, published = 0, confirmed = 0, attempts = 0, redeliveries = 0;
  let healthyCommits = 0, healthyAcks = 0, quarantined = false, completed = false;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected dedicated local database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another benchmark run is active');
    const rows = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (rows.rows[0].n) throw new Error('Previous benchmark rows remain; inspect first');
    nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
    const js = jetstream(nc);
    const manager = await jetstreamManager(nc);
    const before = await state(manager);
    if (before.main.state.messages || before.dead.state.messages ||
        before.worker.num_pending || before.worker.num_ack_pending ||
        before.worker.config.max_deliver !== 4 || before.worker.config.ack_policy !== 'explicit' ||
        before.main.config.retention !== 'workqueue' || before.dead.config.retention !== 'limits')
      throw new Error('NATS local streams/consumer contain prior evidence or unexpected settings');
    for (const [id, raw] of [[poisonId, poisonRaw], [healthyId, JSON.stringify(healthy)]]) {
      published++;
      const ack = await js.publish(subject, new TextEncoder().encode(raw),
        { msgID: id, expect: { stream } });
      if (ack.stream !== stream || ack.duplicate) throw new Error('Unexpected publish confirmation');
      confirmed++;
    }
    const consumer = await js.consumers.get(stream, durable);
    const first = await consumer.next({ expires: 5000 });
    if (!first || first.subject !== subject || first.redelivered || !invalidPoison(first, poisonRaw))
      throw new Error('Unexpected first poison delivery; retained without ACK');
    attempts++;
    first.nak(2000); // let a healthy event through before retrying poison
    const good = await consumer.next({ expires: 5000 });
    if (!good || good.subject !== subject || good.redelivered ||
        good.string() !== JSON.stringify(healthy))
      throw new Error('Healthy message did not progress past poison');
    let acknowledgment;
    if (!await persistThenAck(db, runId, healthy,
      () => { acknowledgment = good.ackAck({ timeout: 5000 }); }))
      throw new Error('Healthy message already committed');
    healthyCommits++;
    if (!await acknowledgment) throw new Error('Healthy ACK not confirmed');
    healthyAcks++;

    const deadline = Date.now() + 20000;
    while (attempts < 4 && Date.now() < deadline) {
      const msg = await consumer.next({ expires: 5000 });
      if (!msg) continue;
      if (msg.subject !== subject || !invalidPoison(msg, poisonRaw) || !msg.redelivered)
        throw new Error('Unexpected poison retry; retained without ACK');
      attempts++;
      redeliveries++;
      if (attempts < 4) {
        msg.nak(150);
        continue;
      }
      // Publish confirmation precedes ACK: losing this process preserves the
      // original message for targeted recovery and an idempotent publish ID.
      const quarantineRecord = { message_id: poisonId, original_subject: subject,
        failed_validation: 'company_id must be a UUID', attempts,
        original_event: JSON.parse(poisonRaw) };
      const quarantineAck = await js.publish(quarantineSubject,
        new TextEncoder().encode(JSON.stringify(quarantineRecord)),
        { msgID: poisonId, expect: { stream: quarantine } });
      if (quarantineAck.stream !== quarantine || quarantineAck.duplicate)
        throw new Error('Quarantine publish not confirmed; original retained');
      quarantined = true;
      if (!await msg.ackAck({ timeout: 5000 }))
        throw new Error('Original poison ACK not confirmed; inspect both streams');
    }
    let after = await state(manager);
    const settle = Date.now() + 10000;
    while ((after.main.state.messages || after.worker.num_pending ||
            after.worker.num_ack_pending) && Date.now() < settle) {
      await sleep(50);
      after = await state(manager);
    }
    const stored = after.dead.state.messages === 1 ?
      await manager.streams.getMessage(quarantine, { seq: after.dead.state.first_seq }) : null;
    const record = stored ? JSON.parse(new TextDecoder().decode(stored.data)) : null;
    const committed = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (attempts !== 4 || redeliveries !== 3 || healthyCommits !== 1 || healthyAcks !== 1 ||
        !quarantined || after.main.state.messages || after.worker.num_pending ||
        after.worker.num_ack_pending || after.dead.state.messages !== 1 ||
        stored?.subject !== quarantineSubject || record?.message_id !== poisonId ||
        record.original_subject !== subject || record.attempts !== 4 ||
        JSON.stringify(record.original_event) !== poisonRaw ||
        committed.rows.length !== 1 || committed.rows[0].message_id !== healthyId)
      throw new Error('Poison quarantine assertion failed; evidence retained');
    const removed = await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (removed.rowCount !== 1) throw new Error('Healthy benchmark row cleanup incomplete');
    completed = true;
    console.log(JSON.stringify({ event: 'step10e-nats-b1-poison', result: 'PASS', runId,
      published, confirmed, poisonDeliveries: attempts, poisonRedeliveries: redeliveries,
      failedValidationAttempts: attempts, healthyCommits, healthyAcks,
      pendingMessages: after.main.state.messages, ackPending: after.worker.num_ack_pending,
      quarantineMessages: after.dead.state.messages, poisonMessageId: poisonId,
      remainingRows: 0, note: 'Explicit quarantine retained for inspection; do not purge' }));
  } finally {
    if (nc) await nc.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-nats-b1-poison-incomplete',
      runId, published, confirmed, attempts, healthyCommits, healthyAcks,
      quarantined, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
