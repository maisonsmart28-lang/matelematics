-- ============================================================
-- MATELEMATICS
-- P1 / STEP 6D - ALERT / DIAGNOSTIC TENANT INTEGRITY
--
-- Defense in depth for trusted backend writes that use service_role.
-- RLS protects authenticated reads, but service_role bypasses RLS.
-- These triggers prevent a row from carrying a vehicle_id that belongs
-- to a different company_id.
--
-- Scope used by alerts / diagnostics:
--   - devices
--   - telemetry
--   - alerts
--   - positions
--
-- Existing rows are NOT rewritten by this migration. Read-only validation
-- queries at the end identify any historical mismatch that must be reviewed.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_vehicle_company_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION
      'Matelematics tenant integrity: company_id is required when vehicle_id is set';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles v
    WHERE v.id = NEW.vehicle_id
      AND v.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION
      'Matelematics tenant integrity: vehicle % does not belong to company %',
      NEW.vehicle_id,
      NEW.company_id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION public.enforce_vehicle_company_integrity()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_devices_vehicle_company_integrity
ON public.devices;
CREATE TRIGGER trg_devices_vehicle_company_integrity
BEFORE INSERT OR UPDATE OF company_id, vehicle_id
ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.enforce_vehicle_company_integrity();

DROP TRIGGER IF EXISTS trg_telemetry_vehicle_company_integrity
ON public.telemetry;
CREATE TRIGGER trg_telemetry_vehicle_company_integrity
BEFORE INSERT OR UPDATE OF company_id, vehicle_id
ON public.telemetry
FOR EACH ROW
EXECUTE FUNCTION public.enforce_vehicle_company_integrity();

DROP TRIGGER IF EXISTS trg_alerts_vehicle_company_integrity
ON public.alerts;
CREATE TRIGGER trg_alerts_vehicle_company_integrity
BEFORE INSERT OR UPDATE OF company_id, vehicle_id
ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.enforce_vehicle_company_integrity();

DROP TRIGGER IF EXISTS trg_positions_vehicle_company_integrity
ON public.positions;
CREATE TRIGGER trg_positions_vehicle_company_integrity
BEFORE INSERT OR UPDATE OF company_id, vehicle_id
ON public.positions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_vehicle_company_integrity();

COMMIT;

-- ============================================================
-- POST-MIGRATION VALIDATION - READ ONLY
-- Expected: every query returns 0 rows.
-- ============================================================

SELECT
  'devices' AS source_table,
  d.id,
  d.company_id,
  d.vehicle_id,
  v.company_id AS vehicle_company_id
FROM public.devices d
JOIN public.vehicles v
  ON v.id = d.vehicle_id
WHERE d.vehicle_id IS NOT NULL
  AND d.company_id IS DISTINCT FROM v.company_id;

SELECT
  'telemetry' AS source_table,
  t.id,
  t.company_id,
  t.vehicle_id,
  v.company_id AS vehicle_company_id
FROM public.telemetry t
JOIN public.vehicles v
  ON v.id = t.vehicle_id
WHERE t.vehicle_id IS NOT NULL
  AND t.company_id IS DISTINCT FROM v.company_id;

SELECT
  'alerts' AS source_table,
  a.id,
  a.company_id,
  a.vehicle_id,
  v.company_id AS vehicle_company_id
FROM public.alerts a
JOIN public.vehicles v
  ON v.id = a.vehicle_id
WHERE a.vehicle_id IS NOT NULL
  AND a.company_id IS DISTINCT FROM v.company_id;

SELECT
  'positions' AS source_table,
  p.id,
  p.company_id,
  p.vehicle_id,
  v.company_id AS vehicle_company_id
FROM public.positions p
JOIN public.vehicles v
  ON v.id = p.vehicle_id
WHERE p.vehicle_id IS NOT NULL
  AND p.company_id IS DISTINCT FROM v.company_id;
