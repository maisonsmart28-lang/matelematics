/** Persistence target for the local B1 harness only. */
export type Envelope = {
  message_id: string; schema_version: 1; company_id: string; vehicle_id: string;
  device_id: string | null; recorded_at: string; received_at: string;
  source: "teltonika"; payload: { benchmark: "step10e4f_b1"; sequence: number }; attempt: 0;
};
type DB = { query(sql: string, values?: unknown[]): Promise<{ rowCount: number | null; rows: Record<string, unknown>[] }> };
export function benchmarkDatabaseUrl(env: Record<string,string|undefined> = process.env) {
  // Ignore DATABASE_URL and .env.local: those could point to business data.
  const url = env.RABBITMQ_B1_DATABASE_URL ?? "postgresql://b1_benchmark:b1_local_only@127.0.0.1:55432/matelematics_b1";
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("Invalid local B1 database URL"); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      !['localhost','127.0.0.1','[::1]'].includes(parsed.hostname) ||
      parsed.pathname !== '/matelematics_b1' || parsed.username !== 'b1_benchmark' || parsed.search || parsed.hash)
    throw new Error("B1 requires a local PostgreSQL database matelematics_b1 and user b1_benchmark");
  return url;
}
export async function persistThenAck(db: DB, runId: string, event: Envelope, ack: () => void): Promise<boolean> {
  await db.query('BEGIN');
  let inserted = false;
  try {
    const args = [event.message_id, runId, JSON.stringify(event)];
    const result = await db.query(`INSERT INTO b1.events (message_id,run_id,envelope)
      VALUES ($1,$2::uuid,$3::jsonb) ON CONFLICT (message_id) DO NOTHING`, args);
    inserted = result.rowCount === 1;
    if (!inserted) {
      const match = await db.query(`SELECT message_id FROM b1.events
        WHERE message_id=$1 AND run_id=$2::uuid AND envelope=$3::jsonb`, args);
      if (match.rows.length !== 1) throw new Error('Conflicting benchmark message identity');
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
  ack(); // failure after COMMIT preserves the event for replay
  return inserted;
}

/** Local B2 experiment: one transaction for a bounded set of validated messages. */
export async function persistBatchThenAck(db: DB, runId: string,
  batch: Array<{ event: Envelope; ack: () => void }>): Promise<void> {
  if (batch.length < 1 || batch.length > 20) throw new Error('B2 batch must contain 1–20 events');
  const ids = batch.map(({ event }) => event.message_id);
  if (new Set(ids).size !== ids.length || ids.some(id => !id.startsWith(`${runId}:`)))
    throw new Error('Invalid or repeated B2 batch identity');
  await db.query('BEGIN');
  try {
    const rows = batch.map(({ event }) => ({ message_id: event.message_id, envelope: event }));
    const result = await db.query(`INSERT INTO b1.events (message_id, run_id, envelope)
      SELECT item.message_id, $1::uuid, item.envelope
      FROM jsonb_to_recordset($2::jsonb) AS item(message_id text, envelope jsonb)
      ON CONFLICT (message_id) DO NOTHING`, [runId, JSON.stringify(rows)]);
    if (result.rowCount !== batch.length) throw new Error('B2 batch identity conflict');
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw error;
  }
  for (const item of batch) item.ack(); // each ACK follows the whole committed batch
}
