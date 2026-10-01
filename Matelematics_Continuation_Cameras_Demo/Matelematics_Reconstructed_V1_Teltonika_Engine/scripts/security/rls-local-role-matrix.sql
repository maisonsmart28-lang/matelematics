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

DO $matrix$
DECLARE
 v_partners uuid[] := ARRAY[gen_random_uuid(),gen_random_uuid()];
 v_companies uuid[] := ARRAY[gen_random_uuid(),gen_random_uuid()];
 v_vehicles uuid[] := ARRAY[gen_random_uuid(),gen_random_uuid()];
 v_users uuid[] := ARRAY[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 v_roles text[] := ARRAY['user','user','client_admin','client_admin','partner_admin','partner_admin','matelematics_admin'];
 v_vehicle jsonb; v_position jsonb; v_telemetry jsonb;
 v_ids bigint[]; v_admin uuid; v_i integer; v_side integer; v_actor_side integer;
 v_table text; v_count integer; v_reads integer:=0; v_updates integer:=0;
BEGIN
 SELECT id INTO v_admin FROM public.profiles WHERE role='matelematics_admin' LIMIT 1;
 IF v_admin IS NULL THEN RAISE EXCEPTION 'Administrator fixture missing'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_admin,'role','authenticated')::text,true);
 SELECT to_jsonb(v) INTO v_vehicle FROM public.vehicles v LIMIT 1;
 SELECT to_jsonb(p) INTO v_position FROM public.positions p LIMIT 1;
 SELECT to_jsonb(t) INTO v_telemetry FROM public.telemetry t LIMIT 1;
 IF v_vehicle IS NULL OR v_position IS NULL OR v_telemetry IS NULL THEN
   RAISE EXCEPTION 'Source fixture rows missing';
 END IF;
 SELECT ARRAY[least(coalesce(min(id),0),0)-1,least(coalesce(min(id),0),0)-2] INTO v_ids FROM public.positions;
 -- Use identical negative keys in both tables, after checking for collisions.
 IF EXISTS(SELECT 1 FROM public.telemetry WHERE id=ANY(v_ids)) THEN
   RAISE EXCEPTION 'Fixture key collision';
 END IF;
 FOR v_side IN 1..2 LOOP
   INSERT INTO public.partners(id,name) VALUES(v_partners[v_side],'RLS LOCAL MATRIX');
   INSERT INTO public.companies(id,name,partner_id)
     VALUES(v_companies[v_side],'RLS LOCAL MATRIX',v_partners[v_side]);
   INSERT INTO public.vehicles
     SELECT (jsonb_populate_record(NULL::public.vehicles,v_vehicle ||
       jsonb_build_object('id',v_vehicles[v_side],'company_id',v_companies[v_side],
         'device_id',NULL,'name','RLS LOCAL MATRIX','registration',v_vehicles[v_side]::text))).*;
   INSERT INTO public.positions
     SELECT (jsonb_populate_record(NULL::public.positions,v_position ||
       jsonb_build_object('id',v_ids[v_side],'company_id',v_companies[v_side],
         'vehicle_id',v_vehicles[v_side],'device_id',NULL))).*;
   INSERT INTO public.telemetry
     SELECT (jsonb_populate_record(NULL::public.telemetry,v_telemetry ||
       jsonb_build_object('id',v_ids[v_side],'company_id',v_companies[v_side],
         'vehicle_id',v_vehicles[v_side],'device_id',NULL,'source','rls-local-matrix','metadata','{}'::jsonb))).*;
 END LOOP;
 FOR v_i IN 1..7 LOOP
   v_actor_side := CASE WHEN v_i % 2 = 0 THEN 2 ELSE 1 END;
   INSERT INTO auth.users(id,email,aud,role)
     VALUES(v_users[v_i],v_users[v_i]::text||'@audit.invalid','authenticated','authenticated');
   INSERT INTO public.profiles(id,full_name,role,company_id,partner_id)
     VALUES(v_users[v_i],'RLS LOCAL MATRIX',v_roles[v_i],
       CASE WHEN v_roles[v_i] IN ('user','client_admin') THEN v_companies[v_actor_side] END,
       CASE WHEN v_roles[v_i]='partner_admin' THEN v_partners[v_actor_side] END)
     ON CONFLICT(id) DO UPDATE SET role=EXCLUDED.role,company_id=EXCLUDED.company_id,
       partner_id=EXCLUDED.partner_id,full_name=EXCLUDED.full_name;
 END LOOP;
 FOR v_i IN 1..7 LOOP
   v_actor_side := CASE WHEN v_i % 2 = 0 THEN 2 ELSE 1 END;
   PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',v_users[v_i],'role','authenticated')::text,true);
   EXECUTE 'SET LOCAL ROLE authenticated';
   FOREACH v_table IN ARRAY ARRAY['positions','telemetry'] LOOP
     FOR v_side IN 1..2 LOOP
       EXECUTE format('SELECT count(*) FROM public.%I WHERE id=$1',v_table)
         INTO v_count USING v_ids[v_side];
       IF v_count <> CASE WHEN v_roles[v_i]='matelematics_admin' OR v_actor_side=v_side THEN 1 ELSE 0 END THEN
         RAISE EXCEPTION 'Read isolation failed role=% table=%',v_roles[v_i],v_table;
       END IF;
       v_reads:=v_reads+1;
       BEGIN
         EXECUTE format('UPDATE public.%I SET recorded_at=recorded_at WHERE id=$1',v_table) USING v_ids[v_side];
         RAISE EXCEPTION 'Expected UPDATE ACL denial for role=% table=%',v_roles[v_i],v_table;
       EXCEPTION WHEN insufficient_privilege THEN
         v_updates:=v_updates+1;
       END;
     END LOOP;
   END LOOP;
   EXECUTE 'RESET ROLE';
   RAISE NOTICE 'PASS: role %, side %, actual SELECT scope and UPDATE ACL denial',v_roles[v_i],v_actor_side;
 END LOOP;
 RAISE NOTICE 'PASS: % SELECT checks, % UPDATE ACL denials, two partners both directions; SQL role emulation, not Auth API',v_reads,v_updates;
END $matrix$;
ROLLBACK;
