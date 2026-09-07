-- ============================================================
-- MATELEMATICS V1
-- 07_validation.sql
-- Read-only structural validation after future migration
--
-- SAFE TO RUN AFTER MIGRATION
-- SELECT ONLY
-- ============================================================


-- ============================================================
-- 1. EXPECTED TABLES
-- ============================================================

SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'companies',
    'profiles',
    'vehicles',
    'drivers',
    'devices',
    'vehicle_driver_assignments',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
ORDER BY table_name;


-- ============================================================
-- 2. EXPECTED COLUMNS
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
  AND table_name IN (
    'companies',
    'profiles',
    'vehicles',
    'drivers',
    'devices',
    'vehicle_driver_assignments',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
ORDER BY table_name, ordinal_position;


-- ============================================================
-- 3. PRIMARY KEYS
-- ============================================================

SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_name IN (
    'companies',
    'profiles',
    'vehicles',
    'drivers',
    'devices',
    'vehicle_driver_assignments',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
ORDER BY tc.table_name, kcu.ordinal_position;


-- ============================================================
-- 4. FOREIGN KEYS
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
    'drivers',
    'devices',
    'vehicle_driver_assignments',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
ORDER BY source_table, tc.constraint_name, kcu.ordinal_position;


-- ============================================================
-- 5. UNIQUE CONSTRAINTS
-- ============================================================

SELECT
  tc.table_name,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN (
    'vehicles',
    'drivers',
    'devices',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;


-- ============================================================
-- 6. CHECK CONSTRAINTS
-- ============================================================

SELECT
  conrelid::regclass::text AS table_name,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'c'
  AND connamespace = 'public'::regnamespace
ORDER BY table_name, constraint_name;


-- ============================================================
-- 7. INDEXES
-- ============================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'vehicles',
    'drivers',
    'devices',
    'vehicle_driver_assignments',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
ORDER BY tablename, indexname;


-- ============================================================
-- 8. RLS STATUS
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
    'vehicles',
    'drivers',
    'devices',
    'vehicle_driver_assignments',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
ORDER BY tablename;


-- ============================================================
-- 9. RLS POLICIES
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
    'vehicles',
    'drivers',
    'devices',
    'vehicle_driver_assignments',
    'positions',
    'telemetry',
    'alerts',
    'trips',
    'cameras',
    'camera_events',
    'video_clips'
  )
ORDER BY tablename, policyname;


-- ============================================================
-- 10. SECURITY FUNCTIONS
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
  AND p.proname IN (
    'current_user_company_id',
    'current_user_role',
    'is_matelematics_admin',
    'is_client_admin',
    'set_updated_at',
    'protect_profile_security_fields'
  )
ORDER BY p.proname;


-- ============================================================
-- 11. TRIGGERS
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
  AND tbl.relname IN (
    'profiles',
    'drivers',
    'devices',
    'cameras'
  )
ORDER BY tbl.relname, t.tgname;


-- ============================================================
-- 12. EXTENSIONS
-- ============================================================

SELECT
  extname,
  extversion
FROM pg_extension
WHERE extname IN (
  'pgcrypto',
  'postgis'
)
ORDER BY extname;


-- ============================================================
-- 13. EXPECTED EXTENSION STATE
-- ============================================================

SELECT
  'pgcrypto' AS extension_name,
  EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pgcrypto'
  ) AS installed

UNION ALL

SELECT
  'postgis',
  EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'postgis'
  );


-- ============================================================
-- 14. CROSS-TENANT CONSISTENCY CHECKS
-- These queries should return ZERO rows.
-- ============================================================

-- Devices linked to vehicles from another company
SELECT
  d.id AS device_id,
  d.company_id AS device_company_id,
  v.id AS vehicle_id,
  v.company_id AS vehicle_company_id
FROM public.devices d
JOIN public.vehicles v
  ON v.id = d.vehicle_id
WHERE d.company_id <> v.company_id;


-- Assignments with mismatched vehicle company
SELECT
  a.id AS assignment_id,
  a.company_id,
  v.company_id AS vehicle_company_id
FROM public.vehicle_driver_assignments a
JOIN public.vehicles v
  ON v.id = a.vehicle_id
WHERE a.company_id <> v.company_id;


-- Assignments with mismatched driver company
SELECT
  a.id AS assignment_id,
  a.company_id,
  d.company_id AS driver_company_id
FROM public.vehicle_driver_assignments a
JOIN public.drivers d
  ON d.id = a.driver_id
WHERE a.company_id <> d.company_id;


-- Positions with mismatched vehicle company
SELECT
  p.id,
  p.company_id,
  v.company_id AS vehicle_company_id
FROM public.positions p
JOIN public.vehicles v
  ON v.id = p.vehicle_id
WHERE p.company_id <> v.company_id;


-- Positions with mismatched device company
SELECT
  p.id,
  p.company_id,
  d.company_id AS device_company_id
FROM public.positions p
JOIN public.devices d
  ON d.id = p.device_id
WHERE p.device_id IS NOT NULL
  AND p.company_id <> d.company_id;


