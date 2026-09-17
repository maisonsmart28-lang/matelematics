create or replace function public.start_vehicle_maintenance_record(p_record_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.vehicle_maintenance_records%rowtype;
begin
  select * into r from public.vehicle_maintenance_records where id=p_record_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if not public.can_manage_company(r.company_id) then raise exception 'FORBIDDEN'; end if;
  if r.status <> 'planned' then raise exception 'INVALID_STATUS'; end if;
  update public.vehicle_maintenance_records set status='in_progress', started_at=coalesce(started_at,now()), updated_at=now() where id=p_record_id;
  update public.vehicles set status='maintenance' where id=r.vehicle_id and company_id=r.company_id;
  return p_record_id;
end;$$;

create or replace function public.complete_vehicle_maintenance_record(p_record_id uuid,p_odometer_at_completion_km numeric default null,p_cost_amount numeric default null,p_notes text default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.vehicle_maintenance_records%rowtype;
  remaining integer;
begin
  select * into r from public.vehicle_maintenance_records where id=p_record_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if not public.can_manage_company(r.company_id) then raise exception 'FORBIDDEN'; end if;
  if r.status not in ('planned','in_progress') then raise exception 'INVALID_STATUS'; end if;
  if p_odometer_at_completion_km is not null and p_odometer_at_completion_km < 0 then raise exception 'INVALID_ODOMETER'; end if;
  if p_cost_amount is not null and p_cost_amount < 0 then raise exception 'INVALID_COST'; end if;
  update public.vehicle_maintenance_records set status='completed', started_at=coalesce(started_at,now()), completed_at=now(), odometer_at_completion_km=coalesce(p_odometer_at_completion_km,odometer_at_completion_km), cost_amount=coalesce(p_cost_amount,cost_amount), notes=coalesce(nullif(btrim(p_notes),''),notes), updated_at=now() where id=p_record_id;
  select count(*) into remaining from public.vehicle_maintenance_records where vehicle_id=r.vehicle_id and id<>p_record_id and status='in_progress';
  if remaining=0 then update public.vehicles set status='active' where id=r.vehicle_id and company_id=r.company_id and status='maintenance'; end if;
  return p_record_id;
end;$$;

create or replace function public.cancel_vehicle_maintenance_record(p_record_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  r public.vehicle_maintenance_records%rowtype;
  remaining integer;
begin
  select * into r from public.vehicle_maintenance_records where id=p_record_id for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
  if not public.can_manage_company(r.company_id) then raise exception 'FORBIDDEN'; end if;
  if r.status not in ('planned','in_progress') then raise exception 'INVALID_STATUS'; end if;
  update public.vehicle_maintenance_records set status='cancelled', updated_at=now() where id=p_record_id;
  select count(*) into remaining from public.vehicle_maintenance_records where vehicle_id=r.vehicle_id and id<>p_record_id and status='in_progress';
  if remaining=0 then update public.vehicles set status='active' where id=r.vehicle_id and company_id=r.company_id and status='maintenance'; end if;
  return p_record_id;
end;$$;

grant execute on function public.start_vehicle_maintenance_record(uuid) to authenticated;
grant execute on function public.complete_vehicle_maintenance_record(uuid,numeric,numeric,text) to authenticated;
grant execute on function public.cancel_vehicle_maintenance_record(uuid) to authenticated;
