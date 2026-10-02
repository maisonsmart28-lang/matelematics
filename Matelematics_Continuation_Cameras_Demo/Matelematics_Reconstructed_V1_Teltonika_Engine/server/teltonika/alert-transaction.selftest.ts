import assert from "node:assert/strict";
import { withAlertTransaction, currentAlertTransaction, transactionAlertSettings, transactionLatestAlert, transactionActiveDiagnostics, transactionInsertAlert, transactionResolveAlert } from "./alert-transaction";
import type { TransactionClient } from "./ingest-transaction";
async function main() {
 const calls: { sql: string; values: unknown[] }[] = [];
 const a: TransactionClient = { async query(sql, values = []) { calls.push({ sql, values }); return { rows: [], rowCount: 0 }; }, release() {} };
 const b: TransactionClient = { async query() { return { rows: [], rowCount: 0 }; }, release() {} };
 let release!: () => void;
 const gate = new Promise<void>(r => { release = r; });
 const first = withAlertTransaction(a, async () => { assert.equal(currentAlertTransaction(),a); await gate; assert.equal(currentAlertTransaction(),a); });
 await withAlertTransaction(b, async () => { assert.equal(currentAlertTransaction(),b); release(); });
 await first;
 assert.equal(currentAlertTransaction(),undefined);
 await assert.rejects(withAlertTransaction(a, async () => { throw Error("synthetic"); }));
 assert.equal(currentAlertTransaction(),undefined);
 const marker = "'; DROP TABLE alerts; --";
 await transactionAlertSettings(a,marker,"vehicle");
 await transactionLatestAlert(a,marker,"vehicle",marker);
 await transactionActiveDiagnostics(a,marker,"vehicle");
 await transactionInsertAlert(a,{ company_id: marker, metadata: { source: "test" } });
 await transactionResolveAlert(a,marker,"2026-10-02T00:00:00Z");
 assert.equal(calls.length,5);
 for(const call of calls) { assert.equal(call.sql.includes(marker),false); assert.ok(call.values.includes(marker)); }
 assert.ok(calls[2].sql.includes("starts_with"));
 assert.equal(calls[3].values[11],JSON.stringify({source:"test"}));
 const broken: TransactionClient = { async query() { throw Error("SQL failure"); }, release() {} };
 await assert.rejects(transactionAlertSettings(broken,"company","vehicle"),/SQL failure/);
 console.log("ALERT TRANSACTION ADAPTER PASS; isolated async contexts, parameter binding, propagated SQL failure; no DB/network");
}
void main();
