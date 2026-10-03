BEGIN READ ONLY;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF session_user<>'supabase_admin' OR current_database()<>'postgres'
 OR inet_server_addr() IS NOT NULL OR to_regnamespace('matelematics_rls_lab') IS NULL
 THEN RAISE EXCEPTION 'Expected recovery lab'; END IF;
END $guard$;

SELECT count(*) AS teltonika_rows,
 count(*) FILTER (WHERE device_id IS NULL) AS missing_device,
 count(*) FILTER (WHERE NOT COALESCE(metadata ? 'ingest_fingerprint',false)) AS fingerprint_key_absent,
 count(*) FILTER (WHERE metadata ? 'ingest_fingerprint' AND
   COALESCE(metadata->>'ingest_fingerprint','') !~ '^[0-9a-f]{64}$') AS invalid_fingerprint,
 count(*) FILTER (WHERE metadata->>'ingest_fingerprint' ~ '^[0-9a-f]{64}$'
   AND device_id IS NOT NULL AND metadata->>'atomic_ingest_version'='native-v1') AS native_marked_rows,
 count(*) FILTER (WHERE metadata->>'ingest_fingerprint' ~ '^[0-9a-f]{64}$'
   AND device_id IS NOT NULL AND (metadata->>'atomic_ingest_version') IS DISTINCT FROM 'native-v1') AS legacy_fingerprinted_rows
FROM public.telemetry WHERE source='teltonika';

WITH duplicates AS (
 SELECT count(*) AS row_count
 FROM public.telemetry
 WHERE source='teltonika' AND device_id IS NOT NULL AND metadata ? 'ingest_fingerprint'
 GROUP BY company_id,device_id,(metadata->>'ingest_fingerprint')
 HAVING count(*)>1
)
SELECT count(*) AS duplicate_groups,
 COALESCE(sum(row_count),0) AS rows_in_duplicate_groups,
 COALESCE(sum(row_count-1),0) AS excess_rows
FROM duplicates;
ROLLBACK;
