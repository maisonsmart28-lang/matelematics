-- Local laboratory application only; never a production migration.
BEGIN;
SET LOCAL statement_timeout = '8s';
DO $guard$
BEGIN
 IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
    OR inet_server_addr() IS NOT NULL
    OR current_setting('application_name') <> 'matelematics-local-rls-experiment' THEN
   RAISE EXCEPTION 'Local experiment guard failed';
 END IF;
 IF to_regnamespace('matelematics_rls_lab') IS NOT NULL THEN
   RAISE EXCEPTION 'Experiment schema already exists';
 END IF;
END $guard$;
CREATE SCHEMA matelematics_rls_lab;
CREATE TABLE matelematics_rls_lab.original_policies AS
 SELECT schemaname,tablename,policyname,qual,with_check
 FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('positions','telemetry')
 AND policyname IN ('positions_select_scope','positions_admin_manage','telemetry_select_scope','telemetry_admin_manage');
REVOKE ALL ON TABLE matelematics_rls_lab.original_policies FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SCHEMA matelematics_rls_lab FROM PUBLIC;
GRANT USAGE ON SCHEMA matelematics_rls_lab TO authenticated;
CREATE FUNCTION matelematics_rls_lab.company_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
 SELECT coalesce(
   (SELECT CASE
      WHEN p.role IN ('user','client_admin') THEN ARRAY[p.company_id]
      WHEN p.role = 'partner_admin' THEN
        ARRAY(SELECT c.id FROM public.companies c WHERE c.partner_id = p.partner_id)
      ELSE ARRAY[]::uuid[]
    END FROM public.profiles p WHERE p.id = auth.uid()),
   ARRAY[]::uuid[]);
$function$;
REVOKE ALL ON FUNCTION matelematics_rls_lab.company_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION matelematics_rls_lab.company_ids() TO authenticated;

DO $equivalence$
DECLARE v_profile record; v_target uuid; v_old boolean; v_new boolean; v_cases integer:=0;
BEGIN
 FOR v_profile IN SELECT id,role FROM public.profiles LOOP
   PERFORM set_config('request.jwt.claims',
     jsonb_build_object('sub',v_profile.id,'role','authenticated')::text,true);
   FOR v_target IN
     SELECT id FROM public.companies
     UNION SELECT NULL::uuid
     UNION SELECT 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
   LOOP
     v_old := public.can_access_company(v_target) OR public.is_matelematics_admin();
     v_new := (v_target = ANY(matelematics_rls_lab.company_ids()))
              OR public.is_matelematics_admin();
     IF (v_old IS TRUE) IS DISTINCT FROM (v_new IS TRUE) THEN
       RAISE EXCEPTION 'Scope equivalence failed for role %',v_profile.role;
     END IF;
     v_cases:=v_cases+1;
   END LOOP;
   RAISE NOTICE 'Scope equivalence checked for existing role %',v_profile.role;
 END LOOP;
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 IF public.is_matelematics_admin() IS TRUE
    OR cardinality(matelematics_rls_lab.company_ids()) <> 0 THEN
   RAISE EXCEPTION 'Missing identity allowed';
 END IF;
 RAISE NOTICE 'PASS: % scope comparisons and missing identity denial; only existing profiles covered',v_cases;
END $equivalence$;

DO $policies$
DECLARE v_table text; v_policy text;
BEGIN
 FOREACH v_table IN ARRAY ARRAY['positions','telemetry'] LOOP
   v_policy:=v_table||'_select_scope';
   IF NOT EXISTS(SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=v_table
        AND policyname=v_policy AND cmd='SELECT'
        AND qual='can_access_company(company_id)') THEN
     RAISE EXCEPTION 'Unexpected SELECT policy for %',v_table;
   END IF;
   EXECUTE format('ALTER POLICY %I ON public.%I USING
      (company_id = ANY((SELECT matelematics_rls_lab.company_ids())::uuid[]))',
      v_policy,v_table);
   v_policy:=v_table||'_admin_manage';
   IF NOT EXISTS(SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=v_table
        AND policyname=v_policy AND cmd='ALL'
        AND qual='is_matelematics_admin()'
        AND with_check='is_matelematics_admin()') THEN
     RAISE EXCEPTION 'Unexpected admin policy for %',v_table;
   END IF;
   EXECUTE format('ALTER POLICY %I ON public.%I
     USING ((SELECT public.is_matelematics_admin()))
     WITH CHECK ((SELECT public.is_matelematics_admin()))',v_policy,v_table);
 END LOOP;
END $policies$;
COMMIT;
