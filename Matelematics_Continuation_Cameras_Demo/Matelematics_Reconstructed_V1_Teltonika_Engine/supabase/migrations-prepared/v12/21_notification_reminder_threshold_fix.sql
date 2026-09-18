-- STEP 8G-7
-- Fix reminder threshold selection.
--
-- Date reminders:
--   Trigger only on the exact configured threshold
--   (J-30, J-15, J-7, J-1, J0, etc.).
--
-- Odometer reminders:
--   Select the closest applicable configured threshold
--   instead of the largest one.

do $migration$
declare
  src text;
begin
  select pg_get_functiondef(
    'public.generate_maintenance_compliance_notifications()'::regprocedure
  )
  into src;

  if src is null then
    raise exception
      'Function public.generate_maintenance_compliance_notifications() not found';
  end if;

  -- ============================================================
  -- MAINTENANCE DATE
  -- OLD:
  --   max(x)
  --   due_date >= current_date
  --   due_date <= current_date + x
  --
  -- NEW:
  --   min(x)
  --   exact configured threshold
  -- ============================================================

  src := replace(
    src,
    $old$
      select max(x)::integer as days_before_value
      from unnest(c.days_before) as x
      where c.due_date >= current_date
        and c.due_date <= current_date + x
$old$,
    $new$
      select min(x)::integer as days_before_value
      from unnest(c.days_before) as x
      where c.due_date = current_date + x
$new$
  );

  -- ============================================================
  -- ODOMETER
  -- Choose the nearest applicable threshold.
  -- Example:
  --   km_before = [5000,1000,500]
  --   400 km remaining -> 500, not 5000.
  -- ============================================================

  src := replace(
    src,
    $old$
      select max(x)::numeric as km_before_value
      from unnest(c.km_before) as x
      where c.odometer_km <= c.due_odometer_km
        and c.due_odometer_km - c.odometer_km <= x
$old$,
    $new$
      select min(x)::numeric as km_before_value
      from unnest(c.km_before) as x
      where c.odometer_km <= c.due_odometer_km
        and c.due_odometer_km - c.odometer_km <= x
$new$
  );

  -- ============================================================
  -- COMPLIANCE DATE
  -- Same exact-threshold correction as maintenance.
  -- ============================================================

  src := replace(
    src,
    $old$
      select max(x)::integer as days_before_value
      from unnest(c.days_before) as x
      where c.expires_on >= current_date
        and c.expires_on <= current_date + x
$old$,
    $new$
      select min(x)::integer as days_before_value
      from unnest(c.days_before) as x
      where c.expires_on = current_date + x
$new$
  );

  execute src;
end;
$migration$;

grant execute
on function public.generate_maintenance_compliance_notifications()
to authenticated;