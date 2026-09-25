import assert from "node:assert/strict";
import { createServer } from "node:http";
import { normalizePosition, parseImeis, run } from "./matelematics-bridge.mjs";

const imeis = ["356307042441234", "864180070000001"];
assert.deepEqual(parseImeis(imeis.join(",")), imeis);
assert.throws(() => parseImeis(imeis[0]), /exactement deux IMEI/);
assert.throws(() => parseImeis(`${imeis[0]},${imeis[0]}`), /exactement deux IMEI/);

const validPosition = {
  valid: true,
  fixTime: new Date().toISOString(),
  latitude: 33.5731,
  longitude: -7.5898,
  altitude: 35,
  speed: 10,
  course: 270,
};
const converted = normalizePosition(validPosition);
assert.equal(converted.ok, true);
assert.equal(converted.row.speed, 18.52, "Traccar speed in knots converts to km/h");
assert.equal(normalizePosition({ ...validPosition, valid: false }).reason, "invalid_fix");
assert.equal(normalizePosition({ ...validPosition, latitude: 91 }).reason, "invalid_coordinates");

const company = "00000000-0000-4000-8000-000000000001";
const inserted = [];
const patches = [];
const requests = [];
const now = new Date().toISOString();
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  requests.push({ method: request.method, path: url.pathname, query: url.searchParams.toString() });
  if (url.pathname.startsWith("/api/")) {
    assert.equal(request.headers.authorization, `Basic ${Buffer.from("bridge-user:fake-pass").toString("base64")}`);
  }
  if (url.pathname === "/api/devices") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify([
      { id: 11, uniqueId: imeis[0], status: "online", lastUpdate: now },
      { id: 12, uniqueId: imeis[1], status: "online", lastUpdate: now },
      { id: 13, uniqueId: "111111111111111", status: "online", lastUpdate: now },
    ]));
    return;
  }
  if (url.pathname === "/api/positions") {
    const id = Number(url.searchParams.get("deviceId"));
    response.writeHead(200, { "content-type": "application/json" });
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (url.searchParams.get("from")?.startsWith(yesterday)) {
      const point = { ...validPosition, fixTime: `${yesterday}T12:00:00.000Z`, id: id * 100, deviceId: id, attributes: { ignition: true, power: 12.1 } };
      response.end(JSON.stringify([point, { ...point, id: id * 100 + 1, valid: false }]));
      return;
    }
    response.end(JSON.stringify([{ ...validPosition, id: id * 100, deviceId: id, latitude: id === 11 ? 33.57 : 33.58 }]));
    return;
  }
  if (url.pathname === "/rest/v1/devices" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(imeis.map((imei, i) => ({
      id: `10000000-0000-4000-8000-00000000000${i + 1}`,
      company_id: company,
      vehicle_id: `20000000-0000-4000-8000-00000000000${i + 1}`,
      imei,
    }))));
    return;
  }
  if (url.pathname === "/rest/v1/positions" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end("[]");
    return;
  }
  if (url.pathname === "/rest/v1/positions" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    inserted.push(...JSON.parse(body));
    response.writeHead(201, { "content-length": "0" });
    response.end();
    return;
  }
  if (url.pathname === "/rest/v1/devices" && request.method === "PATCH") {
    let body = "";
    for await (const chunk of request) body += chunk;
    patches.push({ query: url.searchParams.toString(), body: JSON.parse(body) });
    response.writeHead(204);
    response.end();
    return;
  }
  response.writeHead(404);
  response.end();
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const original = new Map();
const env = {
  TRACCAR_BASE_URL: `http://127.0.0.1:${port}`,
  TRACCAR_API_USER: "bridge-user",
  TRACCAR_API_PASSWORD: "fake-pass",
  TRACCAR_ALLOWED_IMEIS: imeis.join(","),
  TRACCAR_INITIAL_LOOKBACK_MINUTES: "10",
  TRACCAR_POLL_INTERVAL_MS: "5000",
  SUPABASE_URL: `http://127.0.0.1:${port}`,
  SUPABASE_SECRET_KEY: "fake-only-secret",
  TRACCAR_TEST_COMPANY_ID: company,
};
for (const [key, value] of Object.entries(env)) {
  original.set(key, process.env[key]);
  process.env[key] = value;
}
original.set("TRACCAR_BRIDGE_ALLOW_WRITES", process.env.TRACCAR_BRIDGE_ALLOW_WRITES);
process.env.TRACCAR_BRIDGE_ALLOW_WRITES = "BLOCKED_BY_SELFTEST";

const output = [];
const oldLog = console.log;
console.log = (message) => output.push(String(message));
try {
  await run(["--once"]);
  assert.equal(inserted.length, 0, "dry-run must never write to Supabase");
  assert.equal(requests.some((item) => item.path.startsWith("/rest/v1/")), false, "dry-run must not call Supabase");
  assert.equal(output.some((line) => line.includes("33.57") || line.includes(imeis[0])), false, "logs must not reveal positions or complete IMEI");

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const beforeHistory = requests.length;
  await run([`--history=${yesterday}`]);
  assert.equal(requests.slice(beforeHistory).filter((item) => item.path === "/api/positions").length, 8, "history should query four six-hour windows for each allowed device");
  assert.equal(requests.some((item) => item.path.startsWith("/rest/v1/")), false, "history must not contact Supabase");
  const reports = output.filter((line) => line.includes('"event":"traccar-bridge-history-device"')).map(JSON.parse);
  assert.equal(reports.length, 2);
  assert(reports.every((report) => report.positions === 2 && report.validPositions === 1 && report.rejectedReasons.invalid_fix === 1));
  const beforeInventory = output.length;
  await run([`--history=${yesterday}`, "--history-telemetry"]);
  const inventories = output.slice(beforeInventory).filter((line) => line.includes('"event":"traccar-bridge-telemetry-inventory"')).map(JSON.parse);
  assert.equal(inventories.length, 2);
  assert(inventories.every((item) => item.positions === 2 && item.attributeKeys.find((entry) => entry.name === "ignition")?.points === 2));
  assert(output.slice(beforeInventory).every((line) => !line.includes("33.5731") && !line.includes(imeis[0]) && !line.includes('"latitude"')));
  assert.equal(requests.some((item) => item.path.startsWith("/rest/v1/")), false);
  await assert.rejects(run([`--history=${yesterday}`, "--write"]), /lecture seule/);

  await assert.rejects(run(["--write", "--once"]), /TRACCAR_BRIDGE_ALLOW_WRITES/);
  assert.equal(requests.some((item) => item.path.startsWith("/rest/v1/")), false, "write guard must be checked before any database call");

  process.env.TRACCAR_BRIDGE_ALLOW_WRITES = "I_ACCEPT_TEST_ONLY_WRITES";
  await run(["--write", "--once"]);
  assert.equal(inserted.length, 2, "write mode must insert only the two allowlisted positions");
  assert.equal(patches.length, 2, "only the two allowlisted device rows may be refreshed");
  assert(inserted.every((row) => row.company_id === company));
  assert(inserted.every((row) => row.speed === 18.52));
  assert.equal(requests.some((item) => item.path === "/api/positions" && new URLSearchParams(item.query).get("deviceId") === "13"), false);
} finally {
  console.log = oldLog;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  for (const [key, value] of original) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

console.log("Matelematics Traccar bridge self-test PASS");
