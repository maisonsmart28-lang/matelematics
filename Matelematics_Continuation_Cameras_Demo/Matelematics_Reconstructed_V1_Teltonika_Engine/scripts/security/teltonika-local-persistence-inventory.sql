-- Metadata and aggregate counts only, on the fixed local restore laboratory.
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
DO $guard$ BEGIN
 IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
 OR inet_server_addr() IS NOT NULL
 OR current_setting('application_name') <> 'matelematics-local-persistence-audit'
 THEN RAISE EXCEPTION 'Local guard failed'; END IF;
END $guard$;
SELECT table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns WHERE table_schema='public'
AND table_name IN ('positions','telemetry','devices','alerts')
ORDER BY table_name,ordinal_position;
SELECT c.relname AS table_name,k.conname,k.contype,pg_get_constraintdef(k.oid) AS definition
FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('positions','telemetry','devices','alerts')
ORDER BY c.relname,k.conname;
SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('positions','telemetry','devices','alerts')
ORDER BY tablename,indexname;
SELECT c.relname AS table_name,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('positions','telemetry','devices','alerts') AND NOT t.tgisinternal
ORDER BY c.relname,t.tgname;
SELECT count(*) AS teltonika_rows,
 count(*) FILTER(WHERE metadata ? 'ingest_fingerprint') AS rows_with_fingerprint,
 count(*) FILTER(WHERE NOT(metadata ? 'ingest_fingerprint')) AS rows_without_fingerprint
FROM public.telemetry WHERE source='teltonika';
SELECT count(*) AS repeated_fingerprint_groups,
 coalesce(sum(n-1),0) AS excess_rows
FROM (
 SELECT count(*) AS n FROM public.telemetry
 WHERE source='teltonika' AND metadata ? 'ingest_fingerprint'
 GROUP BY company_id,device_id,(metadata->>'ingest_fingerprint')
 HAVING count(*)>1
) grouped;
ROLLBACK;
