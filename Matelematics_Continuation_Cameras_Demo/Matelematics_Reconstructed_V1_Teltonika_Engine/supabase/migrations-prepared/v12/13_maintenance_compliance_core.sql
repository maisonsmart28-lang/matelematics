create table public.vehicle_maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  vehicle_id uuid not null references public.vehicles(id),
  category text not null check (category in ('maintenance','repair','inspection','tyres','battery','safety','other')),
  title text not null,
  description text,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled','archived')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  due_date date,
  due_odometer_km numeric,
  due_engine_hours numeric,
  started_at timestamptz,
  completed_at timestamptz,
  odometer_at_completion_km numeric,
  cost_amount numeric check (cost_amount is null or cost_amount >= 0),
  currency text not null default 'MAD',
  provider_name text,
  invoice_reference text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_date is not null or due_odometer_km is not null or due_engine_hours is not null or status in ('completed','cancelled','archived'))
);

create table public.vehicle_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  vehicle_id uuid not null references public.vehicles(id),
  document_type text not null,
  title text not null,
  document_number text,
  issuer text,
  valid_from date,
  expires_on date not null,
  amount numeric check (amount is null or amount >= 0),
  currency text not null default 'MAD',
  storage_path text,
  status text not null default 'active' check (status in ('active','renewed','expired','cancelled','archived')),
  renewed_from_id uuid references public.vehicle_compliance_documents(id),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_from is null or expires_on >= valid_from)
);

create table public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  event_type text not null,
  days_before integer[] not null default array[30,15,7,1,0],
  km_before numeric[] not null default array[5000,1000,500]::numeric[],
  engine_hours_before numeric[] not null default '{}'::numeric[],
  repeat_overdue_days integer not null default 1 check (repeat_overdue_days >= 1),
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  browser_enabled boolean not null default false,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id,event_type)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  user_id uuid references auth.users(id),
  vehicle_id uuid references public.vehicles(id),
  source_type text not null,
  source_id uuid,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  title text not null,
  message text not null,
  due_at timestamptz,
  status text not null default 'unread' check (status in ('unread','read','acknowledged','resolved')),
  read_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index vehicle_maintenance_records_company_vehicle_idx on public.vehicle_maintenance_records(company_id,vehicle_id,created_at desc);
create index vehicle_maintenance_records_due_date_idx on public.vehicle_maintenance_records(company_id,due_date) where status in ('planned','in_progress');
create index vehicle_compliance_documents_expiry_idx on public.vehicle_compliance_documents(company_id,expires_on) where status='active';
create index notifications_user_status_idx on public.notifications(user_id,status,created_at desc);
create index notifications_company_due_idx on public.notifications(company_id,due_at) where status in ('unread','read','acknowledged');

alter table public.vehicle_maintenance_records enable row level security;
alter table public.vehicle_compliance_documents enable row level security;
alter table public.notification_rules enable row level security;
alter table public.notifications enable row level security;

create policy maintenance_select on public.vehicle_maintenance_records for select to authenticated using (public.can_access_company(company_id));
create policy maintenance_manage on public.vehicle_maintenance_records for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy compliance_select on public.vehicle_compliance_documents for select to authenticated using (public.can_access_company(company_id));
create policy compliance_manage on public.vehicle_compliance_documents for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy notification_rules_select on public.notification_rules for select to authenticated using (public.can_access_company(company_id));
create policy notification_rules_manage on public.notification_rules for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy notifications_select on public.notifications for select to authenticated using (public.can_access_company(company_id) and (user_id is null or user_id=auth.uid() or public.can_manage_company(company_id)));
create policy notifications_manage on public.notifications for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));

grant select,insert,update on public.vehicle_maintenance_records to authenticated;
grant select,insert,update on public.vehicle_compliance_documents to authenticated;
grant select,insert,update on public.notification_rules to authenticated;
grant select,insert,update on public.notifications to authenticated;
