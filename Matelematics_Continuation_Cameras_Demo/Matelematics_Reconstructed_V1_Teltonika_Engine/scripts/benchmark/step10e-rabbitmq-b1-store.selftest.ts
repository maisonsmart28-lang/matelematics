import assert from 'node:assert/strict';
import { persistThenAck, benchmarkDatabaseUrl, type Envelope } from './step10e-rabbitmq-b1-store';
const event: Envelope = { message_id: 'test:0', schema_version: 1,
  company_id: '00000000-0000-0000-0000-000000000001',
  vehicle_id: '00000000-0000-0000-0000-000000000002', device_id: null,
  recorded_at: '2026-09-22T00:00:00Z', received_at: '2026-09-22T00:00:00Z',
  source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence: 0 }, attempt: 0 };
async function main() {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const calls: string[] = [];
  const pending = persistThenAck({ async query(sql: string) {
    calls.push(sql.split(/\s+/)[0]);
    if (sql === 'COMMIT') await gate;
    return { rowCount: 1, rows: [] };
  } }, 'run', event, () => calls.push('ACK'));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['BEGIN','INSERT','COMMIT']);
  release(); await pending;
  assert.equal(calls.at(-1),'ACK');
  for (const stage of ['INSERT','COMMIT']) {
    const steps: string[] = [];
    await assert.rejects(persistThenAck({ async query(sql: string) {
      steps.push(sql.split(/\s+/)[0]);
      if (sql.startsWith(stage)) throw new Error('DB failed');
      return { rowCount: 1, rows: [] };
    } }, 'run', event, () => assert.fail('ACK before DB commit')), /DB failed/);
    assert.equal(steps.at(-1), 'ROLLBACK');
  }
  let replayAck = false;
  assert.equal(await persistThenAck({ async query(sql: string) {
    return { rowCount: 0, rows: sql.startsWith('SELECT') ? [{ message_id: event.message_id }] : [] };
  } }, 'run', event, () => { replayAck = true; }), false);
  assert.equal(replayAck, true);
  await assert.rejects(persistThenAck({ async query() { return { rowCount: 0, rows: [] }; } },
    'run', event, () => assert.fail('ACK conflicting event')), /Conflicting/);
  const afterCommit: string[] = [];
  await assert.rejects(persistThenAck({ async query(sql: string) {
    afterCommit.push(sql.split(/\s+/)[0]); return { rowCount: 1, rows: [] };
  } }, 'run', event, () => { throw new Error('ACK failed'); }), /ACK failed/);
  assert.deepEqual(afterCommit, ['BEGIN','INSERT','COMMIT']);
  assert.equal(new URL(benchmarkDatabaseUrl({ DATABASE_URL: 'postgresql://production/business' })).pathname, '/matelematics_b1');
  for (const bad of ['postgresql://b1_benchmark@remote/matelematics_b1',
    'postgresql://b1_benchmark@localhost/postgres',
    'postgresql://postgres@localhost/matelematics_b1'])
    assert.throws(() => benchmarkDatabaseUrl({ RABBITMQ_B1_DATABASE_URL: bad }));
  console.log('PASS: B1 commit/ACK ordering, failure, replay identity and local DB guard');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
