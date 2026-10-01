-- Snapshot-specific LOCAL repair. Runner adds COMMIT or ROLLBACK.
BEGIN;
SET LOCAL statement_timeout = '45s';
SET LOCAL lock_timeout = '5s';
DO $guard$
BEGIN
  IF current_database() <> 'postgres' OR session_user <> 'supabase_admin'
     OR inet_server_addr() IS NOT NULL
     OR current_setting('application_name') <> 'matelematics-local-restore-repair' THEN
    RAISE EXCEPTION 'Local socket laboratory guard failed';
  END IF;
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'Local supabase_admin must be superuser';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Unsafe API role configuration';
  END IF;
  IF (SELECT count(*) FROM auth.users) <> 5 THEN
    RAISE EXCEPTION 'Expected five restored Auth accounts';
  END IF;
END
$guard$;

-- An exact inventory prevents granting access to unexpected new objects.
CREATE TEMP TABLE repair_tables(name text PRIMARY KEY, writable boolean NOT NULL) ON COMMIT DROP;
INSERT INTO repair_tables VALUES
('alert_settings',false),('alerts',false),('camera_events',false),('cameras',false),
('companies',false),('devices',false),('drivers',true),('notification_rules',true),
('notifications',true),('partners',false),('positions',false),('profiles',false),
('telemetry',false),('trips',false),('vehicle_compliance_documents',true),
('vehicle_driver_assignments',true),('vehicle_maintenance_records',true),
('vehicles',false),('video_clips',false);

CREATE TEMP TABLE repair_functions(name text PRIMARY KEY, definer boolean NOT NULL, api_execute boolean NOT NULL) ON COMMIT DROP;
INSERT INTO repair_functions VALUES
('can_access_company',true,true),('can_manage_company',true,true),
('current_user_company_id',true,true),('current_user_partner_id',true,true),
('current_user_role',true,true),('is_client_admin',true,true),
('is_matelematics_admin',true,true),('is_partner_admin',true,true),
('mark_notification_read',true,true),('enforce_vehicle_company_integrity',true,false),
('protect_company_security_fields',true,false),('protect_profile_security_fields',true,false),
('serialize_active_vehicle_alert_insert',true,false),('set_updated_at',true,false),
('persist_gt06_test_packet',true,false),
('archive_driver',false,true),('cancel_vehicle_compliance_document',false,true),
('cancel_vehicle_maintenance_record',false,true),('clear_vehicle_compliance_document_storage_path',false,true),
('complete_vehicle_maintenance_record',false,true),('create_driver_with_assignment',false,true),
('create_vehicle_compliance_document',false,true),('create_vehicle_maintenance_record',false,true),
('renew_vehicle_compliance_document',false,true),('set_vehicle_compliance_document_storage_path',false,true),
('start_vehicle_maintenance_record',false,true),('unassign_driver',false,true),
('update_driver_with_assignment',false,true),('consume_demo_rate_limit',false,false),
('generate_maintenance_compliance_notifications',false,false),('matelematics_vehicle_fuel_history',false,false),
('matelematics_vehicle_trip_points',false,false),('matelematics_vehicle_trip_summaries',false,false),
('set_alert_settings_updated_at',false,false);

