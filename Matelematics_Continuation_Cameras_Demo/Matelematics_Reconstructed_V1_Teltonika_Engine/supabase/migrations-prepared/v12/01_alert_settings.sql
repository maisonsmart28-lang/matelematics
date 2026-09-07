-- ============================================================
-- MATELEMATICS
-- ALERT ENGINE V1.2A
-- Configurable thresholds and severities
-- ============================================================

create table if not exists public.alert_settings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  vehicle_id uuid null
    references public.vehicles(id)
    on delete cascade,

  rule_key text not null,

  enabled boolean not null default true,

  threshold_value numeric null,
  threshold_secondary numeric null,

  severity text null
    check (
      severity is null
      or severity in (
        'critical',
        'high',
        'medium',
        'info'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create unique index if not exists
  ux_alert_settings_scope_rule
on public.alert_settings (
  company_id,
  coalesce(
    vehicle_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  ),
  rule_key
);


create index if not exists
  ix_alert_settings_company
on public.alert_settings (
  company_id
);


create index if not exists
  ix_alert_settings_vehicle
on public.alert_settings (
  vehicle_id
)
where vehicle_id is not null;


comment on table public.alert_settings is
  'Matelematics alert configuration overrides. Vehicle overrides company, company overrides platform defaults.';


comment on column public.alert_settings.threshold_value is
  'Primary numeric threshold for the alert rule.';


comment on column public.alert_settings.threshold_secondary is
  'Secondary numeric threshold when the rule requires one.';


comment on column public.alert_settings.severity is
  'Optional severity override: critical/high/medium/info.';