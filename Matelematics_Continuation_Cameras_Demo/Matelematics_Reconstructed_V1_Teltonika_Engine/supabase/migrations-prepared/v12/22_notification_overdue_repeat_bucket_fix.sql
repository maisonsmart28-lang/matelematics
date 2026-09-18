-- STEP 8G-7
-- Fix overdue reminder repetition.
--
-- Previous behavior generated reminders only on the exact modulo day
-- (J+7, J+14, J+21...), so a missed scheduler run could lose a reminder.
--
-- New behavior assigns every overdue day to a repeat bucket:
-- J+1..J+7   -> bucket 0
-- J+8..J+14  -> bucket 1
-- J+15..J+21 -> bucket 2
--
-- The active dedupe index guarantees only one active notification
-- per source and bucket.

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
  -- MAINTENANCE OVERDUE
  -- ============================================================

  src := replace(
    src,
    '((current_date - m.due_date) / r.repeat_overdue_days)::text',
    '((current_date - m.due_date - 1) / r.repeat_overdue_days)::text'
  );

  src := replace(
    src,
    E'\n    and (current_date - m.due_date) % r.repeat_overdue_days = 0',
    ''
  );

  -- ============================================================
  -- COMPLIANCE OVERDUE
  -- ============================================================

  src := replace(
    src,
    '((current_date - d.expires_on) / r.repeat_overdue_days)::text',
    '((current_date - d.expires_on - 1) / r.repeat_overdue_days)::text'
  );

  src := replace(
    src,
    E'\n    and (current_date - d.expires_on) % r.repeat_overdue_days = 0',
    ''
  );

  execute src;
end;
$migration$;

grant execute
on function public.generate_maintenance_compliance_notifications()
to authenticated;