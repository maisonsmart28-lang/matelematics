BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.alerts
    WHERE status = 'active'
    GROUP BY company_id, vehicle_id, alert_type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce active alert uniqueness: duplicate active alerts exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS alerts_one_active_per_type_vehicle_idx
ON public.alerts (company_id, vehicle_id, alert_type)
WHERE status = 'active';

COMMIT;