-- Telemetry with mismatched vehicle company
SELECT
  t.id,
  t.company_id,
  v.company_id AS vehicle_company_id
FROM public.telemetry t
JOIN public.vehicles v
  ON v.id = t.vehicle_id
WHERE t.company_id <> v.company_id;


-- Telemetry with mismatched device company
SELECT
  t.id,
  t.company_id,
  d.company_id AS device_company_id
FROM public.telemetry t
JOIN public.devices d
  ON d.id = t.device_id
WHERE t.device_id IS NOT NULL
  AND t.company_id <> d.company_id;


-- Alerts with mismatched vehicle company
SELECT
  a.id,
  a.company_id,
  v.company_id AS vehicle_company_id
FROM public.alerts a
JOIN public.vehicles v
  ON v.id = a.vehicle_id
WHERE a.vehicle_id IS NOT NULL
  AND a.company_id <> v.company_id;


-- Alerts with mismatched device company
SELECT
  a.id,
  a.company_id,
  d.company_id AS device_company_id
FROM public.alerts a
JOIN public.devices d
  ON d.id = a.device_id
WHERE a.device_id IS NOT NULL
  AND a.company_id <> d.company_id;


-- Trips with mismatched vehicle company
SELECT
  t.id,
  t.company_id,
  v.company_id AS vehicle_company_id
FROM public.trips t
JOIN public.vehicles v
  ON v.id = t.vehicle_id
WHERE t.company_id <> v.company_id;


-- Trips with mismatched driver company
SELECT
  t.id,
  t.company_id,
  d.company_id AS driver_company_id
FROM public.trips t
JOIN public.drivers d
  ON d.id = t.driver_id
WHERE t.driver_id IS NOT NULL
  AND t.company_id <> d.company_id;


-- Cameras with mismatched vehicle company
SELECT
  c.id,
  c.company_id,
  v.company_id AS vehicle_company_id
FROM public.cameras c
JOIN public.vehicles v
  ON v.id = c.vehicle_id
WHERE c.company_id <> v.company_id;


-- Camera events with mismatched camera company
SELECT
  ce.id,
  ce.company_id,
  c.company_id AS camera_company_id
FROM public.camera_events ce
JOIN public.cameras c
  ON c.id = ce.camera_id
WHERE ce.camera_id IS NOT NULL
  AND ce.company_id <> c.company_id;


-- Camera events with mismatched telemetry company
SELECT
  ce.id,
  ce.company_id,
  t.company_id AS telemetry_company_id
FROM public.camera_events ce
JOIN public.telemetry t
  ON t.id = ce.telemetry_id
WHERE ce.telemetry_id IS NOT NULL
  AND ce.company_id <> t.company_id;


-- Camera events with mismatched alert company
SELECT
  ce.id,
  ce.company_id,
  a.company_id AS alert_company_id
FROM public.camera_events ce
JOIN public.alerts a
  ON a.id = ce.alert_id
WHERE ce.alert_id IS NOT NULL
  AND ce.company_id <> a.company_id;


-- Camera events with mismatched position company
SELECT
  ce.id,
  ce.company_id,
  p.company_id AS position_company_id
FROM public.camera_events ce
JOIN public.positions p
  ON p.id = ce.position_id
WHERE ce.position_id IS NOT NULL
  AND ce.company_id <> p.company_id;


-- Video clips with mismatched camera company
SELECT
  vc.id,
  vc.company_id,
  c.company_id AS camera_company_id
FROM public.video_clips vc
JOIN public.cameras c
  ON c.id = vc.camera_id
WHERE vc.camera_id IS NOT NULL
  AND vc.company_id <> c.company_id;


-- Video clips with mismatched camera event company
SELECT
  vc.id,
  vc.company_id,
  ce.company_id AS camera_event_company_id
FROM public.video_clips vc
JOIN public.camera_events ce
  ON ce.id = vc.camera_event_id
WHERE vc.camera_event_id IS NOT NULL
  AND vc.company_id <> ce.company_id;


-- ============================================================
-- 15. KPI SOURCE SANITY CHECKS
-- Read-only, only to validate future dashboard sources.
-- ============================================================

SELECT COUNT(*) AS total_vehicles
FROM public.vehicles;

SELECT COUNT(*) AS total_drivers
FROM public.drivers;

SELECT COUNT(*) AS total_devices
FROM public.devices;

SELECT COUNT(*) AS total_positions
FROM public.positions;

SELECT COUNT(*) AS total_telemetry_rows
FROM public.telemetry;

SELECT COUNT(*) AS active_alerts
FROM public.alerts
WHERE status = 'active';

SELECT COUNT(*) AS total_trips
FROM public.trips;

SELECT COUNT(*) AS total_cameras
FROM public.cameras;

SELECT COUNT(*) AS total_camera_events
FROM public.camera_events;

SELECT COUNT(*) AS total_video_clips
FROM public.video_clips;


-- ============================================================
-- 16. STORAGE STATUS
-- No bucket is created here.
-- ============================================================

SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'vehicle-videos';


-- ============================================================
-- END OF FILE
-- ============================================================