DO $repair$
DECLARE r record;
BEGIN
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p')) <> 19
     OR EXISTS (SELECT 1 FROM repair_tables x LEFT JOIN pg_class c
                ON c.relnamespace='public'::regnamespace AND c.relname=x.name
                WHERE c.oid IS NULL OR c.relkind NOT IN ('r','p') OR NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'Public table inventory/RLS mismatch';
  END IF;
  IF (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace) <> 34
     OR EXISTS (SELECT 1 FROM repair_functions x WHERE
       (SELECT count(*) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
        AND p.proname=x.name AND p.prosecdef=x.definer AND p.prokind='f') <> 1) THEN
    RAISE EXCEPTION 'Public function inventory mismatch or overload; review signatures';
  END IF;
  FOR r IN SELECT * FROM repair_tables LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated',r.name);
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated',r.name);
    IF r.writable THEN
      EXECUTE format('GRANT INSERT, UPDATE ON TABLE public.%I TO authenticated',r.name);
    END IF;
  END LOOP;
  FOR r IN SELECT p.oid::regprocedure AS signature,x.* FROM repair_functions x
    JOIN pg_proc p ON p.pronamespace='public'::regnamespace AND p.proname=x.name LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',r.signature);
    IF r.api_execute THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',r.signature); END IF;
    IF r.definer THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',r.signature); END IF;
  END LOOP;

  GRANT USAGE, CREATE ON SCHEMA auth TO supabase_auth_admin;
  FOR r IN SELECT c.relname,c.relkind FROM pg_class c WHERE c.relnamespace='auth'::regnamespace
    AND c.relkind IN ('r','p','S','v','m') ORDER BY (c.relkind='S'),c.relname LOOP
    EXECUTE format('ALTER %s auth.%I OWNER TO supabase_auth_admin',
      CASE r.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' ELSE 'TABLE' END,r.relname);
  END LOOP;
  FOR r IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='auth'::regnamespace LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO supabase_auth_admin',r.signature);
  END LOOP;
  FOR r IN SELECT typname FROM pg_type WHERE typnamespace='auth'::regnamespace AND typtype='e' LOOP
    EXECUTE format('ALTER TYPE auth.%I OWNER TO supabase_auth_admin',r.typname);
  END LOOP;
  FOR r IN SELECT jobid FROM cron.job WHERE active LOOP
    PERFORM cron.alter_job(r.jobid,active:=false);
  END LOOP;

  FOR r IN SELECT * FROM repair_tables LOOP
    IF has_table_privilege('anon',format('public.%I',r.name),'SELECT')
       OR has_table_privilege('anon',format('public.%I',r.name),'INSERT')
       OR has_table_privilege('anon',format('public.%I',r.name),'UPDATE')
       OR has_table_privilege('anon',format('public.%I',r.name),'DELETE')
       OR NOT has_table_privilege('authenticated',format('public.%I',r.name),'SELECT')
       OR has_table_privilege('authenticated',format('public.%I',r.name),'INSERT') <> r.writable
       OR has_table_privilege('authenticated',format('public.%I',r.name),'UPDATE') <> r.writable
       OR has_table_privilege('authenticated',format('public.%I',r.name),'DELETE') THEN
      RAISE EXCEPTION 'Effective table privileges mismatch: %',r.name;
    END IF;
  END LOOP;
  FOR r IN SELECT p.oid,x.* FROM repair_functions x JOIN pg_proc p
    ON p.pronamespace='public'::regnamespace AND p.proname=x.name LOOP
    IF has_function_privilege('anon',r.oid,'EXECUTE')
       OR has_function_privilege('authenticated',r.oid,'EXECUTE') <> r.api_execute
       OR (r.definer AND NOT has_function_privilege('service_role',r.oid,'EXECUTE')) THEN
      RAISE EXCEPTION 'Effective function privileges mismatch: %',r.name;
    END IF;
  END LOOP;
  IF NOT has_schema_privilege('supabase_auth_admin','auth','USAGE')
     OR NOT has_schema_privilege('supabase_auth_admin','auth','CREATE')
     OR EXISTS (SELECT 1 FROM pg_class WHERE relnamespace='auth'::regnamespace
                AND relkind IN ('r','p','S','v','m') AND relowner<>'supabase_auth_admin'::regrole)
     OR EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='auth'::regnamespace AND proowner<>'supabase_auth_admin'::regrole)
     OR EXISTS (SELECT 1 FROM pg_type WHERE typnamespace='auth'::regnamespace AND typtype='e' AND typowner<>'supabase_auth_admin'::regrole)
     OR EXISTS (SELECT 1 FROM cron.job WHERE active) THEN
    RAISE EXCEPTION 'Auth ownership or cron assertion failed';
  END IF;
END
$repair$;
SELECT 'PASS: ACL 19 tables / 34 functions; Auth ownership; cron inactive' AS result;
-- COMMIT/ROLLBACK is supplied exclusively by the guarded Node runner.
