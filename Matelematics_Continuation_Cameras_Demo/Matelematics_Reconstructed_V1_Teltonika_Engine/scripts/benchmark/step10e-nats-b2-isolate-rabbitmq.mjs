/** Local diagnostic: run NATS B2 with the dedicated RabbitMQ container stopped. */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import amqp from 'amqplib';
import pg from 'pg';
import { benchmarkDatabaseUrl } from './step10e-rabbitmq-b1-store.ts';
import { localRabbitUrl, topology } from './step10e-rabbitmq-b1-config.ts';

const execDocker = promisify(execFile);
const container = 'matelematics-rabbitmq';
const poisonId = '0f2ef9bb-81ed-43e4-8dfe-f8dd4a9f9358:poison';
async function docker(...args) {
  const result = await execDocker('docker', args, { timeout: 30000, windowsHide: true });
  return result.stdout.trim();
}
async function inspectContainer() {
  const [item] = JSON.parse(await docker('inspect', container));
  if (item?.Name !== `/${container}` || !/^rabbitmq:\d/.test(item.Config?.Image ?? '') ||
      !item.State?.Running ||
      !item.NetworkSettings?.Ports?.['5672/tcp']?.some(p => p.HostPort === '5672'))
    throw new Error('Unexpected dedicated RabbitMQ container; refusing stop');
}
async function checkRabbit() {
  const conn = await amqp.connect(localRabbitUrl(), { timeout: 5000 });
  conn.on('error', () => undefined);
  let channel;
  try {
    channel = await conn.createChannel();
    const main = await channel.checkQueue(topology.queue);
    const dead = await channel.checkQueue(topology.dlq);
    if (main.messageCount || main.consumerCount || dead.messageCount !== 1 || dead.consumerCount)
      throw new Error('RabbitMQ queues have unexpected benchmark evidence');
    const msg = await channel.get(topology.dlq, { noAck: false });
    if (!msg) throw new Error('Retained RabbitMQ poison missing');
    channel.nack(msg, false, true); // preserve exact DLQ message
    if (msg.properties.messageId !== poisonId)
      throw new Error('Retained RabbitMQ poison ID differs; refusing isolation');
    return { readyDepth: main.messageCount, dlqDepth: dead.messageCount,
      dlqMessageId: poisonId };
  } finally {
    if (channel) await channel.close().catch(() => undefined);
    await conn.close().catch(() => undefined);
  }
}
async function waitForRabbit() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { return await checkRabbit(); }
    catch { await sleep(500); }
  }
  throw new Error('RabbitMQ queues and retained DLQ did not recover after restart');
}
async function checkDbEmpty() {
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 5000, statement_timeout: 10000,
    application_name: 'matelematics_nats_b2_isolation_local' });
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected benchmark PostgreSQL identity');
    const rows = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (rows.rows[0].n) throw new Error('Benchmark database has existing rows');
  } finally { await db.end().catch(() => undefined); }
}
async function runNatsCell() {
  const script = 'scripts/benchmark/step10e-nats-b2-pilot.mjs';
  const args = [script, '--count=20000', '--rate=2000', '--confirm-window=512'];
  const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status, signal) => signal ? reject(new Error(`NATS pilot exited on ${signal}`)) : resolve(status));
  });
  if (code !== 0) throw new Error(`NATS pilot exited with code ${code}; inspect its run ID`);
}
async function main() {
  if (process.argv.length !== 2) throw new Error('Isolated local comparison takes no arguments');
  let stopAttempted = false, restored = false;
  await inspectContainer();
  await checkDbEmpty();
  const before = await checkRabbit();
  try {
    stopAttempted = true;
    await docker('stop', '--time', '5', container);
    await runNatsCell();
  } finally {
    if (stopAttempted) {
      try {
        await docker('start', container);
        const after = await waitForRabbit();
        restored = true;
        console.log(JSON.stringify({ event: 'step10e-nats-b2-isolate-rabbitmq',
          result: 'RABBITMQ_RESTORED', before, after }));
      } catch (error) {
        console.error('Dedicated RabbitMQ restart or DLQ verification failed:',
          error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    }
  }
  if (!restored) throw new Error('RabbitMQ restoration was not verified');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
