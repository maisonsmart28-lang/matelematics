BEGIN READ ONLY;
SET LOCAL statement_timeout = '8s';
DO $guard$
BEGIN
  IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
     OR inet_server_addr() IS NOT NULL THEN
    RAISE EXCEPTION 'Local restored database required';
  END IF;
END $guard$;

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
