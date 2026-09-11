import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const failures: string[] = [];
const passes: string[] = [];

function read(relativePath: string) {
  const fullPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireContains(
  relativePath: string,
  content: string,
  expected: string,
  label: string,
) {
  if (!content.includes(expected)) {
    failures.push(`${label}: expected ${JSON.stringify(expected)} in ${relativePath}`);
  } else {
    passes.push(label);
  }
}

function requireRegex(
  relativePath: string,
  content: string,
  expression: RegExp,
  label: string,
) {
  if (!expression.test(content)) {
    failures.push(`${label}: invariant not detected in ${relativePath}`);
  } else {
    passes.push(label);
  }
}

function main() {
  const alertsPath = "app/api/alerts/route.ts";
  const alerts = read(alertsPath);

  requireRegex(
    alertsPath,
    alerts,
    /profile\.role\s*===\s*["']client_admin["']\s*\|\|[\s\S]*profile\.role\s*===\s*["']user["'][\s\S]*profile\.company_id/,
    "Alerts client/user scope is restricted to profile.company_id",
  );

  requireRegex(
    alertsPath,
    alerts,
    /profile\.role\s*===\s*["']partner_admin["'][\s\S]*\.eq\([\s\S]*["']partner_id["'][\s\S]*profile\.partner_id/,
    "Alerts partner scope is restricted to partner-owned companies",
  );

  requireRegex(
    alertsPath,
    alerts,
    /\.from\([\s\S]*["']vehicles["'][\s\S]*\.in\([\s\S]*["']company_id["'][\s\S]*companyIds/,
    "Alerts visibility is derived from tenant-scoped vehicles",
  );

  requireRegex(
    alertsPath,
    alerts,
    /\.from\([\s\S]*["']alerts["'][\s\S]*\.in\([\s\S]*["']vehicle_id["'][\s\S]*vehicleIds/,
    "Alerts GET reads only visible vehicle IDs",
  );

  requireRegex(
    alertsPath,
    alerts,
    /visibleVehicleIds\.has\([\s\S]*alert\.vehicle_id/,
    "Alerts single acknowledge verifies visible vehicle ownership",
  );

  requireRegex(
    alertsPath,
    alerts,
    /acknowledge_all[\s\S]*\.in\([\s\S]*["']vehicle_id["'][\s\S]*visibleVehicleIds/,
    "Alerts acknowledge_all is constrained to visible vehicle IDs",
  );

  const diagnosticsPath = "app/api/diagnostics/route.ts";
  const diagnostics = read(diagnosticsPath);

  requireRegex(
    diagnosticsPath,
    diagnostics,
    /profile\.role\s*===\s*["']client_admin["']\s*\|\|[\s\S]*profile\.role\s*===\s*["']user["'][\s\S]*profile\.company_id/,
    "Diagnostics client/user scope is restricted to profile.company_id",
  );

  requireRegex(
    diagnosticsPath,
    diagnostics,
    /profile\.role\s*===\s*["']partner_admin["'][\s\S]*\.eq\([\s\S]*["']partner_id["'][\s\S]*profile\.partner_id/,
    "Diagnostics partner scope is restricted to partner-owned companies",
  );

  for (const table of ["devices", "alerts", "telemetry"] as const) {
    requireRegex(
      diagnosticsPath,
      diagnostics,
      new RegExp(`\\.from\\([\\s\\S]*["']${table}["'][\\s\\S]*\\.in\\([\\s\\S]*["']vehicle_id["'][\\s\\S]*vehicleIds`),
      `Diagnostics ${table} reads are constrained to visible vehicle IDs`,
    );
  }

  requireRegex(
    diagnosticsPath,
    diagnostics,
    /profile\.role\s*===\s*["']user["'][\s\S]*FORBIDDEN/,
    "Diagnostics mutation rejects ordinary user",
  );

  requireRegex(
    diagnosticsPath,
    diagnostics,
    /vehicles\.find\([\s\S]*item\.id\s*===\s*body\.vehicleId/,
    "Diagnostics clear_dtc resolves target only from visible vehicles",
  );

  const rlsPath = "supabase/migrations-prepared/v1/06_rls.sql";
  const rls = read(rlsPath);

  for (const table of ["alerts", "telemetry"] as const) {
    requireRegex(
      rlsPath,
      rls,
      new RegExp(`CREATE POLICY ${table}_select_scope[\\s\\S]*public\\.can_access_company\\(company_id\\)`),
      `${table} authenticated SELECT remains company-scoped by RLS`,
    );
  }

  const integrityPath =
    "supabase/migrations-prepared/v12/04_alert_diagnostic_tenant_integrity.sql";
  const integrity = read(integrityPath);

  requireContains(
    integrityPath,
    integrity,
    "CREATE OR REPLACE FUNCTION public.enforce_vehicle_company_integrity()",
    "Tenant integrity trigger function exists",
  );

  requireRegex(
    integrityPath,
    integrity,
    /v\.id\s*=\s*NEW\.vehicle_id[\s\S]*v\.company_id\s*=\s*NEW\.company_id/,
    "Tenant integrity compares vehicle and company as one pair",
  );

  for (const table of ["devices", "telemetry", "alerts", "positions"] as const) {
    requireContains(
      integrityPath,
      integrity,
      `trg_${table}_vehicle_company_integrity`,
      `${table} has vehicle/company integrity trigger`,
    );
  }

  requireRegex(
    integrityPath,
    integrity,
    /REVOKE ALL[\s\S]*enforce_vehicle_company_integrity\(\)[\s\S]*FROM PUBLIC, anon, authenticated/,
    "Tenant integrity function is not directly executable by client roles",
  );

  console.log("P1 / Step 6D - alerts & diagnostics tenant isolation audit");
  console.log(`Checks passed: ${passes.length}`);

  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} blocking issue(s)`);
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("P1 Step 6D tenant isolation audit PASS");
}

main();
