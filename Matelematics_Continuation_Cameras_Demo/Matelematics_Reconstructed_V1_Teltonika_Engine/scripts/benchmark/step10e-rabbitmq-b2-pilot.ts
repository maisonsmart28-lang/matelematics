/** B2 pilot only: bounded, paced RabbitMQ -> isolated local PostgreSQL throughput. */
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

function option(name: string, fallback: number, min: number, max: number) {
  const flag = `--${name}=`;
  const args = process.argv.slice(2).filter(arg => arg.startsWith(flag));
  if (args.length > 1) throw new Error(`Duplicate ${flag} option`);
  const value = args.length ? Number(args[0].slice(flag.length)) : fallback;
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`${flag} must be an integer between ${min} and ${max}`);
  return value;
}
function percentile(samples: number[], ratio: number) {
  const sorted = [...samples].sort((a, b) => a - b);
  return Math.round((sorted[Math.ceil(sorted.length * ratio) - 1] ?? 0) * 100) / 100;
}

async function main() {
  for (const arg of process.argv.slice(2))
    if (!/^--(?:count|rate|confirm-window|workers)=\d+$/.test(arg)) throw new Error(`Unknown B2 pilot option: ${arg}`);
  const count = option('count', 1000, 100, 10000);
  const rate = option('rate', 200, 10, 2000);
  const confirmWindow = option('confirm-window', 128, 1, 512);
  const workers = option('workers', 1, 1, 4);
  const runId = randomUUID();
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b2_local' });
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let publisher: Awaited<ReturnType<NonNullable<typeof connection>['createConfirmChannel']>> | undefined;
  let monitor: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  type WorkerChannel = Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>>;
  const consumers: Array<{ channel: WorkerChannel; tag?: string; work: Promise<void> }> = [];
  const workerDbs: pg.Client[] = [];
  let stopping = false, completed = false;
  let fatal: Error | undefined;
  let sampling = Promise.resolve();
  let published = 0, confirmed = 0, unconfirmed = 0, peakUnconfirmed = 0;
  let deliveries = 0, commits = 0, acks = 0;
  let redeliveries = 0, duplicateDeliveries = 0;
  let peakPending = 0, peakReady = 0, oldestPendingMs = 0;
  let firstDeliveryAt = 0, lastAckAt = 0, producerSentAt = 0, producerDoneAt = 0;
  const pending = new Map<string, { raw: string; sentAt: number }>();
  const dbLatencies: number[] = [], endToEndLatencies: number[] = [];
  const fail = (error: unknown) => { fatal ??= error instanceof Error ? error : new Error('B2 broker error'); };
  try {
    await db.connect();
    db.on('error', fail);
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected local benchmark database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1/B2 run is in progress');
    await db.query('CREATE SCHEMA IF NOT EXISTS b1');
    await db.query(`CREATE TABLE IF NOT EXISTS b1.events (
      message_id text PRIMARY KEY, run_id uuid NOT NULL, envelope jsonb NOT NULL,
      committed_at timestamptz NOT NULL DEFAULT clock_timestamp())`);
    const leftovers = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (leftovers.rows[0].n !== 0) throw new Error('Prior benchmark events remain; inspect before running B2');
    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    connection.on('error', fail);
    publisher = await connection.createConfirmChannel();
    monitor = await connection.createChannel();
    for (const channel of [publisher, monitor]) channel.on('error', fail);
    publisher.on('return', () => fail(new Error('Mandatory B2 publish was unroutable')));
    await publisher.checkExchange(topology.exchange);
    const before = await monitor.checkQueue(topology.queue);
    const dlqBefore = await monitor.checkQueue(topology.dlq);
    if (before.messageCount || before.consumerCount || dlqBefore.messageCount !== 1 || dlqBefore.consumerCount)
      throw new Error('Expected empty main queue and one retained B1.5 DLQ event without consumers');
    for (let index = 0; index < workers; index++) {
      const workerDb = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
        connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
        application_name: 'matelematics_b2_worker_local' });
      workerDbs.push(workerDb);
      await workerDb.connect();
      workerDb.on('error', fail);
      const channel = await connection.createChannel();
      const entry: { channel: WorkerChannel; tag?: string; work: Promise<void> } = {
        channel, work: Promise.resolve(),
      };
      consumers.push(entry);
      channel.on('error', fail);
      await channel.prefetch(topology.prefetch);
      const subscription = await channel.consume(topology.queue, msg => {
        if (!msg) { fail(new Error('B2 consumer cancelled unexpectedly')); return; }
        entry.work = entry.work.then(async () => {
          if (fatal) return;
          deliveries++;
          firstDeliveryAt ||= performance.now();
          if (msg.fields.redelivered) { redeliveries++; throw new Error('Unexpected B2 redelivery'); }
          const raw = msg.content.toString('utf8');
          const event = JSON.parse(raw) as Envelope;
          const expected = pending.get(event.message_id);
          if (!expected || expected.raw !== raw || msg.properties.messageId !== event.message_id)
            throw new Error('Unexpected B2 message; retained without ACK');
          const started = performance.now();
          const inserted = await persistThenAck(workerDb, runId, event, () => {
            if (fatal) throw fatal;
            channel.ack(msg);
            acks++;
          });
          if (!inserted) { duplicateDeliveries++; throw new Error('Unexpected B2 duplicate'); }
          const ended = performance.now();
          commits++;
          dbLatencies.push(ended - started);
          endToEndLatencies.push(ended - expected.sentAt);
          pending.delete(event.message_id);
          lastAckAt = Math.max(lastAckAt, ended);
        }).catch(fail);
      }, { noAck: false, exclusive: workers === 1 });
      entry.tag = subscription.consumerTag;
    }

    sampling = (async () => {
      while (!stopping && !fatal) {
        const state = await monitor!.checkQueue(topology.queue);
        if (state.consumerCount !== workers) throw new Error('Unexpected number of B2 consumers');
        peakReady = Math.max(peakReady, state.messageCount);
        const oldest = pending.values().next().value as { sentAt: number } | undefined;
        if (oldest) oldestPendingMs = Math.max(oldestPendingMs, performance.now() - oldest.sentAt);
        await sleep(200);
      }
    })().catch(fail);
    const startedAt = performance.now();
    for (let i = 0; i < count; i++) {
      if (fatal) throw fatal;
      while (unconfirmed >= confirmWindow && !fatal) await sleep(1);
      if (fatal) throw fatal;
      const delay = startedAt + i * (1000 / rate) - performance.now();
      if (delay > 0) await sleep(delay);
      const now = new Date().toISOString();
      const event: Envelope = {
        message_id: `${runId}:${i}`, schema_version: 1,
        company_id: '00000000-0000-0000-0000-000000000001',
        vehicle_id: '00000000-0000-0000-0000-000000000002',
        device_id: 'B2-SYNTHETIC', recorded_at: now, received_at: now,
        source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence: i }, attempt: 0,
      };
      const raw = JSON.stringify(event);
      pending.set(event.message_id, { raw, sentAt: performance.now() });
      unconfirmed++;
      peakUnconfirmed = Math.max(peakUnconfirmed, unconfirmed);
      const writable = publisher.publish(topology.exchange, topology.routingKey, Buffer.from(raw),
        { persistent: true, mandatory: true, contentType: 'application/json', messageId: event.message_id },
        (error: Error | null) => {
          unconfirmed--;
          if (error) fail(error);
          else confirmed++;
        });
      published++;
      peakPending = Math.max(peakPending, published - acks);
      if (!writable) {
        const controller = new AbortController();
        try { await Promise.race([once(publisher, 'drain', { signal: controller.signal }), sleep(1000)]); }
        finally { controller.abort(); }
      }
      if (fatal) throw fatal;
    }
    producerSentAt = performance.now();
    await publisher.waitForConfirms();
    producerDoneAt = performance.now();
    if (fatal || confirmed !== count) throw fatal ?? new Error('Missing publisher confirmations');
    const deadline = Date.now() + 120000;
    while (acks < count && !fatal && Date.now() < deadline) await sleep(50);
    if (fatal) throw fatal;
    if (acks !== count) throw new Error('B2 drain timed out; evidence retained');
    stopping = true;
    await sampling;
    for (const entry of consumers) {
      if (entry.tag) await entry.channel.cancel(entry.tag);
      entry.tag = undefined;
    }
    await Promise.all(consumers.map(entry => entry.work));
    for (const entry of consumers) await entry.channel.close();
    let after = await monitor.checkQueue(topology.queue);
    const settleDeadline = Date.now() + 10000;
    while ((after.messageCount || after.consumerCount) && Date.now() < settleDeadline) {
      await sleep(50);
      after = await monitor.checkQueue(topology.queue);
    }
    const dlqAfter = await monitor.checkQueue(topology.dlq);
    const rows = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (fatal) throw fatal;
    if (published !== count || confirmed !== count || deliveries !== count ||
        commits !== count || acks !== count || redeliveries || duplicateDeliveries ||
        pending.size || after.messageCount || after.consumerCount || dlqAfter.messageCount !== 1 ||
        rows.rows.length !== count || rows.rows.some(row => {
          const id = row.message_id as string;
          if (!id.startsWith(`${runId}:`)) return true;
          const sequence = Number(id.slice(runId.length + 1));
          return !Number.isSafeInteger(sequence) || sequence < 0 || sequence >= count ||
            id !== `${runId}:${sequence}`;
        }))
      throw new Error('B2 pilot assertion failed; evidence retained');
    await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (remaining.rows[0].n !== 0) throw new Error('B2 cleanup incomplete');
    completed = true;
    const observedProducerRatePerSec = Math.round(count * 1000 / (producerSentAt - startedAt) * 100) / 100;
    const rateTargetMet = observedProducerRatePerSec >= rate * 0.95;
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b2-pilot',
      result: rateTargetMet ? 'PASS' : 'INTEGRITY_PASS_RATE_MISSED', runId,
      targetRatePerSec: rate, workers, confirmWindow, peakUnconfirmed,
      published, confirmed, deliveries,
      uniqueLogicalCommits: commits, acks, redeliveries, duplicateDeliveries,
      observedProducerRatePerSec, rateTargetMet,
      observedConfirmedRatePerSec: Math.round(count * 1000 / (producerDoneAt - startedAt) * 100) / 100,
      observedDbDrainPerSec: Math.round(count * 1000 / (lastAckAt - firstDeliveryAt) * 100) / 100,
      postProducerDrainMs: Math.max(0, Math.round(lastAckAt - producerSentAt)),
      peakPending, peakReady, oldestPendingMs: Math.round(oldestPendingMs),
      dbLatencyMs: { p50: percentile(dbLatencies, 0.5), p95: percentile(dbLatencies, 0.95), max: Math.round(Math.max(...dbLatencies) * 100) / 100 },
      endToEndMs: { p50: percentile(endToEndLatencies, 0.5), p95: percentile(endToEndLatencies, 0.95), max: Math.round(Math.max(...endToEndLatencies) * 100) / 100 },
      readyDepth: after.messageCount, dlqDepth: dlqAfter.messageCount,
      remainingRows: remaining.rows[0].n,
      note: 'Single-node local broker/DB; diagnostic pilot, not production capacity or HA' }));
  } finally {
    stopping = true;
    await sampling;
    for (const entry of consumers)
      if (entry.tag) await entry.channel.cancel(entry.tag).catch(() => undefined);
    await Promise.all(consumers.map(entry => entry.work));
    for (const entry of consumers) await entry.channel.close().catch(() => undefined);
    for (const workerDb of workerDbs) await workerDb.end().catch(() => undefined);
    if (monitor) await monitor.close().catch(() => undefined);
    if (publisher) await publisher.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b2-incomplete', runId,
      published, confirmed, commits, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
