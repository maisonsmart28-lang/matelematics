/** Local diagnostic: run the existing RabbitMQ B2 cell with the dedicated NATS container stopped. */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { setTimeout as sleep } from 'node:timers/promises';
import { connect } from '@nats-io/transport-node';
import { jetstreamManager } from '@nats-io/jetstream';
import pg from 'pg';
import { benchmarkDatabaseUrl } from './step10e-rabbitmq-b1-store.ts';

const execDocker = promisify(execFile);
const container = 'matelematics-nats';
const poisonId = 'd643263c-6936-4d03-b62e-ca5971e6ef6d:poison';
async function docker(...args) {
  const result = await execDocker('docker', args, { timeout: 30000, windowsHide: true });
  return result.stdout.trim();
}
async function inspectContainer() {
  const [item] = JSON.parse(await docker('inspect', container));
  if (item?.Name !== `/${container}` || item.Config?.Image !== 'nats:2.14.7' ||
      item.Config?.Labels?.['com.docker.compose.project'] !== 'matelematics-nats-b0' ||
      item.Config?.Labels?.['com.docker.compose.service'] !== 'nats' ||
      !item.State?.Running ||
      !item.Mounts?.some(m => m.Destination === '/data' &&
        m.Name === 'matelematics-nats-b0_nats_jetstream_data') ||
      !item.NetworkSettings?.Ports?.['4222/tcp']?.some(p =>
        p.HostIp === '127.0.0.1' && p.HostPort === '4222'))
    throw new Error('Unexpected dedicated NATS container or volume; refusing stop');
}
async function checkNats() {
  const nc = await connect({ servers: '127.0.0.1:4222', timeout: 5000 });
  try {
    const manager = await jetstreamManager(nc);
    const [main, dead, consumer] = await Promise.all([
      manager.streams.info('MATELEMATICS_LOCAL_TELEMETRY'),
      manager.streams.info('MATELEMATICS_LOCAL_QUARANTINE'),
      manager.consumers.info('MATELEMATICS_LOCAL_TELEMETRY', 'matelematics_local_persist'),
    ]);
    if (main.state.messages || consumer.num_pending || consumer.num_ack_pending ||
        dead.state.messages !== 1)
      throw new Error('NATS has unprocessed or unexpected benchmark evidence');
    const msg = await manager.streams.getMessage('MATELEMATICS_LOCAL_QUARANTINE',
      { seq: dead.state.first_seq });
    const payload = JSON.parse(new TextDecoder().decode(msg.data));
    if (payload.message_id !== poisonId ||
        msg.subject !== 'matelematics.local.telemetry.failed')
      throw new Error('Retained quarantine message differs; refusing isolation');
    return { primaryMessages: main.state.messages, quarantineMessages: dead.state.messages,
      quarantineMessageId: poisonId };
  } finally { await nc.close(); }
}
async function waitForNats() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { return await checkNats(); }
    catch { await sleep(500); }
  }
  throw new Error('NATS did not recover its durable stream and quarantine after restart');
}
async function checkDbEmpty() {
  const db = new pg.Client({ connectionString: benchmarkDatabaseUrl(), ssl: false,
    connectionTimeoutMillis: 5000, statement_timeout: 10000,
    application_name: 'matelematics_b2_isolation_local' });
  try {
    await db.connect();
    const identity = await db.query('SELECT current_database() AS db, current_user AS username');
    if (identity.rows[0]?.db !== 'matelematics_b1' || identity.rows[0]?.username !== 'b1_benchmark')
      throw new Error('Unexpected local PostgreSQL identity');
    const rows = await db.query('SELECT count(*)::int AS n FROM b1.events');
    if (rows.rows[0].n) throw new Error('Benchmark database has existing rows');
  } finally { await db.end().catch(() => undefined); }
}
async function runRabbitCell() {
  const script = 'scripts/benchmark/step10e-rabbitmq-b2-pilot.ts';
  const args = [script, '--count=20000', '--rate=2000', '--workers=4', '--batch-size=20'];
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const commandArgs = process.platform === 'win32' ?
    ['/d', '/s', '/c', `npx --no-install tsx ${args.join(' ')}`] :
    ['--no-install', 'tsx', ...args];
  const child = spawn(command, commandArgs, { stdio: 'inherit', windowsHide: true });
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status, signal) => signal ? reject(new Error(`RabbitMQ pilot exited on ${signal}`)) : resolve(status));
  });
  if (code !== 0) throw new Error(`RabbitMQ pilot exited with code ${code}; inspect its run ID`);
}
async function main() {
  if (process.argv.length !== 2) throw new Error('Isolated local comparison takes no arguments');
  let stopAttempted = false, restored = false;
  await inspectContainer();
  await checkDbEmpty();
  const before = await checkNats();
  try {
    stopAttempted = true;
    await docker('stop', '--time', '5', container);
    await runRabbitCell();
  } finally {
    if (stopAttempted) {
      try {
        await docker('start', container);
        const after = await waitForNats();
        restored = true;
        console.log(JSON.stringify({ event: 'step10e-rabbitmq-b2-isolate-nats',
          result: 'NATS_RESTORED', before, after }));
      } catch (error) {
        console.error('Dedicated NATS restart or quarantine verification failed:',
          error instanceof Error ? error.message : 'Unknown error');
        process.exitCode = 1;
      }
    }
  }
  if (!restored) throw new Error('NATS restoration was not verified');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
