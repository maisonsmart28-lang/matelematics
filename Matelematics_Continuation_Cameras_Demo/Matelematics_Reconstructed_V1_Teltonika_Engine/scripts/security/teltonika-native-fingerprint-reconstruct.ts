import pg from "pg";
import { normalizeMessage } from "../../server/teltonika/normalize";
import { buildTelemetryIngestFingerprint } from "../../server/teltonika/telemetry-quality";
import type { TeltonikaMessage, TeltonikaRecord } from "../../server/teltonika/types";

async function main() {
const client = new pg.Client({
  host:"127.0.0.1", port:55322, database:"postgres", user:"supabase_admin",
  password:process.env.MATELEMATICS_LOCAL_DB_PASSWORD ?? "postgres",
  connectionTimeoutMillis:5000, application_name:"legacy-fingerprint-readonly",
});
const counts = { total:0, knownMatched:0, knownMismatch:0, knownUnrecoverable:0,
  missingReconstructable:0, missingUnrecoverable:0, invalidStoredFingerprint:0 };
let transaction=false;
try {
  await client.connect();
  await client.query("BEGIN READ ONLY"); transaction=true;
  await client.query("SET LOCAL statement_timeout='20s'");
  const guard=await client.query("SELECT session_user AS actor,current_database() AS db,to_regnamespace('matelematics_rls_lab') IS NOT NULL AS lab");
  if(guard.rows[0].actor!=="supabase_admin" || guard.rows[0].db!=="postgres" || !guard.rows[0].lab)
    throw Error("EXPECTED_FIXED_RECOVERY_LAB");
  await client.query("DECLARE historical_rows NO SCROLL CURSOR FOR SELECT codec,raw_payload,metadata FROM public.telemetry WHERE source='teltonika' ORDER BY id");
  while(true) {
    const batch=await client.query("FETCH FORWARD 500 FROM historical_rows");
    if(!batch.rows.length) break;
    for(const row of batch.rows) {
      counts.total++;
      const metadata=row.metadata ?? {};
      const stored=metadata.ingest_fingerprint;
      const known=typeof stored==="string" && /^[0-9a-f]{64}$/.test(stored);
      if(Object.prototype.hasOwnProperty.call(metadata,"ingest_fingerprint") && !known)
        counts.invalidStoredFingerprint++;
      try {
        // String payload preserves JSON object insertion order required by the existing fingerprint.
        // Do not reconstruct raw from jsonb, positions or the current device assignment.
        if(typeof row.raw_payload!=="string" || typeof metadata.imei!=="string" ||
           !/^[0-9]{10,20}$/.test(metadata.imei)) throw Error("MISSING_ORIGINAL_INPUT");
        const raw=JSON.parse(row.raw_payload) as TeltonikaRecord;
        const codec=row.codec==="8" ? 8 : row.codec==="8E" ? 142 : null;
        if(codec===null || typeof raw.timestamp!=="string" || !Number.isFinite(Date.parse(raw.timestamp)) ||
           !raw.gps || !Array.isArray(raw.io) ||
           ![raw.priority,raw.eventId,raw.gps.latitude,raw.gps.longitude,raw.gps.altitude,
             raw.gps.angle,raw.gps.satellites,raw.gps.speedKph].every(Number.isFinite) ||
           !raw.io.every(item=>Number.isInteger(item.id) &&
             ((typeof item.value==="number" && Number.isFinite(item.value)) || typeof item.value==="string")))
          throw Error("INCOMPLETE_RAW_RECORD");
        const message={codec,records:[raw],rawLength:0,crcValid:true} as TeltonikaMessage;
        // No packet/CRC assertion: these fields are unused by normalization.
        const normalized=normalizeMessage(metadata.imei,message)[0];
        const computed=buildTelemetryIngestFingerprint(normalized);
        if(known) {
          if(computed===stored) counts.knownMatched++; else counts.knownMismatch++;
        } else counts.missingReconstructable++;
      } catch {
        if(known) counts.knownUnrecoverable++; else counts.missingUnrecoverable++;
      }
    }
  }
  await client.query("ROLLBACK"); transaction=false;
  console.log(JSON.stringify({event:"legacy-fingerprint-reconstruction",...counts}));
  if(counts.knownMismatch || counts.knownUnrecoverable)
    throw Error("KNOWN_FINGERPRINT_COMPARISON_INCOMPLETE_OR_MISMATCH");
  console.log("KNOWN FINGERPRINT COMPARISON PASS; missing candidates not backfilled; alerts not certified");
} catch {
  console.error("RECONSTRUCTION DIAGNOSTIC FAIL; counters above if available; raw records and credentials not logged");
  process.exitCode=1;
} finally {
  if(transaction) await client.query("ROLLBACK").catch(()=>{});
  await client.end().catch(()=>{});
}

}
void main().catch(() => {
  console.error("RECONSTRUCTION STARTUP FAIL; no credentials logged");
  process.exitCode = 1;
});
