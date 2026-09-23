import { strict as assert } from 'node:assert';
import { persistBatchThenAck, type Envelope } from './step10e-rabbitmq-b1-store.ts';

const runId = '00000000-0000-4000-8000-000000000001';
const events: Envelope[] = [0, 1].map(sequence => ({
  message_id: `${runId}:${sequence}`, schema_version: 1,
  company_id: runId, vehicle_id: runId, device_id: 'B2-SYNTHETIC',
  recorded_at: '2026-09-23T00:00:00.000Z', received_at: '2026-09-23T00:00:00.000Z',
  source: 'teltonika', payload: { benchmark: 'step10e4f_b1', sequence }, attempt: 0,
}));

async function scenario(rowCount: number, failCommit: boolean, expectedQueries: string[], expectedAcks: number) {
  const queries: string[] = [], acked: string[] = [];
  const db = { async query(sql: string, values?: unknown[]) {
    queries.push(sql.startsWith('INSERT') ? 'INSERT' : sql);
    if (sql.startsWith('INSERT')) {
      assert.equal(values?.[0], runId);
      assert.deepEqual(JSON.parse(values?.[1] as string).map((row: { message_id: string }) => row.message_id),
        events.map(event => event.message_id));
    }
    if (sql === 'COMMIT' && failCommit) throw new Error('commit failed');
    return { rowCount, rows: [] };
  } };
  const batch = events.map(event => ({ event, ack: () => acked.push(event.message_id) }));
  if (rowCount === events.length && !failCommit) await persistBatchThenAck(db, runId, batch);
  else await assert.rejects(persistBatchThenAck(db, runId, batch));
  assert.deepEqual(queries, expectedQueries);
  assert.equal(acked.length, expectedAcks);
}

await scenario(2, false, ['BEGIN', 'INSERT', 'COMMIT'], 2);
await scenario(1, false, ['BEGIN', 'INSERT', 'ROLLBACK'], 0);
await scenario(2, true, ['BEGIN', 'INSERT', 'COMMIT', 'ROLLBACK'], 0);
console.log('B2 batch commit-before-ACK selftest PASS');
