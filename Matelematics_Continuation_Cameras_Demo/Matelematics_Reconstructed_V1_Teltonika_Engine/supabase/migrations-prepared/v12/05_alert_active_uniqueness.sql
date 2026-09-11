BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.alerts
    WHERE status = 'active'
      AND vehicle_id IS NOT NULL
    GROUP BY company_id, vehicle_id, alert_type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce active alert uniqueness: duplicate active vehicle alerts exist';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.serialize_active_vehicle_alert_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  IF NEW.status <> 'active' OR NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      NEW.company_id::text || ':' || NEW.vehicle_id::text || ':' || NEW.alert_type,
      0
    )
  );

  IF EXISTS (
    SELECT 1
    FROM public.alerts a
    WHERE a.company_id = NEW.company_id
      AND a.vehicle_id = NEW.vehicle_id
      AND a.alert_type = NEW.alert_type
      AND a.status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL
ON FUNCTION public.serialize_active_vehicle_alert_insert()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_alerts_serialize_active_insert
ON public.alerts;

CREATE TRIGGER trg_alerts_serialize_active_insert
BEFORE INSERT
ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.serialize_active_vehicle_alert_insert();

CREATE UNIQUE INDEX IF NOT EXISTS alerts_one_active_per_type_vehicle_idx
ON public.alerts (company_id, vehicle_id, alert_type)
WHERE status = 'active'
  AND vehicle_id IS NOT NULL;

COMMIT;
