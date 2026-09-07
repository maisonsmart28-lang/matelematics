-- ============================================================
-- MATELEMATICS V1
-- 05_functions.sql
-- Helpers RLS + security triggers + updated_at
--
-- PREPARED MIGRATION
-- DO NOT EXECUTE BEFORE FINAL REVIEW
-- ============================================================


-- ============================================================
-- 1. CURRENT USER COMPANY
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.company_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;


-- ============================================================
-- 2. CURRENT USER ROLE
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT p.role
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;


-- ============================================================
-- 3. MATELEMATICS ADMIN CHECK
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_matelematics_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (
      SELECT p.role = 'matelematics_admin'
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;


-- ============================================================
-- 4. CLIENT ADMIN CHECK
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_client_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(
    (
      SELECT p.role = 'client_admin'
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
      LIMIT 1
    ),
    false
  );
$$;


-- ============================================================
-- 5. UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 6. PROFILE SECURITY
--
-- Protect sensitive tenant/security fields.
--
-- matelematics_admin:
--   may manage role/company_id globally.
--
-- client_admin:
--   may NOT change company_id.
--   may NOT assign matelematics_admin.
--   may NOT become matelematics_admin.
--
-- user:
--   may NOT change role.
--   may NOT change company_id.
--
-- RLS remains responsible for deciding WHICH profile row
-- the caller may update.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
  caller_company_id uuid;
BEGIN

  SELECT p.role, p.company_id
    INTO caller_role, caller_company_id
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;


  -- ----------------------------------------------------------
  -- No authenticated profile / unknown caller
  -- ----------------------------------------------------------

  IF caller_role IS NULL THEN
    RAISE EXCEPTION
      'Matelematics: authenticated profile not found';
  END IF;


  -- ----------------------------------------------------------
  -- Global Matelematics administrator
  -- ----------------------------------------------------------

  IF caller_role = 'matelematics_admin' THEN
    RETURN NEW;
  END IF;


  -- ----------------------------------------------------------
  -- Nobody except matelematics_admin may assign
  -- matelematics_admin.
  -- ----------------------------------------------------------

  IF NEW.role = 'matelematics_admin'
     AND OLD.role IS DISTINCT FROM 'matelematics_admin'
  THEN
    RAISE EXCEPTION
      'Matelematics: only matelematics_admin may assign this role';
  END IF;


  -- ----------------------------------------------------------
  -- Standard user
  -- ----------------------------------------------------------

  IF caller_role = 'user' THEN

    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION
        'Matelematics: user cannot change company_id';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION
        'Matelematics: user cannot change role';
    END IF;

    RETURN NEW;

  END IF;


  -- ----------------------------------------------------------
  -- Client administrator
  -- ----------------------------------------------------------

  IF caller_role = 'client_admin' THEN

    -- Client admin cannot move a profile to another tenant.
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot change company_id';
    END IF;

    -- Additional tenant protection.
    IF OLD.company_id IS DISTINCT FROM caller_company_id THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot manage another company';
    END IF;

    -- Client admin cannot create/escalate to global admin.
    IF NEW.role = 'matelematics_admin' THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot assign matelematics_admin';
    END IF;

    -- A client_admin must not be able to elevate itself
    -- to the global role.
    IF OLD.id = auth.uid()
       AND NEW.role IS DISTINCT FROM OLD.role
    THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot change its own role';
    END IF;

    RETURN NEW;

  END IF;


  -- ----------------------------------------------------------
  -- Unknown roles fail closed.
  -- ----------------------------------------------------------

  RAISE EXCEPTION
    'Matelematics: unauthorized profile role';

END;
$$;


-- ============================================================
-- 7. FUNCTION PERMISSIONS
-- ============================================================

REVOKE ALL ON FUNCTION public.current_user_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_matelematics_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_client_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_company_id()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_role()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_matelematics_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_client_admin()
TO authenticated;


-- Trigger functions are not intended to be called directly
-- by application users.

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_security_fields()
FROM PUBLIC;


-- ============================================================
-- 8. PROFILE SECURITY TRIGGER
-- ============================================================

DROP TRIGGER IF EXISTS trg_profiles_protect_security_fields
ON public.profiles;

CREATE TRIGGER trg_profiles_protect_security_fields
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_security_fields();


-- ============================================================
-- 9. UPDATED_AT TRIGGERS
-- Only tables confirmed in V1 to contain updated_at.
-- ============================================================

DROP TRIGGER IF EXISTS trg_drivers_set_updated_at
ON public.drivers;

CREATE TRIGGER trg_drivers_set_updated_at
BEFORE UPDATE
ON public.drivers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_devices_set_updated_at
ON public.devices;

CREATE TRIGGER trg_devices_set_updated_at
BEFORE UPDATE
ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_cameras_set_updated_at
ON public.cameras;

CREATE TRIGGER trg_cameras_set_updated_at
BEFORE UPDATE
ON public.cameras
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- END
-- ============================================================