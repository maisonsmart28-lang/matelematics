import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT = fileURLToPath(import.meta.url);
const OVERLAP_MS = 60_000;

function loadLocalEnv() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const split = line.indexOf("=");
    if (split < 1) continue;
    const key = line.slice(0, split).trim();
    let value = line.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variable manquante : ${name}`);
  return value;
}

export function parseImeis(value) {
  const list = (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  if (list.length !== 2 || new Set(list).size !== 2 || list.some((v) => !/^\d{10,20}$/.test(v))) {
    throw new Error("TRACCAR_ALLOWED_IMEIS doit contenir exactement deux IMEI numériques distincts.");
  }
  return list;
}

export function normalizePosition(position) {
  const time = position.fixTime ?? position.deviceTime ?? position.serverTime;
  const ms = typeof time === "string" ? Date.parse(time) : NaN;
  const latitude = Number(position.latitude);
  const longitude = Number(position.longitude);
  const altitude = Number(position.altitude ?? 0);
  const speedKnots = Number(position.speed ?? 0);
  const heading = Number(position.course ?? 0);
  if (position.valid !== true) return { ok: false, reason: "invalid_fix", ms };
  if (!Number.isFinite(ms) || ms < Date.UTC(2000, 0, 1) || ms > Date.now() + 86_400_000) return { ok: false, reason: "invalid_time", ms };
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return { ok: false, reason: "invalid_coordinates", ms };
  if (!Number.isFinite(altitude) || altitude < -1_000 || altitude > 20_000 || !Number.isFinite(speedKnots) || speedKnots < 0 || speedKnots > 1_000 || !Number.isFinite(heading) || heading < 0 || heading > 360) return { ok: false, reason: "invalid_measurement", ms };
  return {
    ok: true,
    ms,
    row: {
      latitude,
      longitude,
      altitude,
      speed: speedKnots * 1.852,
      heading,
      recorded_at: new Date(ms).toISOString(),
    },
  };
}

function configFrom(args) {
  const base = new URL(required("TRACCAR_BASE_URL"));
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("TRACCAR_BASE_URL doit être une URL HTTP(S) sans identifiants ni paramètres.");
  if (base.protocol === "http:" && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(base.hostname)) throw new Error("Pour un serveur Traccar distant, HTTPS est obligatoire.");
  base.pathname = `${base.pathname.replace(/\/$/, "")}/`;
  const write = args.includes("--write");
  const watch = args.includes("--watch");
  const lookback = Number(process.env.TRACCAR_INITIAL_LOOKBACK_MINUTES ?? 10);
  const pollMs = Number(process.env.TRACCAR_POLL_INTERVAL_MS ?? 5_000);
  if (!Number.isInteger(lookback) || lookback < 1 || lookback > 60) throw new Error("TRACCAR_INITIAL_LOOKBACK_MINUTES doit être entre 1 et 60.");
  if (!Number.isInteger(pollMs) || pollMs < 3_000 || pollMs > 60_000) throw new Error("TRACCAR_POLL_INTERVAL_MS doit être entre 3000 et 60000.");
  const cfg = {
    base,
    user: required("TRACCAR_API_USER"),
    password: required("TRACCAR_API_PASSWORD"),
    imeis: parseImeis(process.env.TRACCAR_ALLOWED_IMEIS),
    write,
    watch,
    once: args.includes("--once") || !watch,
    pollMs,
    lookback,
  };
  if (write) {
    if (process.env.TRACCAR_BRIDGE_ALLOW_WRITES !== "I_ACCEPT_TEST_ONLY_WRITES") throw new Error("Écriture refusée. Après vérification du tenant de test, définir TRACCAR_BRIDGE_ALLOW_WRITES=I_ACCEPT_TEST_ONLY_WRITES.");
    cfg.supabase = new URL(required("SUPABASE_URL"));
    if (cfg.supabase.protocol !== "https:" && !["127.0.0.1", "localhost", "::1", "[::1]"].includes(cfg.supabase.hostname)) throw new Error("SUPABASE_URL doit utiliser HTTPS hors loopback.");
    if (cfg.supabase.username || cfg.supabase.password || cfg.supabase.search || cfg.supabase.hash) throw new Error("SUPABASE_URL ne doit pas contenir d’identifiants ou paramètres.");
    cfg.secret = required("SUPABASE_SECRET_KEY");
    cfg.company = required("TRACCAR_TEST_COMPANY_ID");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cfg.company)) throw new Error("TRACCAR_TEST_COMPANY_ID doit être un UUID.");
  }
  return cfg;
}

function urlFor(base, endpoint, params = {}) {
  const url = new URL(`api/${endpoint}`, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url;
}

function traccarAuth(cfg) {
  return `Basic ${Buffer.from(`${cfg.user}:${cfg.password}`, "utf8").toString("base64")}`;
}

async function getJson(url, headers) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal, cache: "no-store", redirect: "error" });
    if (!response.ok) throw new Error(`HTTP ${response.status} sur ${new URL(url).pathname}`);
    return response.json();
  } finally { clearTimeout(timeout); }
}

async function traccarGet(cfg, endpoint, params = {}) {
  return getJson(urlFor(cfg.base, endpoint, params), { Authorization: traccarAuth(cfg), Accept: "application/json" });
}

async function supabase(cfg, table, params, method = "GET", body) {
  const url = new URL(`rest/v1/${table}`, cfg.supabase);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      method,
      headers: {
        apikey: cfg.secret,
        Authorization: `Bearer ${cfg.secret}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status} sur ${table}`);
    if (response.status === 204 || response.headers.get("content-length") === "0") return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } finally { clearTimeout(timeout); }
}

async function loadDevices(cfg) {
  const rows = await supabase(cfg, "devices", {
    select: "id,company_id,vehicle_id,imei",
    company_id: `eq.${cfg.company}`,
    imei: `in.(${cfg.imeis.join(",")})`,
  });
  const byImei = new Map((rows ?? []).map((row) => [row.imei, row]));
  if (cfg.imeis.some((imei) => !byImei.has(imei))) throw new Error("Les deux IMEI doivent être inscrits dans l’entreprise de test et rattachés à un véhicule.");
  if ([...byImei.values()].some((device) => device.company_id !== cfg.company || !device.vehicle_id)) throw new Error("Un appareil est hors du tenant de test ou sans véhicule.");
  return byImei;
}

function mask(imei) { return `…${imei.slice(-4)}`; }

async function writePosition(cfg, device, row) {
  const existing = await supabase(cfg, "positions", {
    select: "id",
    device_id: `eq.${device.id}`,
    recorded_at: `eq.${row.recorded_at}`,
    latitude: `eq.${row.latitude}`,
    longitude: `eq.${row.longitude}`,
    limit: "1",
  });
  if (existing?.length) return false;
  await supabase(cfg, "positions", {}, "POST", [{
    company_id: device.company_id,
    vehicle_id: device.vehicle_id,
    device_id: device.id,
    ...row,
  }]);
  return true;
}

async function poll(cfg, traccarDevices, dbDevices, cursors) {
  const now = Date.now();
  let seen = 0, inserted = 0, duplicate = 0, skipped = 0;
  for (const imei of cfg.imeis) {
    const tracker = traccarDevices.get(imei);
    const fromMs = cursors.get(imei) ?? now - cfg.lookback * 60_000;
    const positions = await traccarGet(cfg, "positions", {
      deviceId: tracker.id,
      from: new Date(Math.max(0, fromMs - OVERLAP_MS)).toISOString(),
      to: new Date(now).toISOString(),
    });
    seen += positions.length;
    let newest = fromMs;
    positions.sort((a, b) => Date.parse(a.fixTime ?? a.deviceTime ?? a.serverTime) - Date.parse(b.fixTime ?? b.deviceTime ?? b.serverTime));
    for (const position of positions) {
      const normalized = normalizePosition(position);
      if (!normalized.ok) { skipped += 1; if (Number.isFinite(normalized.ms)) newest = Math.max(newest, normalized.ms); continue; }
      newest = Math.max(newest, normalized.ms);
      if (cfg.write) {
        if (await writePosition(cfg, dbDevices.get(imei), normalized.row)) inserted += 1;
        else duplicate += 1;
      }
    }
    if (positions.length) cursors.set(imei, newest);
    if (cfg.write) {
      const device = dbDevices.get(imei);
      const lastUpdate = Date.parse(tracker.lastUpdate ?? "");
      if (Number.isFinite(lastUpdate)) {
        const online = tracker.status === "online" && Date.now() - lastUpdate < 120_000;
        await supabase(cfg, "devices", { id: `eq.${device.id}`, company_id: `eq.${cfg.company}` }, "PATCH", {
          status: online ? "online" : "offline",
          last_seen_at: new Date(lastUpdate).toISOString(),
        });
      }
    }
  }
  console.log(JSON.stringify({ event: "traccar-bridge-poll", mode: cfg.write ? "test-write" : "dry-run", devices: cfg.imeis.map(mask), positionsReturned: seen, inserted, duplicate, skipped }));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function run(args = process.argv.slice(2)) {
  loadLocalEnv();
  const cfg = configFrom(args);
  const visible = await traccarGet(cfg, "devices");
  const traccarDevices = new Map((visible ?? []).filter((device) => cfg.imeis.includes(String(device.uniqueId))).map((device) => [String(device.uniqueId), device]));
  if (cfg.imeis.some((imei) => !traccarDevices.has(imei))) throw new Error("Un des deux IMEI autorisés n’est pas visible dans le compte Traccar.");
  const dbDevices = cfg.write ? await loadDevices(cfg) : new Map();
  console.log(JSON.stringify({ event: "traccar-bridge-start", mode: cfg.write ? "test-write" : "dry-run", devices: cfg.imeis.map(mask), traccarHost: cfg.base.origin, pollMs: cfg.pollMs }));
  const cursors = new Map();
  let running = true;
  const stop = () => { running = false; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  do {
    await poll(cfg, traccarDevices, dbDevices, cursors);
    if (cfg.once) break;
    await wait(cfg.pollMs);
  } while (running);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(SCRIPT).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : "Erreur du bridge Traccar.");
    process.exitCode = 1;
  });
}
