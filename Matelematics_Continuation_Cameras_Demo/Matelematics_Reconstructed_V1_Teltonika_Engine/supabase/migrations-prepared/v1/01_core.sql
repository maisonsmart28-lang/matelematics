-- ============================================================
-- MATELEMATICS V1
-- 01_core.sql
-- Core multi-tenant tables
--
-- PREPARED MIGRATION
-- DO NOT EXECUTE BEFORE FINAL REVIEW
-- ============================================================


-- ============================================================
-- 0. EXISTING TABLE SUPPORTING UNIQUE CONSTRAINT
--
-- Required for tenant-safe composite foreign keys.
--
-- Existing table:
-- public.vehicles(company_id, id)
--
-- Existing public.vehicles.device_id TEXT is intentionally
-- preserved and not modified in this migration.
-- ============================================================

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_company_id_id_key
  UNIQUE (company_id, id);


-- ============================================================
-- 1. DRIVERS
-- ============================================================

CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL,

  full_name text NOT NULL,
  license_number text,
  phone text,

  status text NOT NULL DEFAULT 'active',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT drivers_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE,

  CONSTRAINT drivers_company_id_id_key
    UNIQUE (company_id, id)
);


-- ============================================================
-- 2. DEVICES / TELTONIKA TRACKERS
-- ============================================================

CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL,
  vehicle_id uuid,

  imei text NOT NULL UNIQUE,

  manufacturer text,
  model text,
  firmware_version text,
  serial_number text,

  status text NOT NULL DEFAULT 'offline',
  last_seen_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT devices_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE,

  -- Tenant-safe vehicle relation.
  -- Prevents a device from company A from being linked
  -- to a vehicle belonging to company B.
  CONSTRAINT devices_company_vehicle_fkey
    FOREIGN KEY (company_id, vehicle_id)
    REFERENCES public.vehicles(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT devices_company_id_id_key
    UNIQUE (company_id, id)
);


-- ============================================================
-- 3. VEHICLE / DRIVER ASSIGNMENTS
-- ============================================================

CREATE TABLE public.vehicle_driver_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  driver_id uuid NOT NULL,

  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz,

  status text NOT NULL DEFAULT 'active',

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT assignments_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE,

  CONSTRAINT assignments_company_vehicle_fkey
    FOREIGN KEY (company_id, vehicle_id)
    REFERENCES public.vehicles(company_id, id)
    ON DELETE CASCADE,

  CONSTRAINT assignments_company_driver_fkey
    FOREIGN KEY (company_id, driver_id)
    REFERENCES public.drivers(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT assignments_period_check
    CHECK (
      unassigned_at IS NULL
      OR unassigned_at >= assigned_at
    )
);


-- ============================================================
-- 4. ONLY ONE ACTIVE DRIVER PER VEHICLE
-- ============================================================

CREATE UNIQUE INDEX
idx_vehicle_driver_assignments_active_vehicle
ON public.vehicle_driver_assignments(vehicle_id)
WHERE status = 'active';


-- ============================================================
-- 5. ONLY ONE ACTIVE VEHICLE PER DRIVER
-- ============================================================

CREATE UNIQUE INDEX
idx_vehicle_driver_assignments_active_driver
ON public.vehicle_driver_assignments(driver_id)
WHERE status = 'active';


-- ============================================================
-- 6. SUPPORTING INDEXES
-- ============================================================

CREATE INDEX
idx_drivers_company_id
ON public.drivers(company_id);


CREATE INDEX
idx_devices_company_id
ON public.devices(company_id);


CREATE INDEX
idx_devices_vehicle_id
ON public.devices(vehicle_id);


CREATE INDEX
idx_vehicle_driver_assignments_company_id
ON public.vehicle_driver_assignments(company_id);


CREATE INDEX
idx_vehicle_driver_assignments_vehicle_id
ON public.vehicle_driver_assignments(vehicle_id);


CREATE INDEX
idx_vehicle_driver_assignments_driver_id
ON public.vehicle_driver_assignments(driver_id);


-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
--
-- 1. Existing tables public.companies, public.profiles and
--    public.vehicles are preserved.
--
-- 2. Existing public.vehicles.device_id TEXT is NOT removed,
--    renamed or converted.
--
-- 3. public.devices becomes the proper relational tracker
--    registry progressively.
--
-- 4. IMEI is the technical Teltonika identifier.
--
-- 5. Device model is intentionally NOT restricted with a CHECK.
--    FMC125 / FMC150 / FMC650 are current targets, but the
--    schema remains extensible.
--
-- 6. No CAN mapping is defined here.
--
-- 7. No arbitrary CHECK is added to public.vehicles.status.
--
-- 8. Composite tenant-safe foreign keys prevent references
--    across different companies.
--
-- ============================================================
-- END OF FILE
-- ============================================================