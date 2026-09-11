-- ============================================================
-- MATELEMATICS
-- P0 / STEP 2 - SUPABASE RLS HARDENING
-- File: 03_rls_hardening.sql
--
-- Goals:
--   1) Remove all direct table access from anon.
--   2) Keep authenticated read-only at SQL grant level.
--      Row visibility remains controlled by existing RLS policies.
--   3) Keep all writes behind trusted server APIs / service_role.
--   4) Remove direct client EXECUTE on trigger/security functions,
--      then explicitly re-grant only the RLS helper functions needed
--      by authenticated policies.
--   5) Harden SECURITY DEFINER search_path.
--   6) Fix default privileges so future public objects do not
--      automatically regain excessive client privileges.
--
-- IMPORTANT:
--   - Does NOT disable RLS.
--   - Does NOT drop or replace existing RLS policies.
--   - Does NOT change service_role grants.
--   - Does NOT modify consume_demo_rate_limit(...), whose EXECUTE
--     remains service_role-only.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. SCHEMA ACCESS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;


-- ============================================================
-- 2. CURRENT TABLE PRIVILEGES
--
-- Target:
--   anon          -> no direct privileges
--   authenticated -> SELECT only
--
-- Existing RLS policies still decide which rows authenticated
-- users can actually see.
-- ============================================================

REVOKE ALL PRIVILEGES ON TABLE
  public.alert_settings,
  public.alerts,
  public.camera_events,
  public.cameras,
  public.companies,
  public.devices,
  public.drivers,
  public.partners,
  public.positions,
  public.profiles,
  public.telemetry,
  public.trips,
  public.vehicle_driver_assignments,
  public.vehicles,
  public.video_clips
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.alert_settings,
  public.alerts,
  public.camera_events,
  public.cameras,
  public.companies,
  public.devices,
  public.drivers,
  public.partners,
  public.positions,
  public.profiles,
  public.telemetry,
  public.trips,
  public.vehicle_driver_assignments,
  public.vehicles,
  public.video_clips
TO authenticated;


-- ============================================================
-- 3. CURRENT FUNCTION EXECUTE PRIVILEGES
--
-- Remove generic PUBLIC/anon/authenticated EXECUTE first.
-- Existing trigger execution is not a browser/API grant and does
-- not require direct EXECUTE to remain exposed to client roles.
-- ============================================================

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
FROM PUBLIC, anon, authenticated;


-- ============================================================
-- 4. EXPLICIT EXECUTE FOR AUTHENTICATED RLS HELPERS ONLY
--
-- These helpers are referenced by the existing authenticated
-- RLS policies and therefore remain callable by authenticated.
-- ============================================================

