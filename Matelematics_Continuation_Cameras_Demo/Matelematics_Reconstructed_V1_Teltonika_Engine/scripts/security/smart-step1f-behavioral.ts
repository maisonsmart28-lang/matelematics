type ExpectedScope = {
  label: string;
  tokenEnv: string;
  expectedTotalVehicles: number;
  allowedVehicleNames: string[];
};

const BASE_URL = (process.env.SMART_TEST_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const scopes: ExpectedScope[] = [
  {
    label: "user TEST A",
    tokenEnv: "SMART_TEST_USER_TOKEN",
    expectedTotalVehicles: 3,
    allowedVehicleNames: ["Camion J1939 Test", "Mercedes Sprinter A", "Renault Master A"],
  },
  {
    label: "client_admin TEST A",
    tokenEnv: "SMART_TEST_CLIENT_ADMIN_TOKEN",
    expectedTotalVehicles: 3,
    allowedVehicleNames: ["Camion J1939 Test", "Mercedes Sprinter A", "Renault Master A"],
  },
  {
    label: "partner_admin TEST 1",
    tokenEnv: "SMART_TEST_PARTNER_ADMIN_TOKEN",
    expectedTotalVehicles: 4,
    allowedVehicleNames: ["Camion J1939 Test", "Mercedes Sprinter A", "Renault Master A", "Ford Transit B"],
  },
  {
    label: "isolated user TEST ADMIN CRUD",
    tokenEnv: "SMART_TEST_ISOLATED_USER_TOKEN",
    expectedTotalVehicles: 0,
    allowedVehicleNames: [],
  },
];

type ApiPayload = {
  insights?: {
    totalVehicles?: number;
    attention?: Array<{ name?: string }>;
  };
  error?: string;
};

async function verifyScope(scope: ExpectedScope) {
  const token = process.env[scope.tokenEnv];
  if (!token) {
    throw new Error(`Missing ${scope.tokenEnv}. Token is read only from the local process environment.`);
  }

  const response = await fetch(`${BASE_URL}/api/dashboard/smart-insights`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiPayload;
  if (!response.ok) {
    throw new Error(`${scope.label}: HTTP ${response.status} - ${payload.error ?? "unknown error"}`);
  }

  const total = payload.insights?.totalVehicles;
  if (total !== scope.expectedTotalVehicles) {
    throw new Error(`${scope.label}: expected ${scope.expectedTotalVehicles} vehicles, received ${String(total)}`);
  }

  const returnedAttentionNames = (payload.insights?.attention ?? [])
    .map((item) => item.name)
    .filter((name): name is string => Boolean(name));

  const forbidden = returnedAttentionNames.filter((name) => !scope.allowedVehicleNames.includes(name));
  if (forbidden.length) {
    throw new Error(`${scope.label}: cross-tenant Smart data detected: ${forbidden.join(", ")}`);
  }

  console.log(
    `PASS: ${scope.label} -> totalVehicles=${total}, attention=${returnedAttentionNames.length}`,
  );
}

async function verifyAnonymousDenied() {
  const response = await fetch(`${BASE_URL}/api/dashboard/smart-insights`, { cache: "no-store" });
  if (response.status !== 401) {
    throw new Error(`anonymous request: expected HTTP 401, received ${response.status}`);
  }
  console.log("PASS: anonymous request -> HTTP 401");
}

async function main() {
  console.log("SMART-1F behavioral tenant isolation test");
  console.log(`Target: ${BASE_URL}`);
  await verifyAnonymousDenied();

  const selectedEnv = process.env.SMART_TEST_TOKEN_ENV;
  if (selectedEnv) {
    const scope = scopes.find((item) => item.tokenEnv === selectedEnv);
    if (!scope) throw new Error(`Unknown SMART_TEST_TOKEN_ENV: ${selectedEnv}`);
    await verifyScope(scope);
    console.log(`PASS: SMART-1F behavioral scope -> ${scope.label}`);
    return;
  }

  for (const scope of scopes) await verifyScope(scope);
  console.log("PASS: SMART-1F behavioral tenant isolation");
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
