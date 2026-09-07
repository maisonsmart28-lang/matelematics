-- ============================================================
-- 01_core_validation.sql
-- Read-only validation after 01_core.sql execution
-- ============================================================
-- IMPORTANT: This file is READ-ONLY. No modifications.
-- Execute in Supabase SQL Editor to verify 01_core.sql success.
-- ============================================================

-- ============================================================
-- 1. TABLE EXISTENCE CHECK
-- ============================================================

\echo '========== TABLE EXISTENCE =========='

SELECT table_name,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = t.table_name
       ) AS exists_flag
FROM (
  VALUES ('drivers'), ('devices'), ('vehicle_driver_assignments')
) AS t(table_name)
ORDER BY table_name;

-- ============================================================
-- 2. COLUMN VERIFICATION FOR drivers
-- ============================================================

\echo '========== TABLE: drivers (columns) =========='

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'drivers'
ORDER BY ordinal_position;

-- ============================================================
-- 3. COLUMN VERIFICATION FOR devices
-- ============================================================

\echo '========== TABLE: devices (columns) =========='

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'devices'
ORDER BY ordinal_position;

-- ============================================================
-- 4. COLUMN VERIFICATION FOR vehicle_driver_assignments
-- ============================================================

\echo '========== TABLE: vehicle_driver_assignments (columns) =========='

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'vehicle_driver_assignments'
ORDER BY ordinal_position;

-- ============================================================
-- 5. UNIQUE CONSTRAINTS VERIFICATION
-- ============================================================

\echo '========== UNIQUE CONSTRAINTS =========='

SELECT tc.constraint_name,
       tc.table_name,
       kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('drivers', 'devices', 'vehicle_driver_assignments', 'vehicles')
  AND tc.constraint_name ILIKE '%company_id%'
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- ============================================================
-- 6. PRIMARY KEY VERIFICATION
-- ============================================================

\echo '========== PRIMARY KEYS =========='

SELECT tc.constraint_name,
       tc.table_name,
       kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_name IN ('drivers', 'devices', 'vehicle_driver_assignments')
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- ============================================================
-- 7. FOREIGN KEY VERIFICATION
-- ============================================================

\echo '========== FOREIGN KEYS =========='

SELECT tc.constraint_name,
       kcu.table_name,
       kcu.column_name,
       ccu.table_name AS referenced_table_name,
       ccu.column_name AS referenced_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
 AND tc.constraint_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.table_name IN ('drivers', 'devices', 'vehicle_driver_assignments')
ORDER BY kcu.table_name, tc.constraint_name, kcu.ordinal_position;

-- ============================================================
-- 8. COMPOSITE FK VERIFICATION (drivers)
-- ============================================================

\echo '========== COMPOSITE FK: drivers =========='

SELECT tc.constraint_name,
       kcu.table_name,
       STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns,
       ccu.table_name AS referenced_table,
       STRING_AGG(ccu.column_name, ', ' ORDER BY kcu.ordinal_position) AS referenced_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
 AND tc.constraint_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND kcu.table_name = 'drivers'
  AND tc.constraint_type = 'FOREIGN KEY'
GROUP BY tc.constraint_name, kcu.table_name, ccu.table_name
ORDER BY tc.constraint_name;

-- ============================================================
-- 9. COMPOSITE FK VERIFICATION (devices)
-- ============================================================

\echo '========== COMPOSITE FK: devices =========='

SELECT tc.constraint_name,
       kcu.table_name,
       STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns,
       ccu.table_name AS referenced_table,
       STRING_AGG(ccu.column_name, ', ' ORDER BY kcu.ordinal_position) AS referenced_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
 AND tc.constraint_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND kcu.table_name = 'devices'
  AND tc.constraint_type = 'FOREIGN KEY'
GROUP BY tc.constraint_name, kcu.table_name, ccu.table_name
ORDER BY tc.constraint_name;

-- ============================================================
-- 10. COMPOSITE FK VERIFICATION (vehicle_driver_assignments)
-- ============================================================

\echo '========== COMPOSITE FK: vehicle_driver_assignments =========='

SELECT tc.constraint_name,
       kcu.table_name,
       STRING_AGG(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns,
       ccu.table_name AS referenced_table,
       STRING_AGG(ccu.column_name, ', ' ORDER BY kcu.ordinal_position) AS referenced_columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
 AND tc.constraint_schema = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND kcu.table_name = 'vehicle_driver_assignments'
  AND tc.constraint_type = 'FOREIGN KEY'
GROUP BY tc.constraint_name, kcu.table_name, ccu.table_name
ORDER BY tc.constraint_name;

-- ============================================================
-- 11. INDEX VERIFICATION
-- ============================================================

\echo '========== INDEXES =========='

SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('drivers', 'devices', 'vehicle_driver_assignments')
ORDER BY tablename, indexname;

-- ============================================================
-- 12. UNIQUE INDEX: active_vehicle
-- ============================================================

\echo '========== UNIQUE INDEX: idx_vehicle_driver_assignments_active_vehicle =========='

SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_vehicle_driver_assignments_active_vehicle';

-- ============================================================
-- 13. UNIQUE INDEX: active_driver
-- ============================================================

\echo '========== UNIQUE INDEX: idx_vehicle_driver_assignments_active_driver =========='

SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'idx_vehicle_driver_assignments_active_driver';

-- ============================================================
-- 14. CHECK CONSTRAINTS
-- ============================================================

\echo '========== CHECK CONSTRAINTS =========='

SELECT conrelid::regclass::text AS table_name,
       conname AS constraint_name,
       pg_get_constraintdef(oid) AS check_clause
FROM pg_constraint
WHERE contype = 'c'
  AND conrelid IN (
    'public.drivers'::regclass,
    'public.devices'::regclass,
    'public.vehicle_driver_assignments'::regclass
  )
ORDER BY table_name, constraint_name;

-- ============================================================
-- 15. vehicles_company_id_id_key EXISTENCE
-- ============================================================

\echo '========== UNIQUE CONSTRAINT: vehicles_company_id_id_key =========='

SELECT tc.constraint_name,
       tc.table_name,
       kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'vehicles'
  AND tc.constraint_name = 'vehicles_company_id_id_key'
ORDER BY kcu.ordinal_position;

-- ============================================================
-- 16. COMPLETE CONSTRAINT SUMMARY FOR ALL NEW TABLES
-- ============================================================

\echo '========== CONSTRAINT SUMMARY =========='

SELECT tc.table_name,
       tc.constraint_type,
       COUNT(*) AS count
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('drivers', 'devices', 'vehicle_driver_assignments')
GROUP BY tc.table_name, tc.constraint_type
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================================
-- END OF VALIDATION
-- ============================================================
