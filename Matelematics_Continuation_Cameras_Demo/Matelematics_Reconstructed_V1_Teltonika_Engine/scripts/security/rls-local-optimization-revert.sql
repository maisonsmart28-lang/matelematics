BEGIN;
DO $guard$
BEGIN
 IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
    OR inet_server_addr() IS NOT NULL
    OR current_setting('application_name') <> 'matelematics-local-rls-experiment' THEN
   RAISE EXCEPTION 'Local guard failed';
 END IF;
 IF (SELECT count(*) FROM matelematics_rls_lab.original_policies) <> 4 THEN
   RAISE EXCEPTION 'Expected four original policies';
 END IF;
END $guard$;
DO $restore$
DECLARE r record;
BEGIN
 FOR r IN SELECT * FROM matelematics_rls_lab.original_policies LOOP
   EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)%s',
     r.policyname,r.schemaname,r.tablename,r.qual,
     CASE WHEN r.with_check IS NULL THEN '' ELSE format(' WITH CHECK (%s)',r.with_check) END);
 END LOOP;
END $restore$;
DROP FUNCTION matelematics_rls_lab.company_ids();
DROP TABLE matelematics_rls_lab.original_policies;
DROP SCHEMA matelematics_rls_lab;
COMMIT;
