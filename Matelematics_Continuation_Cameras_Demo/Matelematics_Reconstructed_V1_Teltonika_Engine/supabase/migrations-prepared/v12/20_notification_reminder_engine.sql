-- STEP 8G-7
-- Base maintenance & compliance notification reminder engine.

alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_active_dedupe_key_uidx
  on public.notifications (company_id, dedupe_key)
  where dedupe_key is not null
    and status in ('unread', 'read', 'acknowledged');

create or replace function public.generate_maintenance_compliance_notifications()
returns table(created_count integer, resolved_count integer)
language plpgsql
set search_path to 'public'
as $function$
declare
  v_created integer := 0;
  v_resolved integer := 0;
  v_count integer := 0;
begin
  -- Resolve notifications whose source is no longer active.
  update public.notifications n
     set status = 'resolved',
         resolved_at = coalesce(n.resolved_at, now())
   where n.status in ('unread', 'read', 'acknowledged')
     and (
       (
         n.source_type = 'maintenance'
         and not exists (
           select 1
             from public.vehicle_maintenance_records m
            where m.id = n.source_id
              and m.company_id = n.company_id
              and m.status in ('planned', 'in_progress')
         )
       )
       or
       (
         n.source_type = 'compliance'
         and not exists (
           select 1
             from public.vehicle_compliance_documents d
            where d.id = n.source_id
              and d.company_id = n.company_id
              and d.status = 'active'
         )
       )
     );

  get diagnostics v_resolved = row_count;

  -- ============================================================
  -- MAINTENANCE: DATE REMINDERS
  -- Base 8G-7 implementation.
  -- Threshold-selection semantics are corrected by migration 21.
  -- ============================================================
  with candidates as (
    select
      m.id as source_id,
      m.company_id,
      m.vehicle_id,
      m.title,
      m.due_date,
      greatest(0, (m.due_date - current_date))::integer as days_remaining,
      r.days_before,
      r.repeat_overdue_days
    from public.vehicle_maintenance_records m
    join public.notification_rules r
      on r.company_id = m.company_id
     and r.event_type = 'maintenance_due'
     and r.enabled = true
     and r.in_app_enabled = true
    where m.status in ('planned', 'in_progress')
      and m.due_date is not null
  ),
  due_candidates as (
    select c.*, threshold.days_before_value
    from candidates c
    cross join lateral (
      select max(x)::integer as days_before_value
      from unnest(c.days_before) as x
      where c.due_date >= current_date
        and c.due_date <= current_date + x
    ) threshold
    where threshold.days_before_value is not null
  )
  insert into public.notifications (
    company_id,
    vehicle_id,
    source_type,
    source_id,
    event_type,
    severity,
    title,
    message,
    due_at,
    status,
    dedupe_key
  )
  select
    c.company_id,
    c.vehicle_id,
    'maintenance',
    c.source_id,
    'maintenance_due',
    case
      when c.due_date <= current_date then 'critical'
      when c.due_date <= current_date + 7 then 'warning'
      else 'info'
    end,
    'Maintenance à prévoir',
    case
      when c.due_date = current_date
        then c.title || ' arrive à échéance aujourd''hui.'
      else
        c.title || ' arrive à échéance le '
        || to_char(c.due_date, 'DD/MM/YYYY') || '.'
    end,
    c.due_date::timestamptz,
    'unread',
    'maintenance:date:'
      || c.source_id::text
      || ':'
      || c.days_before_value::text
  from due_candidates c
  on conflict (company_id, dedupe_key)
    where dedupe_key is not null
      and status in ('unread', 'read', 'acknowledged')
  do nothing;

  get diagnostics v_count = row_count;
  v_created := v_created + v_count;

  -- ============================================================
  -- MAINTENANCE: DATE OVERDUE
  -- Repeat-bucket semantics are corrected by a later migration.
  -- ============================================================
  insert into public.notifications (
    company_id,
    vehicle_id,
    source_type,
    source_id,
    event_type,
    severity,
    title,
    message,
    due_at,
    status,
    dedupe_key
  )
  select
    m.company_id,
    m.vehicle_id,
    'maintenance',
    m.id,
    'maintenance_overdue',
    'critical',
    'Maintenance en retard',
    m.title
      || ' est en retard depuis '
      || (current_date - m.due_date)::text
      || ' jour(s).',
    m.due_date::timestamptz,
    'unread',
    'maintenance:date-overdue:'
      || m.id::text
      || ':'
      || ((current_date - m.due_date) / r.repeat_overdue_days)::text
  from public.vehicle_maintenance_records m
  join public.notification_rules r
    on r.company_id = m.company_id
   and r.event_type = 'maintenance_due'
   and r.enabled = true
   and r.in_app_enabled = true
  where m.status in ('planned', 'in_progress')
    and m.due_date is not null
    and m.due_date < current_date
    and (current_date - m.due_date) % r.repeat_overdue_days = 0
  on conflict (company_id, dedupe_key)
    where dedupe_key is not null
      and status in ('unread', 'read', 'acknowledged')
  do nothing;

  get diagnostics v_count = row_count;
  v_created := v_created + v_count;

  -- ============================================================
  -- MAINTENANCE: ODOMETER REMINDERS
  -- ============================================================
  with latest_odometer as (
    select distinct on (t.company_id, t.vehicle_id)
      t.company_id,
      t.vehicle_id,
      case
        when jsonb_typeof(t.can_payload -> 'odometer_km') = 'number'
          then (t.can_payload ->> 'odometer_km')::numeric
        else null
      end as odometer_km
    from public.telemetry t
    where t.can_payload ? 'odometer_km'
    order by t.company_id, t.vehicle_id, t.recorded_at desc
  ),
  candidates as (
    select
      m.id as source_id,
      m.company_id,
      m.vehicle_id,
      m.title,
      m.due_odometer_km,
      o.odometer_km,
      r.km_before
    from public.vehicle_maintenance_records m
    join public.notification_rules r
      on r.company_id = m.company_id
     and r.event_type = 'maintenance_due'
     and r.enabled = true
     and r.in_app_enabled = true
    join latest_odometer o
      on o.company_id = m.company_id
     and o.vehicle_id = m.vehicle_id
    where m.status in ('planned', 'in_progress')
      and m.due_odometer_km is not null
      and o.odometer_km is not null
  ),
  due_candidates as (
    select c.*, threshold.km_before_value
    from candidates c
    cross join lateral (
      select max(x)::numeric as km_before_value
      from unnest(c.km_before) as x
      where c.odometer_km <= c.due_odometer_km
        and c.due_odometer_km - c.odometer_km <= x
    ) threshold
    where threshold.km_before_value is not null
  )
  insert into public.notifications (
    company_id,
    vehicle_id,
    source_type,
    source_id,
    event_type,
    severity,
    title,
    message,
    status,
    dedupe_key
  )
  select
    c.company_id,
    c.vehicle_id,
    'maintenance',
    c.source_id,
    'maintenance_odometer_due',
    case
      when c.odometer_km >= c.due_odometer_km then 'critical'
      when c.due_odometer_km - c.odometer_km <= 1000 then 'warning'
      else 'info'
    end,
    'Maintenance kilométrique à prévoir',
    c.title
      || ' est prévue à '
      || round(c.due_odometer_km)::text
      || ' km. Kilométrage actuel : '
      || round(c.odometer_km)::text
      || ' km.',
    'unread',
    'maintenance:km:'
      || c.source_id::text
      || ':'
      || round(c.km_before_value)::text
  from due_candidates c
  on conflict (company_id, dedupe_key)
    where dedupe_key is not null
      and status in ('unread', 'read', 'acknowledged')
  do nothing;

  get diagnostics v_count = row_count;
  v_created := v_created + v_count;

  -- ============================================================
  -- MAINTENANCE: ODOMETER OVERDUE
  -- ============================================================
  with latest_odometer as (
    select distinct on (t.company_id, t.vehicle_id)
      t.company_id,
      t.vehicle_id,
      case
        when jsonb_typeof(t.can_payload -> 'odometer_km') = 'number'
          then (t.can_payload ->> 'odometer_km')::numeric
        else null
      end as odometer_km
    from public.telemetry t
    where t.can_payload ? 'odometer_km'
    order by t.company_id, t.vehicle_id, t.recorded_at desc
  )
  insert into public.notifications (
    company_id,
    vehicle_id,
    source_type,
    source_id,
    event_type,
    severity,
    title,
    message,
    status,
    dedupe_key
  )
  select
    m.company_id,
    m.vehicle_id,
    'maintenance',
    m.id,
    'maintenance_odometer_overdue',
    'critical',
    'Maintenance kilométrique dépassée',
    m.title
      || ' était prévue à '
      || round(m.due_odometer_km)::text
      || ' km. Kilométrage actuel : '
      || round(o.odometer_km)::text
      || ' km.',
    'unread',
    'maintenance:km-overdue:' || m.id::text
  from public.vehicle_maintenance_records m
  join public.notification_rules r
    on r.company_id = m.company_id
   and r.event_type = 'maintenance_due'
   and r.enabled = true
   and r.in_app_enabled = true
  join latest_odometer o
    on o.company_id = m.company_id
   and o.vehicle_id = m.vehicle_id
  where m.status in ('planned', 'in_progress')
    and m.due_odometer_km is not null
    and o.odometer_km > m.due_odometer_km
  on conflict (company_id, dedupe_key)
    where dedupe_key is not null
      and status in ('unread', 'read', 'acknowledged')
  do nothing;

  get diagnostics v_count = row_count;
  v_created := v_created + v_count;

  -- ============================================================
  -- COMPLIANCE: EXPIRY REMINDERS
  -- Threshold-selection semantics are corrected by migration 21.
  -- ============================================================
  with candidates as (
    select
      d.id as source_id,
      d.company_id,
      d.vehicle_id,
      d.title,
      d.expires_on,
      r.days_before
    from public.vehicle_compliance_documents d
    join public.notification_rules r
      on r.company_id = d.company_id
     and r.event_type = 'compliance_expiry'
     and r.enabled = true
     and r.in_app_enabled = true
    where d.status = 'active'
  ),
  due_candidates as (
    select c.*, threshold.days_before_value
    from candidates c
    cross join lateral (
      select max(x)::integer as days_before_value
      from unnest(c.days_before) as x
      where c.expires_on >= current_date
        and c.expires_on <= current_date + x
    ) threshold
    where threshold.days_before_value is not null
  )
  insert into public.notifications (
    company_id,
    vehicle_id,
    source_type,
    source_id,
    event_type,
    severity,
    title,
    message,
    due_at,
    status,
    dedupe_key
  )
  select
    c.company_id,
    c.vehicle_id,
    'compliance',
    c.source_id,
    'compliance_expiry',
    case
      when c.expires_on <= current_date then 'critical'
      when c.expires_on <= current_date + 7 then 'warning'
      else 'info'
    end,
    'Document à renouveler',
    case
      when c.expires_on = current_date
        then c.title || ' expire aujourd''hui.'
      else
        c.title
          || ' expire le '
          || to_char(c.expires_on, 'DD/MM/YYYY')
          || '.'
    end,
    c.expires_on::timestamptz,
    'unread',
    'compliance:date:'
      || c.source_id::text
      || ':'
      || c.days_before_value::text
  from due_candidates c
  on conflict (company_id, dedupe_key)
    where dedupe_key is not null
      and status in ('unread', 'read', 'acknowledged')
  do nothing;

  get diagnostics v_count = row_count;
  v_created := v_created + v_count;

  -- ============================================================
  -- COMPLIANCE: OVERDUE
  -- Repeat-bucket semantics are corrected by a later migration.
  -- ============================================================
  insert into public.notifications (
    company_id,
    vehicle_id,
    source_type,
    source_id,
    event_type,
    severity,
    title,
    message,
    due_at,
    status,
    dedupe_key
  )
  select
    d.company_id,
    d.vehicle_id,
    'compliance',
    d.id,
    'compliance_overdue',
    'critical',
    'Document expiré',
    d.title
      || ' est expiré depuis '
      || (current_date - d.expires_on)::text
      || ' jour(s).',
    d.expires_on::timestamptz,
    'unread',
    'compliance:date-overdue:'
      || d.id::text
      || ':'
      || ((current_date - d.expires_on) / r.repeat_overdue_days)::text
  from public.vehicle_compliance_documents d
  join public.notification_rules r
    on r.company_id = d.company_id
   and r.event_type = 'compliance_expiry'
   and r.enabled = true
   and r.in_app_enabled = true
  where d.status = 'active'
    and d.expires_on < current_date
    and (current_date - d.expires_on) % r.repeat_overdue_days = 0
  on conflict (company_id, dedupe_key)
    where dedupe_key is not null
      and status in ('unread', 'read', 'acknowledged')
  do nothing;

  get diagnostics v_count = row_count;
  v_created := v_created + v_count;

  return query
  select v_created, v_resolved;
end;
$function$;

grant execute
on function public.generate_maintenance_compliance_notifications()
to authenticated;