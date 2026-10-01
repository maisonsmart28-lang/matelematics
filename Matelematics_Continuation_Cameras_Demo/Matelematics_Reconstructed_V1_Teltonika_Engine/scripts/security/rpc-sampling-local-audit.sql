-- Local recovery lab only. Simulation: all changes rolled back.
BEGIN;
SET LOCAL statement_timeout = '30s';
DO $guard$
BEGIN
  IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
     OR inet_server_addr() IS NOT NULL
     OR current_setting('application_name') <> 'matelematics-local-sampling-audit' THEN
    RAISE EXCEPTION 'Local sampling guard failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'Restored Auth data missing';
  END IF;
END $guard$;

CREATE TEMP TABLE sampling_telemetry (
  vehicle_id uuid, recorded_at timestamptz, can_payload jsonb
);
CREATE TEMP TABLE sampling_positions (
  id bigint, vehicle_id uuid, recorded_at timestamptz,
  latitude double precision, longitude double precision,
  speed double precision, heading double precision
);

DO $repair$
DECLARE
  v_def text;
  v_old text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef('public.matelematics_vehicle_fuel_history(uuid,timestamptz,timestamptz,integer)'::regprocedure);
  v_old := 'r.total_rows::numeric /' || chr(10) ||
           '                greatest(2, least(coalesce(p_max_points, 400), 1000))';
  v_new := '(r.total_rows - 1)::numeric /' || chr(10) ||
           '                (greatest(2, least(coalesce(p_max_points, 400), 1000)) - 1)';
  IF position(v_old in v_def) = 0 THEN RAISE EXCEPTION 'Unexpected fuel function: stop'; END IF;
  v_def := replace(v_def, v_old, v_new);
  EXECUTE v_def;
  EXECUTE replace(replace(v_def,
    'public.matelematics_vehicle_fuel_history(', 'pg_temp.audit_fuel('),
    'from public.telemetry t', 'from pg_temp.sampling_telemetry t');

  v_def := pg_get_functiondef('public.matelematics_vehicle_trip_points(uuid,timestamptz,timestamptz,integer)'::regprocedure);
  v_old := 'ceil(o.total_count::numeric / greatest(1, least(coalesce(p_max_points, 1000), 2000)))';
  v_new := 'ceil((o.total_count - 1)::numeric / (greatest(2, least(coalesce(p_max_points, 1000), 2000)) - 1))';
  IF position(v_old in v_def) = 0 THEN RAISE EXCEPTION 'Unexpected trip points function: stop'; END IF;
  v_def := replace(v_def, v_old, v_new);
  EXECUTE v_def;
  EXECUTE replace(replace(v_def,
    'public.matelematics_vehicle_trip_points(', 'pg_temp.audit_points('),
    'from public.positions p', 'from pg_temp.sampling_positions p');
END $repair$;

DO $test$
DECLARE
  v_n integer;
  v_cap integer;
  v_count bigint;
  v_first timestamptz;
  v_last timestamptz;
  v_raw bigint;
  v_cases integer := 0;
  v_id uuid := '99999999-0000-0000-0000-000000000001';
  v_start timestamptz := '2026-09-24 00:00:00+00';
BEGIN
  FOREACH v_n IN ARRAY ARRAY[0,1,2,3,399,400,401,999,1000,1001,2001] LOOP
    TRUNCATE pg_temp.sampling_telemetry, pg_temp.sampling_positions;
    INSERT INTO pg_temp.sampling_telemetry
      SELECT v_id, v_start + i * interval '1 second',
        jsonb_build_object('fuel_used_litres', i, 'odometer_km', i * 2)
      FROM generate_series(1,v_n) i;
    INSERT INTO pg_temp.sampling_positions
      SELECT i, v_id, v_start + i * interval '1 second', 33.0, -7.0, 30.0, 0.0
      FROM generate_series(1,v_n) i;
    FOREACH v_cap IN ARRAY ARRAY[2,3,400,1000] LOOP
      SELECT count(*), min(recorded_at), max(recorded_at), max(raw_count)
      INTO v_count, v_first, v_last, v_raw
      FROM pg_temp.audit_fuel(v_id, v_start, v_start + interval '1 day', v_cap);
      IF v_count > least(v_cap,1000)
         OR (v_n > 0 AND (v_first <> v_start + interval '1 second'
           OR v_last <> v_start + v_n * interval '1 second' OR v_raw <> v_n))
         OR (v_n = 0 AND v_count <> 0) THEN
        RAISE EXCEPTION 'Fuel sampling failed n=% cap=%', v_n,v_cap;
      END IF;
      SELECT count(*), min(recorded_at), max(recorded_at), max(raw_point_count)
      INTO v_count, v_first, v_last, v_raw
      FROM pg_temp.audit_points(v_id, v_start, v_start + interval '1 day', v_cap);
      IF v_count > v_cap
         OR (v_n > 0 AND (v_first <> v_start + interval '1 second'
           OR v_last <> v_start + v_n * interval '1 second' OR v_raw <> v_n))
         OR (v_n = 0 AND v_count <> 0) THEN
        RAISE EXCEPTION 'Trip sampling failed n=% cap=%', v_n,v_cap;
      END IF;
      v_cases := v_cases + 2;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'PASS: % synthetic RPC cases; strict caps, endpoints and raw counts', v_cases;
END $test$;
ROLLBACK;
