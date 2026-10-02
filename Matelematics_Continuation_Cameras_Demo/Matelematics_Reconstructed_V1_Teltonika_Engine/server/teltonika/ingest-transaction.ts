export type TransactionClient = {
  query(sql: string, values?: unknown[]): Promise<unknown>;
  release(destroy?: boolean): void;
};
export type TransactionPool = { connect(): Promise<TransactionClient> };
export class CommitOutcomeUnknown extends Error {
  constructor() { super("INGEST_COMMIT_OUTCOME_UNKNOWN"); this.name = "CommitOutcomeUnknown"; }
}

/**
 * No automatic replay. A lost COMMIT reply must be reconciled by fingerprint.
 * All writes (including alert lifecycle) must use the supplied client.
 */
export async function withIngestTransaction<T>(
  pool: TransactionPool,
  write: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let began = false, committing = false, destroy = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    began = true;
    await client.query("SET LOCAL statement_timeout = '20s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
    const result = await write(client);
    committing = true;
    await client.query("COMMIT");
    began = false;
    return result;
  } catch (error) {
    if (committing) {
      // A rollback on a lost connection cannot establish whether COMMIT succeeded.
      destroy = true;
      throw new CommitOutcomeUnknown();
    }
    if (began) {
      try { await client.query("ROLLBACK"); }
      catch { destroy = true; }
    } else {
      destroy = true;
    }
    throw error;
  } finally {
    client.release(destroy);
  }
}
