-- ============================================================
-- MATELEMATICS
-- 02_telematics_validation.sql
-- READ ONLY VALIDATION
--
-- NO CREATE
-- NO ALTER
-- NO DROP
-- NO INSERT
-- NO UPDATE
-- NO DELETE
-- ============================================================


-- ============================================================
-- 1) TABLES
-- ============================================================

SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'positions',
    'telemetry',
    'alerts',
    'trips'
  )
ORDER BY table_name;


-- ============================================================
-- 2) PRIMARY KEYS + UNIQUE + CHECK + FOREIGN KEYS
-- ============================================================

SELECT
  c.relname AS table_name,
  con.conname AS constraint_name,
  con.contype AS constraint_type_code,

  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
    ELSE con.contype::text
  END AS constraint_type,

  pg_get_constraintdef(con.oid) AS definition

FROM pg_constraint con

JOIN pg_class c
  ON c.oid = con.conrelid

JOIN pg_namespace n
  ON n.oid = c.relnamespace

WHERE n.nspname = 'public'

  AND c.relname IN (
    'positions',
    'telemetry',
    'alerts',
    'trips'
  )

  AND con.contype IN (
    'p',
    'u',
    'f',
    'c'
  )

ORDER BY
  c.relname,
  constraint_type,
  con.conname;


-- ============================================================
-- 3) INDEXES
-- ============================================================

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'positions',
    'telemetry',
    'alerts',
    'trips'
  )
ORDER BY tablename, indexname;


-- ============================================================
-- 4) SPECIFIC CHECK CONSTRAINTS
-- ============================================================

SELECT

  -- ----------------------------------------------------------
  -- POSITIONS
  -- ----------------------------------------------------------

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'positions'
      AND con.conname = 'positions_latitude_check'
      AND con.contype = 'c'
  ) AS positions_latitude_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'positions'
      AND con.conname = 'positions_longitude_check'
      AND con.contype = 'c'
  ) AS positions_longitude_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'positions'
      AND con.conname = 'positions_speed_check'
      AND con.contype = 'c'
  ) AS positions_speed_check_exists,


  -- ----------------------------------------------------------
  -- ALERTS
  -- ----------------------------------------------------------

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'alerts'
      AND con.conname = 'alerts_latitude_check'
      AND con.contype = 'c'
  ) AS alerts_latitude_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'alerts'
      AND con.conname = 'alerts_longitude_check'
      AND con.contype = 'c'
  ) AS alerts_longitude_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'alerts'
      AND con.conname = 'alerts_resolved_after_triggered_check'
      AND con.contype = 'c'
  ) AS alerts_resolved_after_triggered_check_exists,


  -- ----------------------------------------------------------
  -- TRIPS
  -- ----------------------------------------------------------

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_period_check'
      AND con.contype = 'c'
  ) AS trips_period_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_distance_check'
      AND con.contype = 'c'
  ) AS trips_distance_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_duration_check'
      AND con.contype = 'c'
  ) AS trips_duration_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_start_latitude_check'
      AND con.contype = 'c'
  ) AS trips_start_latitude_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_start_longitude_check'
      AND con.contype = 'c'
  ) AS trips_start_longitude_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_end_latitude_check'
      AND con.contype = 'c'
  ) AS trips_end_latitude_check_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_end_longitude_check'
      AND con.contype = 'c'
  ) AS trips_end_longitude_check_exists;


-- ============================================================
-- 5) SPECIFIC FOREIGN KEY CHECKS
-- ============================================================

SELECT

  -- ----------------------------------------------------------
  -- POSITIONS
  -- ----------------------------------------------------------

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'positions'
      AND con.conname = 'positions_company_id_fkey'
      AND con.contype = 'f'
  ) AS positions_company_id_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'positions'
      AND con.conname = 'positions_company_vehicle_fkey'
      AND con.contype = 'f'
  ) AS positions_company_vehicle_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'positions'
      AND con.conname = 'positions_company_device_fkey'
      AND con.contype = 'f'
  ) AS positions_company_device_fkey_exists,


  -- ----------------------------------------------------------
  -- TELEMETRY
  -- ----------------------------------------------------------

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'telemetry'
      AND con.conname = 'telemetry_company_id_fkey'
      AND con.contype = 'f'
  ) AS telemetry_company_id_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'telemetry'
      AND con.conname = 'telemetry_company_vehicle_fkey'
      AND con.contype = 'f'
  ) AS telemetry_company_vehicle_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'telemetry'
      AND con.conname = 'telemetry_company_device_fkey'
      AND con.contype = 'f'
  ) AS telemetry_company_device_fkey_exists,


  -- ----------------------------------------------------------
  -- ALERTS
  -- ----------------------------------------------------------

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'alerts'
      AND con.conname = 'alerts_company_id_fkey'
      AND con.contype = 'f'
  ) AS alerts_company_id_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'alerts'
      AND con.conname = 'alerts_company_vehicle_fkey'
      AND con.contype = 'f'
  ) AS alerts_company_vehicle_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'alerts'
      AND con.conname = 'alerts_company_device_fkey'
      AND con.contype = 'f'
  ) AS alerts_company_device_fkey_exists,


  -- ----------------------------------------------------------
  -- TRIPS
  -- ----------------------------------------------------------

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_company_id_fkey'
      AND con.contype = 'f'
  ) AS trips_company_id_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_company_vehicle_fkey'
      AND con.contype = 'f'
  ) AS trips_company_vehicle_fkey_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_company_driver_fkey'
      AND con.contype = 'f'
  ) AS trips_company_driver_fkey_exists;


-- ============================================================
-- 6) SPECIFIC UNIQUE CONSTRAINT CHECKS
-- ============================================================

SELECT

  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'positions'
      AND con.conname = 'positions_company_id_id_key'
      AND con.contype = 'u'
  ) AS positions_company_id_id_key_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'telemetry'
      AND con.conname = 'telemetry_company_id_id_key'
      AND con.contype = 'u'
  ) AS telemetry_company_id_id_key_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'alerts'
      AND con.conname = 'alerts_company_id_id_key'
      AND con.contype = 'u'
  ) AS alerts_company_id_id_key_exists,


  EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class c
      ON c.oid = con.conrelid
    JOIN pg_namespace n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'trips'
      AND con.conname = 'trips_company_id_id_key'
      AND con.contype = 'u'
  ) AS trips_company_id_id_key_exists;


-- ============================================================
-- 7) IDENTITY COLUMN CHECKS
-- ============================================================

SELECT
  table_name,
  column_name,
  data_type,
  is_identity,
  identity_generation
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'positions',
    'telemetry'
  )
  AND column_name = 'id'
ORDER BY table_name;


-- ============================================================
-- END OF VALIDATION
-- ============================================================