-- Execute only in the recovery lab via docker exec, not remote Supabase.
BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename IN ('positions','telemetry','profiles')
ORDER BY tablename,indexname;

SELECT p.oid::regprocedure AS function_name,p.provolatile,
       p.prosecdef,p.proconfig
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
  AND p.proname IN ('can_access_company','current_user_role','current_user_company_id','is_matelematics_admin')
ORDER BY p.proname;

DO $diagnostic$
DECLARE
    v_user uuid;
    v_company uuid;
    v_foreign_company uuid;
    v_foreign_id bigint;
    v_table text;
    v_plan record;
BEGIN
    IF current_database()<>'postgres' OR session_user<>'supabase_admin' OR inet_server_addr() IS NOT NULL THEN
        RAISE EXCEPTION 'Expected local recovery database socket connection';
    END IF;

    SELECT p.id,p.company_id INTO STRICT v_user,v_company
    FROM public.profiles p JOIN auth.users u ON u.id=p.id
    WHERE u.email='user.crud.test@matelematics.local' AND p.role='user';

    FOREACH v_table IN ARRAY ARRAY['positions','telemetry'] LOOP
        -- Pick one known foreign row before switching to authenticated.
        EXECUTE format(
            'SELECT id,company_id FROM public.%I WHERE company_id IS DISTINCT FROM $1 AND company_id IS NOT NULL LIMIT 1',
            v_table
        ) INTO v_foreign_id,v_foreign_company USING v_company;
        IF v_foreign_id IS NULL THEN
            RAISE NOTICE 'NOT TESTED: % has no foreign fixture',v_table;
            CONTINUE;
        END IF;

        PERFORM set_config('request.jwt.claims',json_build_object('sub',v_user,'role','authenticated')::text,true);
        PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
        PERFORM set_config('request.jwt.claim.role','authenticated',true);
        EXECUTE 'SET LOCAL ROLE authenticated';

        RAISE NOTICE 'PLAN ONLY: % foreign company LIMIT 1, no broad execution',v_table;
        FOR v_plan IN EXECUTE format(
            'EXPLAIN (COSTS ON) SELECT id FROM public.%I WHERE company_id=%L::uuid LIMIT 1',
            v_table,v_foreign_company
        ) LOOP
            RAISE NOTICE '%',v_plan."QUERY PLAN";
        END LOOP;

        RAISE NOTICE 'MEASURED: % one foreign primary key under RLS',v_table;
        FOR v_plan IN EXECUTE format(
            'EXPLAIN (ANALYZE, BUFFERS, TIMING OFF) SELECT id FROM public.%I WHERE id=%L::bigint',
            v_table,v_foreign_id
        ) LOOP
            RAISE NOTICE '%',v_plan."QUERY PLAN";
        END LOOP;
        EXECUTE 'RESET ROLE';
    END LOOP;
END
$diagnostic$;
ROLLBACK;
