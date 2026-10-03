BEGIN READ ONLY;
SET LOCAL statement_timeout='20s';
DO $guard$ BEGIN
 IF session_user<>'supabase_admin' OR current_database()<>'postgres'
 OR inet_server_addr() IS NOT NULL OR to_regnamespace('matelematics_rls_lab') IS NULL
 THEN RAISE EXCEPTION 'Expected recovery lab'; END IF;
END $guard$;
SELECT
 CASE WHEN metadata->>'ingest_fingerprint' ~ '^[0-9a-f]{64}$'
 THEN 'fingerprinted' ELSE 'without_valid_fingerprint' END AS category,
 count(*) AS rows,
 count(*) FILTER (WHERE jsonb_typeof(metadata->'telemetry_quality')='object') AS quality_object_present,
 count(*) FILTER (WHERE metadata#>>'{telemetry_quality,accepted}'='true') AS quality_accepted,
 count(*) FILTER (WHERE metadata#>>'{telemetry_quality,position_persisted}'='true') AS position_reported_persisted,
 count(*) FILTER (WHERE metadata#>>'{telemetry_quality,position_persisted}'='false') AS position_reported_skipped,
 count(*) FILTER (WHERE metadata#>>'{telemetry_quality,original_timestamp}' IS NOT NULL) AS original_timestamp_present,
 min(recorded_at) AS first_recorded_at,
 max(recorded_at) AS last_recorded_at
FROM public.telemetry WHERE source='teltonika'
GROUP BY 1 ORDER BY 1;
ROLLBACK;
