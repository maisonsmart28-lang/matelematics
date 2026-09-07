-- ============================================================
-- MATELEMATICS V1
-- 06_rls.sql
-- FINAL MULTI-TENANT RLS
--
-- Hierarchy:
--
-- Matelematics Admin
--      |
--      +-- Partner Admin
--      |      |
--      |      +-- Client Companies
--      |
--      +-- Direct Client Companies (partner_id IS NULL)
--
-- Client Company
--      |
--      +-- Client Admin
--      +-- User
--
-- ============================================================


-- ============================================================
-- 1. GENERIC COMPANY ACCESS HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_access_company(
  target_company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT CASE

    WHEN auth.uid() IS NULL THEN false

    WHEN public.is_matelematics_admin()
      THEN true

    WHEN public.is_partner_admin()
      THEN EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = target_company_id
          AND c.partner_id = public.current_user_partner_id()
      )

    WHEN public.current_user_role() IN ('client_admin', 'user')
      THEN target_company_id = public.current_user_company_id()

    ELSE false

  END;
$$;


CREATE OR REPLACE FUNCTION public.can_manage_company(
  target_company_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
  SELECT CASE

    WHEN auth.uid() IS NULL THEN false

    WHEN public.is_matelematics_admin()
      THEN true

    WHEN public.is_partner_admin()
      THEN EXISTS (
        SELECT 1
        FROM public.companies c
        WHERE c.id = target_company_id
          AND c.partner_id = public.current_user_partner_id()
      )

    WHEN public.is_client_admin()
      THEN target_company_id = public.current_user_company_id()

    ELSE false

  END;
$$;


REVOKE ALL
ON FUNCTION public.can_access_company(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.can_manage_company(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.can_access_company(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.can_manage_company(uuid)
TO authenticated;


-- ============================================================
-- 2. COMPANY SECURITY TRIGGER
--
-- Protects company ID and partner ownership.
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_company_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  caller_role text;
  caller_company_id uuid;
  caller_partner_id uuid;
BEGIN

  SELECT
    p.role,
    p.company_id,
    p.partner_id
  INTO
    caller_role,
    caller_company_id,
    caller_partner_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;


  -- Primary key must never be changed.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION
      'Matelematics: company id cannot be changed';
  END IF;


  IF caller_role IS NULL THEN
    RAISE EXCEPTION
      'Matelematics: authenticated profile not found';
  END IF;


  -- Global Matelematics administrator
  IF caller_role = 'matelematics_admin' THEN
    RETURN NEW;
  END IF;


  -- Nobody below Matelematics may reassign partner ownership.
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
    RAISE EXCEPTION
      'Matelematics: partner_id cannot be changed';
  END IF;


  -- Partner administrator
  IF caller_role = 'partner_admin' THEN

    IF OLD.partner_id IS DISTINCT FROM caller_partner_id THEN
      RAISE EXCEPTION
        'Matelematics: partner_admin cannot manage another partner company';
    END IF;

    RETURN NEW;

  END IF;


  -- Client administrator
  IF caller_role = 'client_admin' THEN

    IF OLD.id IS DISTINCT FROM caller_company_id THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot manage another company';
    END IF;

    RETURN NEW;

  END IF;


  RAISE EXCEPTION
    'Matelematics: unauthorized company update';

END;
$$;


REVOKE ALL
ON FUNCTION public.protect_company_security_fields()
FROM PUBLIC;


DROP TRIGGER IF EXISTS trg_companies_protect_security_fields
ON public.companies;

CREATE TRIGGER trg_companies_protect_security_fields
BEFORE UPDATE
ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.protect_company_security_fields();


-- ============================================================
-- 3. REPLACE PROFILE SECURITY FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_security_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  caller_role text;
  caller_company_id uuid;
  caller_partner_id uuid;
  old_company_partner_id uuid;
BEGIN

  SELECT
    p.role,
    p.company_id,
    p.partner_id
  INTO
    caller_role,
    caller_company_id,
    caller_partner_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;


  IF caller_role IS NULL THEN
    RAISE EXCEPTION
      'Matelematics: authenticated profile not found';
  END IF;


  -- Profile IDs are auth.users IDs and must never be rewritten.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION
      'Matelematics: profile id cannot be changed';
  END IF;


  -- Global administrator
  IF caller_role = 'matelematics_admin' THEN
    RETURN NEW;
  END IF;


  -- ==========================================================
  -- STANDARD USER
  -- ==========================================================

  IF caller_role = 'user' THEN

    IF OLD.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION
        'Matelematics: user cannot modify another profile';
    END IF;

    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION
        'Matelematics: user cannot change company_id';
    END IF;

    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION
        'Matelematics: user cannot change partner_id';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION
        'Matelematics: user cannot change role';
    END IF;

    RETURN NEW;

  END IF;


  -- ==========================================================
  -- CLIENT ADMIN
  -- ==========================================================

  IF caller_role = 'client_admin' THEN

    IF OLD.company_id IS DISTINCT FROM caller_company_id THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot manage another company';
    END IF;

    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot change company_id';
    END IF;

    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot change partner_id';
    END IF;

    IF OLD.role NOT IN ('user', 'client_admin') THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot manage elevated roles';
    END IF;

    IF NEW.role NOT IN ('user', 'client_admin') THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot assign elevated role';
    END IF;

    -- Client admin cannot change its own role.
    IF OLD.id = auth.uid()
       AND NEW.role IS DISTINCT FROM OLD.role
    THEN
      RAISE EXCEPTION
        'Matelematics: client_admin cannot change its own role';
    END IF;

    RETURN NEW;

  END IF;


  -- ==========================================================
  -- PARTNER ADMIN
  -- ==========================================================

  IF caller_role = 'partner_admin' THEN

    -- Its own partner-level profile.
    IF OLD.id = auth.uid() THEN

      IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION
          'Matelematics: partner_admin cannot change its own company_id';
      END IF;

      IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
        RAISE EXCEPTION
          'Matelematics: partner_admin cannot change its partner_id';
      END IF;

      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION
          'Matelematics: partner_admin cannot change its own role';
      END IF;

      RETURN NEW;

    END IF;


    -- Target must be a client profile.
    IF OLD.company_id IS NULL THEN
      RAISE EXCEPTION
        'Matelematics: partner_admin cannot manage this profile';
    END IF;


    SELECT c.partner_id
    INTO old_company_partner_id
    FROM public.companies c
    WHERE c.id = OLD.company_id
    LIMIT 1;


    IF old_company_partner_id IS DISTINCT FROM caller_partner_id THEN
      RAISE EXCEPTION
        'Matelematics: partner_admin cannot manage another partner client';
    END IF;


    -- Do not move users between companies in V1.
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION
        'Matelematics: partner_admin cannot move a profile between companies';
    END IF;


    -- Client profiles do not change partner scope directly.
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id THEN
      RAISE EXCEPTION
        'Matelematics: partner_admin cannot change profile partner_id';
    END IF;


    IF OLD.role NOT IN ('user', 'client_admin') THEN
      RAISE EXCEPTION
        'Matelematics: partner_admin cannot manage elevated roles';
    END IF;


    IF NEW.role NOT IN ('user', 'client_admin') THEN
      RAISE EXCEPTION
        'Matelematics: partner_admin cannot assign elevated role';
    END IF;


    RETURN NEW;

  END IF;


  RAISE EXCEPTION
    'Matelematics: unauthorized profile role';

END;
$$;


REVOKE ALL
ON FUNCTION public.protect_profile_security_fields()
FROM PUBLIC;


DROP TRIGGER IF EXISTS trg_profiles_protect_security_fields
ON public.profiles;

CREATE TRIGGER trg_profiles_protect_security_fields
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_security_fields();


-- ============================================================
-- 4. PARTNERS
-- ============================================================

ALTER TABLE public.partners
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS partners_select_scope
ON public.partners;

DROP POLICY IF EXISTS partners_admin_manage
ON public.partners;


CREATE POLICY partners_select_scope
ON public.partners
FOR SELECT
TO authenticated
USING (
  public.is_matelematics_admin()
  OR (
    public.is_partner_admin()
    AND id = public.current_user_partner_id()
  )
);


CREATE POLICY partners_admin_manage
ON public.partners
FOR ALL
TO authenticated
USING (
  public.is_matelematics_admin()
)
WITH CHECK (
  public.is_matelematics_admin()
);


-- ============================================================
-- 5. COMPANIES
-- ============================================================

ALTER TABLE public.companies
ENABLE ROW LEVEL SECURITY;


-- Existing legacy policy
DROP POLICY IF EXISTS companies_select_own_company
ON public.companies;

-- New policies
DROP POLICY IF EXISTS companies_select_scope
ON public.companies;

DROP POLICY IF EXISTS companies_insert_scope
ON public.companies;

DROP POLICY IF EXISTS companies_update_scope
ON public.companies;

DROP POLICY IF EXISTS companies_delete_admin
ON public.companies;


CREATE POLICY companies_select_scope
ON public.companies
FOR SELECT
TO authenticated
USING (
  public.can_access_company(id)
);


CREATE POLICY companies_insert_scope
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_matelematics_admin()

  OR (
    public.is_partner_admin()
    AND partner_id = public.current_user_partner_id()
  )
);


CREATE POLICY companies_update_scope
ON public.companies
FOR UPDATE
TO authenticated
USING (
  public.can_manage_company(id)
)
WITH CHECK (
  public.can_manage_company(id)
);


-- Hard deletion of a client company is reserved to Matelematics.
CREATE POLICY companies_delete_admin
ON public.companies
FOR DELETE
TO authenticated
USING (
  public.is_matelematics_admin()
);


-- ============================================================
-- 6. PROFILES
-- ============================================================

ALTER TABLE public.profiles
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS profiles_select_own
ON public.profiles;

DROP POLICY IF EXISTS profiles_update_own
ON public.profiles;

DROP POLICY IF EXISTS profiles_select_scope
ON public.profiles;

DROP POLICY IF EXISTS profiles_insert_scope
ON public.profiles;

DROP POLICY IF EXISTS profiles_update_scope
ON public.profiles;

DROP POLICY IF EXISTS profiles_delete_scope
ON public.profiles;


CREATE POLICY profiles_select_scope
ON public.profiles
FOR SELECT
TO authenticated
USING (

  public.is_matelematics_admin()

  OR (
    public.is_partner_admin()
    AND (
      (
        company_id IS NOT NULL
        AND public.can_access_company(company_id)
      )
      OR (
        partner_id = public.current_user_partner_id()
      )
    )
  )

  OR (
    public.is_client_admin()
    AND company_id = public.current_user_company_id()
  )

  OR (
    public.current_user_role() = 'user'
    AND id = auth.uid()
  )
);


CREATE POLICY profiles_insert_scope
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (

  public.is_matelematics_admin()

  OR (
    public.is_partner_admin()
    AND company_id IS NOT NULL
    AND public.can_manage_company(company_id)
    AND role IN ('user', 'client_admin')
    AND partner_id IS NULL
  )

  OR (
    public.is_client_admin()
    AND company_id = public.current_user_company_id()
    AND role IN ('user', 'client_admin')
    AND partner_id IS NULL
  )
);


CREATE POLICY profiles_update_scope
ON public.profiles
FOR UPDATE
TO authenticated
USING (

  public.is_matelematics_admin()

  OR (
    public.is_partner_admin()
    AND (
      id = auth.uid()
      OR (
        company_id IS NOT NULL
        AND public.can_manage_company(company_id)
      )
    )
  )

  OR (
    public.is_client_admin()
    AND company_id = public.current_user_company_id()
  )

  OR (
    public.current_user_role() = 'user'
    AND id = auth.uid()
  )
)
WITH CHECK (

  public.is_matelematics_admin()

  OR (
    public.is_partner_admin()
    AND (
      id = auth.uid()
      OR (
        company_id IS NOT NULL
        AND public.can_manage_company(company_id)
      )
    )
  )

  OR (
    public.is_client_admin()
    AND company_id = public.current_user_company_id()
  )

  OR (
    public.current_user_role() = 'user'
    AND id = auth.uid()
  )
);


CREATE POLICY profiles_delete_scope
ON public.profiles
FOR DELETE
TO authenticated
USING (

  public.is_matelematics_admin()

  OR (
    public.is_partner_admin()
    AND id <> auth.uid()
    AND role IN ('user', 'client_admin')
    AND company_id IS NOT NULL
    AND public.can_manage_company(company_id)
  )

  OR (
    public.is_client_admin()
    AND id <> auth.uid()
    AND company_id = public.current_user_company_id()
    AND role = 'user'
  )
);


-- ============================================================
-- 7. VEHICLES
-- ============================================================

ALTER TABLE public.vehicles
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS vehicles_select_own_company
ON public.vehicles;

DROP POLICY IF EXISTS vehicles_insert_own_company
ON public.vehicles;

DROP POLICY IF EXISTS vehicles_update_own_company
ON public.vehicles;

DROP POLICY IF EXISTS vehicles_delete_own_company
ON public.vehicles;

DROP POLICY IF EXISTS vehicles_select_scope
ON public.vehicles;

DROP POLICY IF EXISTS vehicles_manage_scope
ON public.vehicles;


CREATE POLICY vehicles_select_scope
ON public.vehicles
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY vehicles_manage_scope
ON public.vehicles
FOR ALL
TO authenticated
USING (
  public.can_manage_company(company_id)
)
WITH CHECK (
  public.can_manage_company(company_id)
);


-- ============================================================
-- 8. DRIVERS
-- ============================================================

ALTER TABLE public.drivers
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drivers_select_scope
ON public.drivers;

DROP POLICY IF EXISTS drivers_manage_scope
ON public.drivers;


CREATE POLICY drivers_select_scope
ON public.drivers
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY drivers_manage_scope
ON public.drivers
FOR ALL
TO authenticated
USING (
  public.can_manage_company(company_id)
)
WITH CHECK (
  public.can_manage_company(company_id)
);


-- ============================================================
-- 9. DEVICES
-- ============================================================

ALTER TABLE public.devices
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS devices_select_scope
ON public.devices;

DROP POLICY IF EXISTS devices_manage_scope
ON public.devices;


CREATE POLICY devices_select_scope
ON public.devices
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY devices_manage_scope
ON public.devices
FOR ALL
TO authenticated
USING (
  public.can_manage_company(company_id)
)
WITH CHECK (
  public.can_manage_company(company_id)
);


-- ============================================================
-- 10. VEHICLE / DRIVER ASSIGNMENTS
-- ============================================================

ALTER TABLE public.vehicle_driver_assignments
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assignments_select_scope
ON public.vehicle_driver_assignments;

DROP POLICY IF EXISTS assignments_manage_scope
ON public.vehicle_driver_assignments;


CREATE POLICY assignments_select_scope
ON public.vehicle_driver_assignments
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY assignments_manage_scope
ON public.vehicle_driver_assignments
FOR ALL
TO authenticated
USING (
  public.can_manage_company(company_id)
)
WITH CHECK (
  public.can_manage_company(company_id)
);


-- ============================================================
-- 11. POSITIONS
--
-- Client/partner accounts read.
-- Trusted backend/service role writes.
-- ============================================================

ALTER TABLE public.positions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS positions_select_scope
ON public.positions;

DROP POLICY IF EXISTS positions_admin_manage
ON public.positions;


CREATE POLICY positions_select_scope
ON public.positions
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY positions_admin_manage
ON public.positions
FOR ALL
TO authenticated
USING (
  public.is_matelematics_admin()
)
WITH CHECK (
  public.is_matelematics_admin()
);


-- ============================================================
-- 12. TELEMETRY
-- ============================================================

ALTER TABLE public.telemetry
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_select_scope
ON public.telemetry;

DROP POLICY IF EXISTS telemetry_admin_manage
ON public.telemetry;


CREATE POLICY telemetry_select_scope
ON public.telemetry
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY telemetry_admin_manage
ON public.telemetry
FOR ALL
TO authenticated
USING (
  public.is_matelematics_admin()
)
WITH CHECK (
  public.is_matelematics_admin()
);


-- ============================================================
-- 13. ALERTS
--
-- Read-only from client/partner frontend in V1.
-- Resolution/acknowledgement will later use a controlled API/RPC.
-- ============================================================

ALTER TABLE public.alerts
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alerts_select_scope
ON public.alerts;

DROP POLICY IF EXISTS alerts_admin_manage
ON public.alerts;


CREATE POLICY alerts_select_scope
ON public.alerts
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY alerts_admin_manage
ON public.alerts
FOR ALL
TO authenticated
USING (
  public.is_matelematics_admin()
)
WITH CHECK (
  public.is_matelematics_admin()
);


-- ============================================================
-- 14. TRIPS
-- ============================================================

ALTER TABLE public.trips
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trips_select_scope
ON public.trips;

DROP POLICY IF EXISTS trips_admin_manage
ON public.trips;


CREATE POLICY trips_select_scope
ON public.trips
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY trips_admin_manage
ON public.trips
FOR ALL
TO authenticated
USING (
  public.is_matelematics_admin()
)
WITH CHECK (
  public.is_matelematics_admin()
);


-- ============================================================
-- 15. CAMERAS
-- ============================================================

ALTER TABLE public.cameras
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cameras_select_scope
ON public.cameras;

DROP POLICY IF EXISTS cameras_manage_scope
ON public.cameras;


CREATE POLICY cameras_select_scope
ON public.cameras
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY cameras_manage_scope
ON public.cameras
FOR ALL
TO authenticated
USING (
  public.can_manage_company(company_id)
)
WITH CHECK (
  public.can_manage_company(company_id)
);


-- ============================================================
-- 16. CAMERA EVENTS
-- ============================================================

ALTER TABLE public.camera_events
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS camera_events_select_scope
ON public.camera_events;

DROP POLICY IF EXISTS camera_events_admin_manage
ON public.camera_events;


CREATE POLICY camera_events_select_scope
ON public.camera_events
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY camera_events_admin_manage
ON public.camera_events
FOR ALL
TO authenticated
USING (
  public.is_matelematics_admin()
)
WITH CHECK (
  public.is_matelematics_admin()
);


-- ============================================================
-- 17. VIDEO CLIPS
-- ============================================================

ALTER TABLE public.video_clips
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS video_clips_select_scope
ON public.video_clips;

DROP POLICY IF EXISTS video_clips_admin_manage
ON public.video_clips;


CREATE POLICY video_clips_select_scope
ON public.video_clips
FOR SELECT
TO authenticated
USING (
  public.can_access_company(company_id)
);


CREATE POLICY video_clips_admin_manage
ON public.video_clips
FOR ALL
TO authenticated
USING (
  public.is_matelematics_admin()
)
WITH CHECK (
  public.is_matelematics_admin()
);


-- ============================================================
-- END OF 06_rls.sql
-- ============================================================