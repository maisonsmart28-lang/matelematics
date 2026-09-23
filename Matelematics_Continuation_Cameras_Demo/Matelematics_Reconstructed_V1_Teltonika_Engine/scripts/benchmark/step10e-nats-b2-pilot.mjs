/** B2 diagnostic only: bounded local JetStream -> PostgreSQL batch throughput. */
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from '@nats-io/transport-node';
import { jetstream, jetstreamManager } from '@nats-io/jetstream';
import pg from 'pg';
import { benchmarkDatabaseUrl, persistBatchThenAck } from './step10e-rabbitmq-b1-store.ts';

const stream = 'MATELEMATICS_LOCAL_TELEMETRY';
const quarantine = 'MATELEMATICS_LOCAL_QUARANTINE';
const durable = 'matelematics_local_persist';
const subject = 'matelematics.local.telemetry.persist';
const quarantineId = 'd643263c-6936-4d03-b62e-ca5971e6ef6d:poison';
function option(name, fallback, min, max) {
  const matches = process.argv.slice(2).filter(value => value.startsWith(`--${name}=`));
  if (matches.length > 1) throw new Error(`Duplicate --${name}`);
  const value = matches.length ? Number(matches[0].split('=')[1]) : fallback;
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`--${name} must be an integer in ${min}..${max}`);
  return value;
}
function percentile(items, ratio) {
  const sorted = [...items].sort((a, b) => a - b);
  return Math.round((sorted[Math.ceil(sorted.length * ratio) - 1] ?? 0) * 100) / 100;
}
async function main() {
  if (process.argv.slice(2).some(arg => !/^--(?:count|rate|confirm-window)=\d+$/.test(arg)))
    throw new Error('Only --count, --rate and --confirm-window are supported');
  const count = option('count', 1000, 100, 20000);
  const rate = option('rate', 200, 10, 2000);
  const confirmWindow = option('confirm-window', 128, 128, 512);
  if (![128, 256, 512].includes(confirmWindow))
    throw new Error('Confirm window must be 128, 256 or 512');
  if (count !== 1000 && count !== 20000) throw new Error('Use 1000 or 20000 events');
  if (count === 20000 && rate !== 2000) throw new Error('20000 events require rate=2000');
  const runId = randomUUID();
  const monitorDb = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_nats_b2_monitor_local' });
  const workers = [], workerDbs = [];
  let nc, completed = false, fatal, published = 0, confirmed = 0;
  let commits = 0, acks = 0, deliveries = 0, peakPending = 0, peakReady = 0;
  let peakUnconfirmed = 0, oldestPendingMs = 0, producerEnd = 0, lastAck = 0;
  let firstDelivery = 0, stopping = false;
  const sent = new Map(), seen = new Set(), inFlight = new Set();
  const dbLatency = [], endToEnd = [];
  const fail = error => { fatal ??= error instanceof Error ? error : new Error('B2 worker failed'); };
  async function state(manager) {
    const [main, dead, consumer] = await Promise.all([
      manager.streams.info(stream), manager.streams.info(quarantine),
      manager.consumers.info(stream, durable),
    ]);
    return { main, dead, consumer };
  }
  try {
    await monitorDb.connect();
    const identity = await monitorDb.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected local benchmark database identity');
    const lock = await monitorDb.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another local benchmark is running');
    const existing = await monitorDb.query('SELECT count(*)::int AS n FROM b1.events');
    if (existing.rows[0].n) throw new Error('Prior benchmark rows remain; inspect first');
    nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
    const js = jetstream(nc), manager = await jetstreamManager(nc);
    const before = await state(manager);
    if (before.main.state.messages || before.consumer.num_pending ||
        before.consumer.num_ack_pending || before.dead.state.messages !== 1 ||
        before.consumer.config.max_ack_pending !== 100 ||
        before.consumer.config.ack_policy !== 'explicit')
      throw new Error('Previous NATS evidence or unexpected consumer settings');
    const retained = await manager.streams.getMessage(quarantine,
      { seq: before.dead.state.first_seq });
    if (JSON.parse(new TextDecoder().decode(retained.data)).message_id !== quarantineId)
      throw new Error('Retained quarantine event differs; preserve evidence');
    for (let index = 0; index < 4; index++) {
      const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
        connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
        application_name: 'matelematics_nats_b2_worker_local' });
      await db.connect(); workerDbs.push(db);
      const consumer = await js.consumers.get(stream, durable);
      workers.push((async () => {
        while (!stopping && !fatal) {
          const batch = [];
          const fetched = await consumer.fetch({ max_messages: 20, expires: 1000 });
          for await (const msg of fetched) {
            if (fatal) break;
            deliveries++;
            const started = performance.now();
            firstDelivery ||= started;
            const raw = msg.string();
            const event = JSON.parse(raw);
            const expected = sent.get(event.message_id);
            if (msg.subject !== subject || msg.redelivered || !expected ||
                expected.raw !== raw || seen.has(event.message_id))
              throw new Error('Unexpected JetStream delivery; retained without ACK');
            seen.add(event.message_id);
            batch.push({ event, msg, started, sentAt: expected.at });
          }
          if (!batch.length) continue;
          const confirmations = [];
          await persistBatchThenAck(db, runId, batch.map(item => ({ event: item.event,
            ack: () => confirmations.push(item.msg.ackAck({ timeout: 5000 })) })));
          if (!(await Promise.all(confirmations)).every(Boolean))
            throw new Error('Missing confirmed batch ACK; preserve evidence');
          const ended = performance.now();
          for (const item of batch) {
            commits++; acks++;
            dbLatency.push(ended - item.started);
            endToEnd.push(ended - item.sentAt);
            sent.delete(item.event.message_id);
          }
          lastAck = Math.max(lastAck, ended);
        }
      })().catch(fail));
    }
    let samplingStop = false;
    const sampling = (async () => {
      while (!samplingStop && !fatal) {
        const snapshot = await state(manager);
        peakReady = Math.max(peakReady,
          snapshot.main.state.messages - snapshot.consumer.num_ack_pending, 0);
        const oldest = sent.values().next().value;
        if (oldest) oldestPendingMs = Math.max(oldestPendingMs, performance.now() - oldest.at);
        await sleep(200);
      }
    })().catch(fail);
    try {
      const startedAt = performance.now();
      for (let i = 0; i < count; i++) {
        if (fatal) throw fatal;
        while (inFlight.size >= confirmWindow && !fatal) await Promise.race(inFlight);
        if (fatal) throw fatal;
        const delay = startedAt + i * 1000 / rate - performance.now();
        if (delay > 0) await sleep(delay);
        const now = new Date().toISOString();
        const event = { message_id: `${runId}:${i}`, schema_version: 1,
          company_id: '00000000-0000-0000-0000-000000000001',
          vehicle_id: '00000000-0000-0000-0000-000000000002',
          device_id: 'B2-SYNTHETIC', recorded_at: now, received_at: now,
          source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence: i }, attempt: 0 };
        const raw = JSON.stringify(event);
        sent.set(event.message_id, { raw, at: performance.now() });
        const task = js.publish(subject, new TextEncoder().encode(raw),
          { msgID: event.message_id, expect: { stream } })
          .then(ack => {
            if (ack.stream !== stream || ack.duplicate) throw new Error('Unexpected publisher confirmation');
            confirmed++;
          }).catch(fail).finally(() => inFlight.delete(task));
        inFlight.add(task);
        published++;
        peakUnconfirmed = Math.max(peakUnconfirmed, inFlight.size);
        peakPending = Math.max(peakPending, published - acks);
      }
      producerEnd = performance.now();
      await Promise.all(inFlight);
      const confirmedAt = performance.now();
      if (fatal || confirmed !== count) throw fatal ?? new Error('Missing publisher confirmations');
      const deadline = Date.now() + 120000;
      while (acks < count && !fatal && Date.now() < deadline) await sleep(50);
      if (fatal || acks !== count) throw fatal ?? new Error('Drain timeout; preserve evidence');
      stopping = true;
      await Promise.all(workers);
      const after = await state(manager);
      const rows = await monitorDb.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
      if (published !== count || confirmed !== count || deliveries !== count ||
          commits !== count || seen.size !== count || sent.size ||
          after.main.state.messages || after.consumer.num_pending ||
          after.consumer.num_ack_pending || after.dead.state.messages !== 1 ||
          rows.rows.length !== count || rows.rows.some(row => !seen.has(row.message_id)))
        throw new Error('B2 NATS integrity assertion failed; evidence retained');
      const removed = await monitorDb.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
      if (removed.rowCount !== count) throw new Error('B2 cleanup incomplete');
      completed = true;
      const observedRate = Math.round(count * 1000 / (producerEnd - startedAt) * 100) / 100;
      console.log(JSON.stringify({ event: 'step10e-nats-b2-pilot',
        result: observedRate >= rate * 0.95 ? 'PASS' : 'INTEGRITY_PASS_RATE_MISSED',
        runId, targetRatePerSec: rate, workers: 4, batchSize: 20, confirmWindow,
        published, confirmed, deliveries, uniqueLogicalCommits: commits, acks,
        observedProducerRatePerSec: observedRate, rateTargetMet: observedRate >= rate * 0.95,
        observedConfirmedRatePerSec: Math.round(count * 1000 / (confirmedAt - startedAt) * 100) / 100,
        observedDbDrainPerSec: Math.round(count * 1000 / (lastAck - firstDelivery) * 100) / 100,
        postProducerDrainMs: Math.max(0, Math.round(lastAck - producerEnd)),
        peakPending, peakReady, peakUnconfirmed, oldestPendingMs: Math.round(oldestPendingMs),
        dbLatencyMs: { p50: percentile(dbLatency, 0.5), p95: percentile(dbLatency, 0.95) },
        endToEndMs: { p50: percentile(endToEnd, 0.5), p95: percentile(endToEnd, 0.95) },
        pendingMessages: after.main.state.messages, ackPending: after.consumer.num_ack_pending,
        quarantineMessages: after.dead.state.messages, remainingRows: 0,
        note: 'Single-node local diagnostic; not production capacity or HA' }));
    } finally { samplingStop = true; await sampling; }
  } finally {
    stopping = true;
    await Promise.allSettled(workers);
    for (const db of workerDbs) await db.end().catch(() => undefined);
    if (nc) await nc.close().catch(() => undefined);
    await monitorDb.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-nats-b2-incomplete',
      runId, published, confirmed, commits, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
