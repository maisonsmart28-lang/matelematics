-- STEP 8G-7
-- Backend scheduler for maintenance & compliance reminders.
--
-- Runs once per hour at minute 15.
-- The job executes as PostgreSQL, so the notification engine
-- remains inaccessible directly to browser/authenticated users.

create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job bigint;
begin
  select jobid
    into existing_job
    from cron.job
   where jobname = 'matelematics-maintenance-compliance-reminders'
   limit 1;

  -- Make the migration idempotent:
  -- remove an existing job with the same name before recreating it.
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'matelematics-maintenance-compliance-reminders',
    '15 * * * *',
    $job$
      select *
      from public.generate_maintenance_compliance_notifications();
    $job$
  );
end
$$;