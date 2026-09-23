/** Recover one interrupted local B2 run without republishing or purging messages. */
import amqp from 'amqplib';
import pg from 'pg';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config';
import { benchmarkDatabaseUrl, persistThenAck, type Envelope } from './step10e-rabbitmq-b1-store';

async function main() {
  const runId = process.argv[2] ?? '';
  const countArg = process.argv[3];
  if (process.argv.length > 4 ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runId))
    throw new Error('Pass a B2 UUID and optional --count=20000 or --count=60000 to recover');
  if (countArg !== undefined && countArg !== '--count=20000' && countArg !== '--count=60000')
    throw new Error('Only --count=20000 or --count=60000 is supported for recovery');
  const expectedCount = countArg === '--count=60000' ? 60000 : countArg ? 20000 : 5000;
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 10000, statement_timeout: 15000, query_timeout: 20000,
    application_name: 'matelematics_b2_recovery_local' });
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let channel: Awaited<ReturnType<NonNullable<typeof connection>['createChannel']>> | undefined;
  let recovered = 0, acks = 0, completed = false;
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected benchmark database identity');
    const lock = await db.query('SELECT pg_try_advisory_lock(1046, 11) AS locked');
    if (!lock.rows[0]?.locked) throw new Error('Another B1/B2 run is in progress');
    const rows = await db.query('SELECT message_id, envelope FROM b1.events ORDER BY message_id');
    if (rows.rows.length >= expectedCount)
      throw new Error('Unexpected number of existing B2 rows; refusing recovery');
    const seen = new Set<number>();
    for (const row of rows.rows) {
      const id = row.message_id as string;
      const sequence = Number(id.slice(runId.length + 1));
      const stored = row.envelope as Envelope;
      if (!id.startsWith(`${runId}:`) || !Number.isSafeInteger(sequence) ||
          sequence < 0 || sequence >= expectedCount || id !== `${runId}:${sequence}` ||
          stored?.message_id !== id || stored.payload?.benchmark !== 'step10e4f_b1' ||
          stored.payload.sequence !== sequence || stored.device_id !== 'B2-SYNTHETIC' ||
          seen.has(sequence))
        throw new Error('Existing rows do not match one synthetic B2 run; refusing recovery');
      seen.add(sequence);
    }
    connection = await amqp.connect(localRabbitUrl(), { timeout: 10000 });
    channel = await connection.createChannel();
    const main = await channel.checkQueue(topology.queue);
    const dlq = await channel.checkQueue(topology.dlq);
    if (main.consumerCount || main.messageCount !== expectedCount - seen.size ||
        dlq.messageCount !== 1 || dlq.consumerCount)
      throw new Error(`Queue depth does not complement DB rows to ${expectedCount}; refusing recovery`);
    const queuedAtStart = main.messageCount;
    for (let i = 0; i < queuedAtStart; i++) {
      const msg = await channel.get(topology.queue, { noAck: false });
      if (!msg) throw new Error('Backlog changed while recovering; evidence retained');
      let event: Envelope;
      try { event = JSON.parse(msg.content.toString('utf8')) as Envelope; }
      catch { throw new Error('Invalid queued B2 JSON; message retained without ACK'); }
      const id = event.message_id;
      const sequence = Number(id?.slice(runId.length + 1));
      if (!id?.startsWith(`${runId}:`) || !Number.isSafeInteger(sequence) ||
          sequence < 0 || sequence >= expectedCount || id !== `${runId}:${sequence}` ||
          msg.properties.messageId !== id || msg.properties.deliveryMode !== 2 ||
          event.payload?.benchmark !== 'step10e4f_b1' || event.payload.sequence !== sequence ||
          event.device_id !== 'B2-SYNTHETIC' || seen.has(sequence))
        throw new Error('Unexpected queued B2 identity; message retained without ACK');
      seen.add(sequence);
      const inserted = await persistThenAck(db, runId, event, () => { channel!.ack(msg); acks++; });
      if (!inserted) throw new Error('B2 recovery attempted duplicate commit');
      recovered++;
    }
    await channel.close();
    channel = undefined;
    const verify = await connection.createChannel();
    try {
      const after = await verify.checkQueue(topology.queue);
      const deadAfter = await verify.checkQueue(topology.dlq);
      const committed = await db.query('SELECT message_id FROM b1.events WHERE run_id=$1::uuid', [runId]);
      if (seen.size !== expectedCount || recovered !== queuedAtStart || acks !== recovered ||
          committed.rows.length !== expectedCount || after.messageCount || after.consumerCount ||
          deadAfter.messageCount !== 1)
        throw new Error('B2 recovery assertions failed; evidence retained');
      await db.query('DELETE FROM b1.events WHERE run_id=$1::uuid', [runId]);
      const remaining = await db.query('SELECT count(*)::int AS n FROM b1.events WHERE run_id=$1::uuid', [runId]);
      if (remaining.rows[0].n !== 0) throw new Error('B2 recovery cleanup incomplete');
      completed = true;
      console.log(JSON.stringify({ event: 'step10e-rabbitmq-b2-recovery', result: 'PASS', runId,
        rowsBefore: rows.rows.length, recoveredDeliveries: recovered, recoveredAcks: acks,
        totalUniqueCommits: committed.rows.length, readyDepth: after.messageCount,
        dlqDepth: deadAfter.messageCount, remainingRows: remaining.rows[0].n,
        note: 'Existing run recovered; prior publisher confirmations and target rate cannot be inferred' }));
    } finally { await verify.close().catch(() => undefined); }
  } finally {
    if (channel) await channel.close().catch(() => undefined);
    if (connection) await connection.close().catch(() => undefined);
    await db.end().catch(() => undefined);
    if (!completed) console.error(JSON.stringify({ event: 'step10e-rabbitmq-b2-recovery-incomplete',
      runId, recovered, acks, cleanup: 'Evidence retained for inspection' }));
  }
}
main().catch(error => {
  console.error((error instanceof Error ? error.message : 'Unknown error')
    .replace(/(?:postgres(?:ql)?|amqps?):\/\/[^\s]+/g, '[connection URL withheld]'));
  process.exitCode = 1;
});