GRANT EXECUTE ON FUNCTION public.can_access_company(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.can_manage_company(uuid)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_company_id()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_partner_id()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_role()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_client_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_matelematics_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_partner_admin()
TO authenticated;


-- ============================================================
-- 5. HARDEN SECURITY DEFINER SEARCH_PATH
--
-- Keep only trusted schemas in a deterministic order.
-- Client roles already have no CREATE privilege on public.
-- All business relations referenced by these functions are
-- schema-qualified in the deployed definitions audited in Step 2.
-- ============================================================

ALTER FUNCTION public.can_access_company(uuid)
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.can_manage_company(uuid)
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.current_user_company_id()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.current_user_partner_id()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.current_user_role()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.is_client_admin()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.is_matelematics_admin()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.is_partner_admin()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.protect_company_security_fields()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.protect_profile_security_fields()
  SET search_path TO pg_catalog, public, auth;

ALTER FUNCTION public.set_updated_at()
  SET search_path TO pg_catalog, public, auth;


-- ============================================================
-- 6. DEFAULT PRIVILEGES - OBJECTS CREATED BY postgres
--
-- Future tables/sequences/functions in public must require
-- explicit grants. This prevents reintroducing the current
-- over-permissive state.
-- ============================================================

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default.
-- Removing that built-in default requires changing the role's
-- global function default, not only the per-schema ACL.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Remove any explicit per-schema client grants as well.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;


-- ============================================================
-- 7. SUPABASE PLATFORM LIMITATION - supabase_admin
--
-- The normal Supabase SQL Editor session executes as postgres.
-- postgres is not a member of supabase_admin, so PostgreSQL refuses:
--   ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin ...
--
-- Those commands are intentionally NOT executed here. Leaving them
-- in this migration would make the whole transaction fail and roll
-- back. Current Matelematics public tables/functions are owned by
-- postgres; postgres default privileges are hardened above.
-- ============================================================

COMMIT;


-- ============================================================
-- 8. POST-MIGRATION VALIDATION - READ ONLY
-- ============================================================

-- 8.1 Current table privileges for anon/authenticated.
-- Expected:
--   anon          -> 0 rows
--   authenticated -> SELECT only on the 15 listed tables
SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, table_name, privilege_type;


-- 8.2 Effective dangerous table privileges.
-- Expected: 0 rows.
WITH target_tables(table_name) AS (
  VALUES
    ('alert_settings'),
    ('alerts'),
    ('camera_events'),
    ('cameras'),
    ('companies'),
    ('devices'),
    ('drivers'),
    ('partners'),
    ('positions'),
    ('profiles'),
    ('telemetry'),
    ('trips'),
    ('vehicle_driver_assignments'),
    ('vehicles'),
    ('video_clips')
),
checks AS (
  SELECT
    r.role_name,
    t.table_name,
    p.privilege_name,
    has_table_privilege(
      r.role_name,
      format('public.%I', t.table_name),
      p.privilege_name
    ) AS has_privilege
  FROM (VALUES ('anon'), ('authenticated')) AS r(role_name)
  CROSS JOIN target_tables t
  CROSS JOIN (
    VALUES
      ('INSERT'),
      ('UPDATE'),
      ('DELETE'),
      ('TRUNCATE'),
      ('REFERENCES'),
      ('TRIGGER')
  ) AS p(privilege_name)
)
SELECT *
FROM checks
WHERE has_privilege
ORDER BY role_name, table_name, privilege_name;


-- 8.3 Authenticated SELECT coverage.
-- Expected: 15 rows and every has_select = true.
WITH target_tables(table_name) AS (
  VALUES
    ('alert_settings'),
    ('alerts'),
    ('camera_events'),
    ('cameras'),
    ('companies'),
    ('devices'),
    ('drivers'),
    ('partners'),
    ('positions'),
    ('profiles'),
    ('telemetry'),
    ('trips'),
    ('vehicle_driver_assignments'),
    ('vehicles'),
    ('video_clips')
)
SELECT
  table_name,
  has_table_privilege(
    'authenticated',
    format('public.%I', table_name),
    'SELECT'
  ) AS has_select
FROM target_tables
ORDER BY table_name;


-- 8.4 Anon effective table access.
-- Expected: 15 rows and every has_any_dml = false.
WITH target_tables(table_name) AS (
  VALUES
    ('alert_settings'),
    ('alerts'),
    ('camera_events'),
    ('cameras'),
    ('companies'),
    ('devices'),
    ('drivers'),
    ('partners'),
    ('positions'),
    ('profiles'),
    ('telemetry'),
    ('trips'),
    ('vehicle_driver_assignments'),
    ('vehicles'),
    ('video_clips')
)
SELECT
  table_name,
  (
    has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
    OR has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
    OR has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
    OR has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
    OR has_table_privilege('anon', format('public.%I', table_name), 'TRUNCATE')
    OR has_table_privilege('anon', format('public.%I', table_name), 'REFERENCES')
    OR has_table_privilege('anon', format('public.%I', table_name), 'TRIGGER')
  ) AS has_any_dml
FROM target_tables
ORDER BY table_name;


-- 8.5 Function EXECUTE matrix.
-- Expected:
--   authenticated = true only for the 8 RLS helpers below.
--   anon          = false for every public function.
--   consume_demo_rate_limit(...) remains service_role-only.
SELECT
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute,
  p.proconfig AS function_config
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n
  ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname,
         pg_catalog.pg_get_function_identity_arguments(p.oid);


-- 8.6 RLS status.
-- Expected: rls_enabled = true on all 15 tables.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n
  ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;


-- 8.7 postgres default privileges after hardening.
-- supabase_admin defaults are a documented platform limitation.
SELECT
  pg_get_userbyid(d.defaclrole) AS owner,
  COALESCE(n.nspname, '<all schemas>') AS schema_name,
  CASE d.defaclobjtype
    WHEN 'r' THEN 'TABLES'
    WHEN 'S' THEN 'SEQUENCES'
    WHEN 'f' THEN 'FUNCTIONS'
    WHEN 'T' THEN 'TYPES'
    WHEN 'n' THEN 'SCHEMAS'
    ELSE d.defaclobjtype::text
  END AS object_type,
  d.defaclacl::text AS default_acl
FROM pg_catalog.pg_default_acl d
LEFT JOIN pg_catalog.pg_namespace n
  ON n.oid = d.defaclnamespace
WHERE pg_get_userbyid(d.defaclrole) = 'postgres'
  AND (n.nspname = 'public' OR d.defaclnamespace = 0)
ORDER BY owner, schema_name, object_type;
