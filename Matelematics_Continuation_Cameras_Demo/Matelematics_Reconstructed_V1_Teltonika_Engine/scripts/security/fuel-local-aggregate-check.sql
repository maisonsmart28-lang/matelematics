BEGIN READ ONLY;
SET LOCAL statement_timeout = '20s';
DO $guard$
BEGIN
  IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
     OR inet_server_addr() IS NOT NULL THEN
    RAISE EXCEPTION 'Local restore database required';
  END IF;
  IF (SELECT count(*) FROM public.vehicles WHERE name = 'Camion J1939 Test') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one test truck';
  END IF;
END $guard$;

-- Fixed UTC range, independent of browser timezone and rolling windows.
WITH vehicle AS (
  SELECT id FROM public.vehicles WHERE name = 'Camion J1939 Test'
), normalized AS (
  SELECT t.recorded_at,
    CASE WHEN jsonb_typeof(t.can_payload->'fuel_level_percent') = 'number'
      THEN (t.can_payload->>'fuel_level_percent')::double precision END AS level,
    CASE WHEN jsonb_typeof(t.can_payload->'fuel_used_litres') = 'number'
      THEN (t.can_payload->>'fuel_used_litres')::double precision END AS fuel,
    CASE WHEN jsonb_typeof(t.can_payload->'odometer_km') = 'number'
      THEN (t.can_payload->>'odometer_km')::double precision END AS odo
  FROM public.telemetry t JOIN vehicle v ON v.id = t.vehicle_id
  WHERE t.recorded_at >= '2026-09-01 00:00:00+00'
    AND t.recorded_at <= '2026-10-01 00:00:00+00'
    AND t.can_payload IS NOT NULL
), usable AS (
  SELECT * FROM normalized WHERE level IS NOT NULL OR fuel IS NOT NULL OR odo IS NOT NULL
), deltas AS (
  SELECT *, lag(fuel) OVER (ORDER BY recorded_at) AS previous_fuel,
    lag(odo) OVER (ORDER BY recorded_at) AS previous_odo
  FROM usable
), expected AS (
  SELECT count(*) AS raw_count,
    coalesce(sum(CASE WHEN fuel >= previous_fuel THEN fuel - previous_fuel ELSE 0 END),0) AS litres,
    coalesce(sum(CASE WHEN odo >= previous_odo THEN odo - previous_odo ELSE 0 END),0) AS km,
    count(*) FILTER (WHERE fuel < previous_fuel OR odo < previous_odo) AS resets
  FROM deltas
), rpc AS (
  SELECT f.* FROM vehicle v CROSS JOIN LATERAL
    public.matelematics_vehicle_fuel_history(
      v.id, '2026-09-01 00:00:00+00', '2026-10-01 00:00:00+00',400
    ) f
), actual AS (
  SELECT count(*) AS returned_points, max(raw_count) AS raw_count,
    max(fuel_consumed_litres) AS litres, max(distance_km) AS km,
    max(reset_count) AS resets FROM rpc
)
SELECT e.raw_count AS source_usable_records,
  a.returned_points,
  round(e.litres::numeric,3) AS source_litres,
  round(a.litres::numeric,3) AS rpc_litres,
  round(e.km::numeric,3) AS source_km,
  round(a.km::numeric,3) AS rpc_km,
  e.resets AS source_resets, a.resets AS rpc_resets,
  (SELECT count(*) FROM (
     SELECT recorded_at FROM usable GROUP BY recorded_at HAVING count(*) > 1
   ) duplicated) AS duplicate_timestamp_groups,
  CASE WHEN e.raw_count = 0 THEN 'NOT TESTED: no usable data'
       WHEN a.returned_points <= 400 AND a.raw_count = e.raw_count
         AND abs(a.litres-e.litres) < 0.000001
         AND abs(a.km-e.km) < 0.000001 AND a.resets=e.resets
       THEN 'MATCH: aggregate comparison and strict cap'
       ELSE 'MISMATCH: inspect aggregates or equal timestamp ordering'
  END AS result
FROM expected e CROSS JOIN actual a;
ROLLBACK;
