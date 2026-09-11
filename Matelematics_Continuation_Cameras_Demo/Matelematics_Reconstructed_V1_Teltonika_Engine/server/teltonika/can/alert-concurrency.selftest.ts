import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations-prepared/v12/05_alert_active_uniqueness.sql",
);
const migration = readFileSync(migrationPath, "utf8");

assert.ok(
  migration.includes(
    "CREATE OR REPLACE FUNCTION public.serialize_active_vehicle_alert_insert()",
  ),
);
assert.ok(migration.includes("pg_advisory_xact_lock"));
assert.ok(
  migration.includes(
    "CREATE TRIGGER trg_alerts_serialize_active_insert",
  ),
);
assert.ok(
  migration.includes(
    "CREATE UNIQUE INDEX IF NOT EXISTS alerts_one_active_per_type_vehicle_idx",
  ),
);
assert.ok(
  migration.includes("ON public.alerts (company_id, vehicle_id, alert_type)"),
);
assert.ok(migration.includes("WHERE status = 'active'"));
assert.ok(migration.includes("AND vehicle_id IS NOT NULL"));
assert.ok(migration.includes("HAVING count(*) > 1"));
assert.ok(migration.includes("RETURN NULL;"));

console.log("Teltonika Step 6B active alert concurrency self-test PASS");
