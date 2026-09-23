/** Cleanup only a fully verified failed local B2 batch-replay assertion. */
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, type Envelope } from './step10e-rabbitmq-b1-store';

async function main() {
  const runId = process.argv[2] ?? '';
  if (process.argv.length !== 3 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    throw new Error('Pass exactly one B2 batch replay run UUID');
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 15000,
    application_name: 'matelematics_b2_batch_replay_cleanup_local' });
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let channel: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected local benchmark DB identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1/B2 run is active');
    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    channel = await connection.createChannel();
    const main = await channel.checkQueue(topology.queue);
    const dead = await channel.checkQueue(topology.dlq);
    if (main.messageCount || main.consumerCount || dead.messageCount !== 1 || dead.consumerCount)
      throw new Error('Benchmark queues changed; preserve evidence and inspect');
    const rows = await db.query('SELECT message_id, run_id, envelope FROM b1.events');
    if (rows.rows.length !== 20) throw new Error('Expected exactly 20 retained rows; preserve evidence');
    const seen = new Set<number>();
    for (const row of rows.rows) {
      const id = row.message_id as string;
      const sequence = Number(id.slice(runId.length + 1));
      const event = row.envelope as Envelope;
      if (row.run_id !== runId || !id.startsWith(`${runId}:`) || !Number.isInteger(sequence) ||
          sequence < 0 || sequence >= 20 || id !== `${runId}:${sequence}` ||
          event.message_id !== id || event.payload?.benchmark !== 'step10e4f_b1' ||
          event.payload.sequence !== sequence || event.device_id !== 'B2-SYNTHETIC' ||
          seen.has(sequence)) throw new Error('Row identity mismatch; preserve evidence');
      seen.add(sequence);
    }
    if (seen.size !== 20) throw new Error('Batch row count mismatch; preserve evidence');
    const removed = await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
    if (removed.rowCount !== 20) throw new Error('Unexpected cleanup count; stop and inspect');
    const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (remaining.rows[0].n !== 0) throw new Error('Benchmark rows remain after targeted cleanup');
    console.log(JSON.stringify({ event: 'step10e-rabbitmq-b2-batch-replay-cleanup',
      result: 'PASS', runId, removedRows: removed.rowCount, remainingRows: 0,
      readyDepth: main.messageCount, dlqDepth: dead.messageCount }));
  } finally {
    if (channel) await channel.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
