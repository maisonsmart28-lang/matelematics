-- ROLLBACK-only experiment; never a production migration.
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
DO $measure$
DECLARE
  v_user uuid;
  v_company uuid;
  v_other_user uuid;
  v_vehicle uuid;
  v_line text;
  v_query text;
BEGIN
  SELECT p.id,p.company_id INTO v_user,v_company
  FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE u.email='user.test@matelematics.local' AND p.role='user';
  IF v_user IS NULL OR v_company IS NULL THEN
    RAISE EXCEPTION 'Account A fixture missing';
  END IF;
  SELECT id INTO v_other_user FROM public.profiles
  WHERE role='user' AND company_id IS DISTINCT FROM v_company
    AND company_id IS NOT NULL LIMIT 1;
  IF v_other_user IS NULL THEN RAISE EXCEPTION 'Other company user missing'; END IF;
  SELECT vehicle_id INTO v_vehicle FROM public.positions
  WHERE company_id=v_company LIMIT 1;
  IF v_vehicle IS NULL THEN
    RAISE NOTICE 'NOT TESTED: positions has no own data'; RETURN;
  END IF;
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_query := format(
    'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT id,recorded_at FROM public.positions WHERE company_id=%L::uuid AND vehicle_id=%L::uuid ORDER BY recorded_at DESC LIMIT 100', v_company,v_vehicle);
  RAISE NOTICE 'MEASURED positions: own company/vehicle latest 100';
  BEGIN
    FOR v_line IN EXECUTE v_query LOOP RAISE NOTICE '%',v_line; END LOOP;
  EXCEPTION WHEN query_canceled THEN
    RAISE NOTICE 'TIMEOUT: positions own latest 100 exceeded 8 seconds; performance remains unresolved';
  END;
  EXECUTE 'RESET ROLE';
END $measure$;

DO $measure$
DECLARE
  v_user uuid;
  v_company uuid;
  v_other_user uuid;
  v_vehicle uuid;
  v_line text;
  v_query text;
BEGIN
  SELECT p.id,p.company_id INTO v_user,v_company
  FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE u.email='user.test@matelematics.local' AND p.role='user';
  IF v_user IS NULL OR v_company IS NULL THEN
    RAISE EXCEPTION 'Account A fixture missing';
  END IF;
  SELECT id INTO v_other_user FROM public.profiles
  WHERE role='user' AND company_id IS DISTINCT FROM v_company
    AND company_id IS NOT NULL LIMIT 1;
  IF v_other_user IS NULL THEN RAISE EXCEPTION 'Other company user missing'; END IF;
  SELECT vehicle_id INTO v_vehicle FROM public.positions
  WHERE company_id=v_company LIMIT 1;
  IF v_vehicle IS NULL THEN
    RAISE NOTICE 'NOT TESTED: positions has no own data'; RETURN;
  END IF;
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_other_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_query := format(
    'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT id FROM public.positions WHERE company_id=%L::uuid LIMIT 1', v_company);
  RAISE NOTICE 'MEASURED positions: foreign company LIMIT 1';
  BEGIN
    FOR v_line IN EXECUTE v_query LOOP RAISE NOTICE '%',v_line; END LOOP;
  EXCEPTION WHEN query_canceled THEN
    RAISE NOTICE 'TIMEOUT: positions foreign LIMIT 1 exceeded 8 seconds; performance remains unresolved';
  END;
  EXECUTE 'RESET ROLE';
END $measure$;

DO $measure$
DECLARE
  v_user uuid;
  v_company uuid;
  v_other_user uuid;
  v_vehicle uuid;
  v_line text;
  v_query text;
BEGIN
  SELECT p.id,p.company_id INTO v_user,v_company
  FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE u.email='user.test@matelematics.local' AND p.role='user';
  IF v_user IS NULL OR v_company IS NULL THEN
    RAISE EXCEPTION 'Account A fixture missing';
  END IF;
  SELECT id INTO v_other_user FROM public.profiles
  WHERE role='user' AND company_id IS DISTINCT FROM v_company
    AND company_id IS NOT NULL LIMIT 1;
  IF v_other_user IS NULL THEN RAISE EXCEPTION 'Other company user missing'; END IF;
  SELECT vehicle_id INTO v_vehicle FROM public.telemetry
  WHERE company_id=v_company LIMIT 1;
  IF v_vehicle IS NULL THEN
    RAISE NOTICE 'NOT TESTED: telemetry has no own data'; RETURN;
  END IF;
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_query := format(
    'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT id,recorded_at FROM public.telemetry WHERE company_id=%L::uuid AND vehicle_id=%L::uuid ORDER BY recorded_at DESC LIMIT 100', v_company,v_vehicle);
  RAISE NOTICE 'MEASURED telemetry: own company/vehicle latest 100';
  BEGIN
    FOR v_line IN EXECUTE v_query LOOP RAISE NOTICE '%',v_line; END LOOP;
  EXCEPTION WHEN query_canceled THEN
    RAISE NOTICE 'TIMEOUT: telemetry own latest 100 exceeded 8 seconds; performance remains unresolved';
  END;
  EXECUTE 'RESET ROLE';
END $measure$;

DO $measure$
DECLARE
  v_user uuid;
  v_company uuid;
  v_other_user uuid;
  v_vehicle uuid;
  v_line text;
  v_query text;
BEGIN
  SELECT p.id,p.company_id INTO v_user,v_company
  FROM public.profiles p JOIN auth.users u ON u.id=p.id
  WHERE u.email='user.test@matelematics.local' AND p.role='user';
  IF v_user IS NULL OR v_company IS NULL THEN
    RAISE EXCEPTION 'Account A fixture missing';
  END IF;
  SELECT id INTO v_other_user FROM public.profiles
  WHERE role='user' AND company_id IS DISTINCT FROM v_company
    AND company_id IS NOT NULL LIMIT 1;
  IF v_other_user IS NULL THEN RAISE EXCEPTION 'Other company user missing'; END IF;
  SELECT vehicle_id INTO v_vehicle FROM public.telemetry
  WHERE company_id=v_company LIMIT 1;
  IF v_vehicle IS NULL THEN
    RAISE NOTICE 'NOT TESTED: telemetry has no own data'; RETURN;
  END IF;
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_other_user,'role','authenticated')::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  v_query := format(
    'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT id FROM public.telemetry WHERE company_id=%L::uuid LIMIT 1', v_company);
  RAISE NOTICE 'MEASURED telemetry: foreign company LIMIT 1';
  BEGIN
    FOR v_line IN EXECUTE v_query LOOP RAISE NOTICE '%',v_line; END LOOP;
  EXCEPTION WHEN query_canceled THEN
    RAISE NOTICE 'TIMEOUT: telemetry foreign LIMIT 1 exceeded 8 seconds; performance remains unresolved';
  END;
  EXECUTE 'RESET ROLE';
END $measure$;
ROLLBACK;
