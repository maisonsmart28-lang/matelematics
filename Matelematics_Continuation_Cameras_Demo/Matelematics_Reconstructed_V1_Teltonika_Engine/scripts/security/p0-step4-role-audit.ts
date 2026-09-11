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
    failures.push(`${label}: role protection not detected in ${relativePath}`);
  } else {
    passes.push(label);
  }
}

function main() {
  const accessPath = "app/dashboard/DashboardAccessContext.tsx";
  const access = read(accessPath);

  requireRegex(
    accessPath,
    access,
    /const\s+canManage\s*=\s*[\s\S]*isMatelematicsAdmin\s*\|\|[\s\S]*isPartnerAdmin\s*\|\|[\s\S]*isClientAdmin\s*;/,
    "Dashboard mutation capability excludes ordinary user",
  );

  const shellPath = "components/DashboardShell.tsx";
  const shell = read(shellPath);

  requireRegex(
    shellPath,
    shell,
    /userRole\s*===\s*["']matelematics_admin["'][\s\S]*userRole\s*===\s*["']partner_admin["'][\s\S]*userRole\s*===\s*["']client_admin["']/,
    "Dashboard admin navigation is limited to administrative roles",
  );

  requireRegex(
    shellPath,
    shell,
    /filter\([\s\S]*\/admin/,
    "Ordinary user has Administration removed from navigation",
  );

  const adminApiPath = "app/api/admin/route.ts";
  const adminApi = read(adminApiPath);

  requireRegex(
    adminApiPath,
    adminApi,
    /profile\.role\s*===\s*["']user["'][\s\S]*status:\s*403/,
    "Administration API rejects ordinary user",
  );

  const vehiclesPath = "app/dashboard/vehicles/page.tsx";
  const vehicles = read(vehiclesPath);

  requireContains(
    vehiclesPath,
    vehicles,
    "useDashboardAccess",
    "Vehicles page consumes dashboard role context",
  );

  requireRegex(
    vehiclesPath,
    vehicles,
    /\{canCreate\s*&&\s*\([\s\S]*Ajouter un véhicule/,
    "Add vehicle control is hidden from ordinary user",
  );

  requireRegex(
    vehiclesPath,
    vehicles,
    /showAddVehicle\s*&&\s*canCreate/,
    "Add vehicle modal is role-gated",
  );

  const driversPath = "app/dashboard/conducteurs/page.tsx";
  const drivers = read(driversPath);

  requireContains(
    driversPath,
    drivers,
    "useDashboardAccess",
    "Drivers page consumes dashboard role context",
  );

  requireRegex(
    driversPath,
    drivers,
    /\{canCreate\s*&&\s*\([\s\S]*Ajouter un conducteur/,
    "Add driver control is hidden from ordinary user",
  );

  requireRegex(
    driversPath,
    drivers,
    /showAddDriver\s*&&\s*canCreate/,
    "Add driver modal is role-gated",
  );

  const adminLayoutPath = "app/dashboard/admin/layout.tsx";
  const adminLayout = read(adminLayoutPath);

  if (adminLayout) {
    requireContains(
      adminLayoutPath,
      adminLayout,
      "useDashboardAccess",
      "Administration route has an explicit client-side role guard",
    );

    requireRegex(
      adminLayoutPath,
      adminLayout,
      /isUser|canManage/,
      "Administration route blocks ordinary user navigation",
    );
  }

  const diagnosticsPath = "app/api/diagnostics/route.ts";
  const diagnostics = read(diagnosticsPath);

  requireRegex(
    diagnosticsPath,
    diagnostics,
    /role\s*===\s*["']user["'][\s\S]*(?:FORBIDDEN|403|clear_dtc)/,
    "Diagnostics mutation path protects ordinary user",
  );

  console.log("P0 / Step 4 - functional role audit");
  console.log(`Checks passed: ${passes.length}`);

  if (failures.length > 0) {
    console.error(`FAIL: ${failures.length} blocking issue(s)`);
    for (const failure of failures) {
      console.error(`FAIL: ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("P0 Step 4 static role audit PASS");
}

main();
