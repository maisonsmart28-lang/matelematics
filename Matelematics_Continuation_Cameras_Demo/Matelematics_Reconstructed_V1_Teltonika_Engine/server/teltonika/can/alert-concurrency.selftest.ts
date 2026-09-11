import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ACTIVE_ALERT_UNIQUE_INDEX,
  isActiveAlertUniqueConflict,
} from "./alert-concurrency";

assert.equal(
  isActiveAlertUniqueConflict({
    code: "23505",
    message: `duplicate key value violates unique constraint \"${ACTIVE_ALERT_UNIQUE_INDEX}\"`,
  }),
  true,
);

assert.equal(
  isActiveAlertUniqueConflict({
    code: "23505",
    message: 'duplicate key value violates unique constraint "some_other_index"',
  }),
  false,
);

assert.equal(
  isActiveAlertUniqueConflict({
    code: "42501",
    message: `permission denied for ${ACTIVE_ALERT_UNIQUE_INDEX}`,
  }),
  false,
);

assert.equal(isActiveAlertUniqueConflict(null), false);

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations-prepared/v12/05_alert_active_uniqueness.sql",
);
const migration = readFileSync(migrationPath, "utf8");

assert.ok(migration.includes(`CREATE UNIQUE INDEX IF NOT EXISTS ${ACTIVE_ALERT_UNIQUE_INDEX}`));
assert.ok(
  migration.includes("ON public.alerts (company_id, vehicle_id, alert_type)"),
);
assert.ok(migration.includes("WHERE status = 'active'"));
assert.ok(migration.includes("HAVING count(*) > 1"));

console.log("Teltonika Step 6B active alert concurrency self-test PASS");
