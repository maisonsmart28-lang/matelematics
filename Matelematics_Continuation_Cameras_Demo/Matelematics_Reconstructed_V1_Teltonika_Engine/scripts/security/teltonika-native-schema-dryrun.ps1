$ErrorActionPreference = "Stop"
$container = "supabase_db_recovery-20261001-175031"
$apply = Get-Content -Raw (Join-Path $PSScriptRoot "teltonika-native-schema-apply.sql")
$revert = Get-Content -Raw (Join-Path $PSScriptRoot "teltonika-native-schema-revert.sql")
$guard = @'
BEGIN;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF session_user<>'supabase_admin' OR current_database()<>'postgres' OR inet_server_addr() IS NOT NULL
 OR to_regnamespace('matelematics_rls_lab') IS NULL THEN RAISE EXCEPTION 'Expected recovery lab'; END IF;
END $guard$;
'@
$audit = @'

DO $check$ DECLARE r record; BEGIN
 SELECT * INTO r FROM pg_roles WHERE rolname='matelematics_ingest_native';
 IF r.rolsuper OR r.rolbypassrls OR r.rolcanlogin OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication THEN RAISE EXCEPTION 'Unsafe role attributes'; END IF;
 IF pg_has_role('authenticated','matelematics_ingest_native','MEMBER')
 OR pg_has_role('anon','matelematics_ingest_native','MEMBER') THEN RAISE EXCEPTION 'Public JWT membership'; END IF;
 IF NOT has_column_privilege('matelematics_ingest_native','public.telemetry','metadata','SELECT')
 OR NOT has_column_privilege('matelematics_ingest_native','public.positions','latitude','INSERT')
 OR NOT has_column_privilege('matelematics_ingest_native','public.alerts','status','UPDATE')
 OR NOT has_sequence_privilege('matelematics_ingest_native','public.telemetry_id_seq','USAGE') THEN RAISE EXCEPTION 'Required grant missing'; END IF;
 IF has_column_privilege('matelematics_ingest_native','public.devices','company_id','UPDATE')
 OR has_column_privilege('matelematics_ingest_native','public.vehicles','name','UPDATE')
 OR has_table_privilege('matelematics_ingest_native','public.profiles','SELECT')
 OR has_table_privilege('matelematics_ingest_native','public.alert_settings','INSERT')
 OR has_table_privilege('matelematics_ingest_native','public.telemetry','DELETE')
 OR has_table_privilege('matelematics_ingest_native','public.alerts','DELETE')
 OR has_schema_privilege('matelematics_ingest_native','public','CREATE') THEN RAISE EXCEPTION 'Unexpected effective privilege'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'native_ingest_%' AND roles=ARRAY['matelematics_ingest_native']::name[])<>11 THEN RAISE EXCEPTION 'Policy count mismatch'; END IF;
 RAISE NOTICE 'PASS: dedicated NOLOGIN role, no bypass, 11 policies, required grants and forbidden privileges';
END $check$;

'@
$after = @'
DO $check$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='matelematics_ingest_native')
 OR to_regclass('public.telemetry_teltonika_fingerprint_unique') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'native_ingest_%')
 THEN RAISE EXCEPTION 'Revert incomplete'; END IF;
 RAISE NOTICE 'PASS: role, policies and index reverted; no rows deleted';
END $check$;
ROLLBACK;
'@
$sql = $guard + "`n" + $apply + "`n" + $audit + "`n" + $revert + "`n" + $after
$sql | docker exec -i $container psql -X -U supabase_admin -d postgres -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Schema/role simulation failed; transaction rolled back" }
Write-Host "SCHEMA ET ROLE - ALLER-RETOUR ROLLBACK : PASS"
