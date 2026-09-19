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

function requireRegex(content: string, expression: RegExp, label: string) {
  if (!expression.test(content)) failures.push(label);
  else passes.push(label);
}

function requireNotRegex(content: string, expression: RegExp, label: string) {
  if (expression.test(content)) failures.push(label);
  else passes.push(label);
}

function main() {
  const apiPath = "app/api/dashboard/smart-insights/route.ts";
  const api = read(apiPath);

  requireRegex(
    api,
    /profile\.role\s*===\s*["']client_admin["']\s*\|\|\s*profile\.role\s*===\s*["']user["'][\s\S]*profile\.company_id/,
    "SMART-1F client_admin/user must be restricted to profile.company_id",
  );

  requireRegex(
    api,
    /profile\.role\s*===\s*["']partner_admin["'][\s\S]*\.from\(["']companies["']\)[\s\S]*\.eq\(["']partner_id["'],\s*profile\.partner_id\)/,
    "SMART-1F partner_admin must resolve only partner-owned companies",
  );

  requireRegex(
    api,
    /vehicleQuery\s*=\s*vehicleQuery\.in\(["']company_id["'],\s*allowedCompanyIds\)/,
    "SMART-1F vehicle query must apply allowed company IDs",
  );

  for (const table of ["devices", "telemetry", "cameras", "alerts"] as const) {
    requireRegex(
      api,
      new RegExp(`\\.from\\(["']${table}["']\\)[\\s\\S]*\\.in\\(["']vehicle_id["'],\\s*vehicleIds\\)`),
      `SMART-1F ${table} query must be constrained to visible vehicle IDs`,
    );
  }

  requireRegex(
    api,
    /admin\.auth\.getUser\(token\)/,
    "SMART-1F bearer token must be authenticated server-side",
  );

  requireRegex(
    api,
    /if \(!token\) throw new Error\(["']AUTH_REQUIRED["']\)/,
    "SMART-1F anonymous requests must be rejected",
  );

  requireNotRegex(
    api,
    /NEXT_PUBLIC_[A-Z0-9_]*(SERVICE|SECRET|ROLE)|service_role/i,
    "SMART-1F must not expose privileged credentials to browser code",
  );

  const dashboardPath = "app/dashboard/page.tsx";
  const dashboard = read(dashboardPath);

  requireRegex(
    dashboard,
    /fetch\(["']\/api\/dashboard\/smart-insights["'][\s\S]*headers/,
    "SMART-1F dashboard must call Smart API with authenticated headers",
  );

  requireNotRegex(
    dashboard,
    /calculateFleetHealth|buildSmartRecommendations|resolveHardwareCapabilities/,
    "SMART-1F browser must not calculate authoritative Smart results",
  );

  console.log("SMART-1F - Smart Fleet Insights tenant/security audit");
  console.log(`Checks passed: ${passes.length}`);

  if (failures.length) {
    console.error(`FAIL: ${failures.length} blocking issue(s)`);
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log("PASS: SMART-1F tenant/security static audit");
}

main();
