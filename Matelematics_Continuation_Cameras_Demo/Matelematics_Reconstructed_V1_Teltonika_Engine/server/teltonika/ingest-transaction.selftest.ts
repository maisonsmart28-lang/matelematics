import assert from "node:assert/strict";
import { withIngestTransaction, CommitOutcomeUnknown, type TransactionClient } from "./ingest-transaction";
async function scenario(fail: string | null, writeFails = false) {
  const calls: string[] = [];
  let releases = 0, destroyed = false, writes = 0;
  const client: TransactionClient = {
    async query(sql) { calls.push(sql); if (sql === fail) throw Error("synthetic transport failure"); },
    release(value) { releases++; destroyed = value === true; },
  };
  let error: unknown, value: unknown;
  try {
    value = await withIngestTransaction({ async connect() { return client; } }, async tx => {
      assert.equal(tx, client); writes++;
      await tx.query("POSITION");
      if (writeFails) throw Error("write failed");
      await tx.query("TELEMETRY");
      await tx.query("ALERTS");
      await tx.query("DEVICE");
      return "stored";
    });
  } catch (e) { error = e; }
  assert.equal(releases, 1);
  return { calls, destroyed, writes, error, value };
}
async function main() {
  const success = await scenario(null);
  assert.equal(success.value, "stored"); assert.equal(success.calls.at(-1), "COMMIT"); assert.equal(success.destroyed, false);
  const failed = await scenario(null, true);
  assert.equal(failed.calls.at(-1), "ROLLBACK"); assert.equal(failed.calls.includes("COMMIT"), false); assert.equal(failed.writes, 1);
  for (const operation of ["POSITION", "TELEMETRY", "ALERTS", "DEVICE"]) {
    const r = await scenario(operation);
    assert.equal(r.calls.at(-1), "ROLLBACK"); assert.equal(r.calls.includes("COMMIT"), false); assert.equal(r.writes, 1);
  }
  const ambiguous = await scenario("COMMIT");
  assert.ok(ambiguous.error instanceof CommitOutcomeUnknown); assert.equal(ambiguous.destroyed, true);
  assert.equal(ambiguous.calls.includes("ROLLBACK"), false); assert.equal(ambiguous.writes, 1);
  const rollback = await scenario("ROLLBACK", true);
  assert.equal(rollback.destroyed, true); assert.equal((rollback.error as Error).message, "write failed");
  const begin = await scenario("BEGIN ISOLATION LEVEL READ COMMITTED");
  assert.equal(begin.writes, 0); assert.equal(begin.destroyed, true);
  console.log("INGEST TRANSACTION SELF-TEST PASS; synthetic client, no SQL/network; storage integration pending");
}
void main();
