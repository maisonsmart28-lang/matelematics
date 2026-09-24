const host = process.env.TRACCAR_SIM_HOST ?? "127.0.0.1";
const port = Number(process.env.TRACCAR_OSMAND_PORT ?? "5055");
const deviceId = process.env.TRACCAR_SIM_DEVICE_ID ?? "TEST-OSMAND-0001";
const lat = Number(process.env.TRACCAR_SIM_LAT ?? "33.5731");
const lon = Number(process.env.TRACCAR_SIM_LON ?? "-7.5898");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("TRACCAR_OSMAND_PORT must be a valid TCP port");
}
if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
  throw new Error("TRACCAR_SIM_LAT must be a valid latitude");
}
if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
  throw new Error("TRACCAR_SIM_LON must be a valid longitude");
}

const url = new URL(`http://${host}:${port}/`);
url.searchParams.set("id", deviceId);
url.searchParams.set("lat", String(lat));
url.searchParams.set("lon", String(lon));
url.searchParams.set("timestamp", new Date().toISOString());
url.searchParams.set("valid", "true");
url.searchParams.set("speed", "12");
url.searchParams.set("bearing", "90");
url.searchParams.set("altitude", "25");

const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
const body = await response.text();
console.log(JSON.stringify({
  event: "traccar-lab-osmand-simulator",
  status: response.status,
  deviceId,
  latitude: lat,
  longitude: lon,
  response: body.slice(0, 200),
}));

if (!response.ok) {
  process.exitCode = 1;
}
