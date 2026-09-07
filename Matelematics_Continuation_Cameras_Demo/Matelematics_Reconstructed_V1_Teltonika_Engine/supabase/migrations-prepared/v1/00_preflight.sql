-- ============================================================
-- MATELEMATICS V1
-- 00_preflight.sql
-- Read-only validation of the REAL existing Supabase schema
--
-- SAFE: SELECT ONLY
-- NO CREATE / ALTER / DROP / INSERT / UPDATE / DELETE
-- ============================================================


-- ============================================================
-- 1. REQUIRED EXISTING TABLES
-- ============================================================

SELECT
  expected.table_name,
  EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = expected.table_name
  ) AS exists
FROM (
  VALUES
    ('companies'),
    ('profiles'),
    ('vehicles')
) AS expected(table_name)
ORDER BY expected.table_name;


-- ============================================================
-- 2. EXPECTED REAL COLUMNS
-- ============================================================

WITH expected_columns AS (
  SELECT *
  FROM (
    VALUES

      -- companies
      ('companies', 'id',         'uuid'),
      ('companies', 'name',       'text'),
      ('companies', 'email',      'text'),
      ('companies', 'phone',      'text'),
      ('companies', 'address',    'text'),
      ('companies', 'created_at', 'timestamp with time zone'),

      -- profiles
      ('profiles', 'id',         'uuid'),
      ('profiles', 'created_at', 'timestamp with time zone'),
      ('profiles', 'company_id', 'uuid'),
      ('profiles', 'full_name',  'text'),
      ('profiles', 'role',       'text'),

      -- vehicles
      ('vehicles', 'id',           'uuid'),
      ('vehicles', 'created_at',   'timestamp with time zone'),
      ('vehicles', 'company_id',   'uuid'),
      ('vehicles', 'name',         'text'),
      ('vehicles', 'registration', 'text'),
      ('vehicles', 'brand',        'text'),
      ('vehicles', 'model',        'text'),
      ('vehicles', 'year',         'integer'),
      ('vehicles', 'device_id',    'text'),
      ('vehicles', 'status',       'text')

  ) AS x(table_name, column_name, expected_data_type)
)

SELECT
  e.table_name,
  e.column_name,
  e.expected_data_type,

  c.data_type AS actual_data_type,

  CASE
    WHEN c.column_name IS NULL THEN 'MISSING'
    WHEN c.data_type = e.expected_data_type THEN 'OK'
    ELSE 'TYPE_MISMATCH'
  END AS validation_status

FROM expected_columns e

LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = e.column_name

ORDER BY e.table_name, e.column_name;


-- ============================================================
-- 3. ACTUAL STRUCTURE OF COMPANIES
-- ============================================================

SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'companies'
ORDER BY ordinal_position;


-- ============================================================
-- 4. ACTUAL STRUCTURE OF PROFILES
-- ============================================================

SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;


-- ============================================================
-- 5. ACTUAL STRUCTURE OF VEHICLES
-- ============================================================

SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicles'
ORDER BY ordinal_position;


-- ============================================================
-- 6. PRIMARY KEYS
-- ============================================================

SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_name IN (
    'companies',
    'profiles',
    'vehicles'
  )
ORDER BY tc.table_name, kcu.ordinal_position;


-- ============================================================
-- 7. FOREIGN KEYS
-- ============================================================

SELECT
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'companies',
    'profiles',
    'vehicles'
  )
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;


-- ============================================================
-- 8. EXISTING CHECK CONSTRAINTS
-- ============================================================

SELECT
  conrelid::regclass::text AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'c'
  AND connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN (
    'companies',
    'profiles',
    'vehicles'
  )
ORDER BY table_name, constraint_name;


-- ============================================================
-- 9. EXISTING INDEXES
-- ============================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'companies',
    'profiles',
    'vehicles'
  )
ORDER BY tablename, indexname;


-- ============================================================
-- 10. CURRENT RLS STATUS
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'companies',
    'profiles',
    'vehicles'
  )
ORDER BY tablename;


-- ============================================================
-- 11. CURRENT RLS POLICIES
-- ============================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'companies',
    'profiles',
    'vehicles'
  )
ORDER BY tablename, policyname;


-- ============================================================
-- 12. CURRENT PUBLIC FUNCTIONS
-- ============================================================

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS security_definer,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;


-- ============================================================
-- 13. CURRENT PUBLIC TRIGGERS
-- ============================================================

SELECT
  t.tgname AS trigger_name,
  ns.nspname AS schema_name,
  tbl.relname AS table_name,
  t.tgenabled AS enabled,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class tbl
  ON tbl.oid = t.tgrelid
JOIN pg_namespace ns
  ON ns.oid = tbl.relnamespace
WHERE ns.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY tbl.relname, t.tgname;


-- ============================================================
-- 14. REQUIRED EXTENSION: PGCRYPTO
-- ============================================================

SELECT
  'pgcrypto' AS extension_name,
  EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pgcrypto'
  ) AS installed;


-- ============================================================
-- 15. POSTGIS STATUS
--
-- PostGIS is NOT required by this V1.
-- Geofences are deliberately outside this migration.
-- ============================================================

SELECT
  'postgis' AS extension_name,
  EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'postgis'
  ) AS installed;


-- ============================================================
-- 16. CURRENT PROFILE ROLE DEFAULT
-- ============================================================

SELECT
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'role';


-- ============================================================
-- 17. CURRENT VEHICLE STATUS DEFAULT
-- ============================================================

SELECT
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'vehicles'
  AND column_name = 'status';


-- ============================================================
-- 18. CHECK FOR UNEXPECTED LEGACY COLUMN ASSUMPTIONS
--
-- These should normally return no rows.
-- ============================================================

SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'vehicles' AND column_name IN ('plate', 'plate_number'))
    OR
    (table_name = 'profiles' AND column_name IN ('name', 'email'))
  )
ORDER BY table_name, column_name;


-- ============================================================
-- 19. STORAGE BUCKETS
-- ============================================================

SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;


-- ============================================================
-- 20. PRE-FLIGHT SUMMARY
-- ============================================================

SELECT
  'companies' AS item,
  COUNT(*) AS row_count
FROM public.companies

UNION ALL

SELECT
  'profiles',
  COUNT(*)
FROM public.profiles

UNION ALL

SELECT
  'vehicles',
  COUNT(*)
FROM public.vehicles;


-- ============================================================
-- EXPECTED CURRENT REALITY BEFORE V1
-- ============================================================
--
-- public tables:
--
-- companies
-- profiles
-- vehicles
--
--
-- profiles.role default:
--
-- 'user'
--
--
-- vehicles.status default:
--
-- 'active'
--
--
-- pgcrypto:
--
-- installed
--
--
-- PostGIS:
--
-- currently not installed
-- and NOT required for this V1.
--
--
-- Storage:
--
-- currently no vehicle-videos bucket.
--
--
-- IMPORTANT:
--
-- This file performs NO mutation.
--
-- ============================================================
-- END OF FILE
-- ============================================================