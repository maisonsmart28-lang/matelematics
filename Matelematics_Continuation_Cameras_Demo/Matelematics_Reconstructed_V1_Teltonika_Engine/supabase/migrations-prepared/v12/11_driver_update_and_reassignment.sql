grant update on table public.drivers to authenticated;
grant update on table public.vehicle_driver_assignments to authenticated;

create or replace function public.update_driver_with_assignment(
  p_driver_id uuid,
  p_full_name text,
  p_license_number text default null,
  p_phone text default null,
  p_vehicle_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_current_vehicle_id uuid;
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if v_name = '' then raise exception 'DRIVER_NAME_REQUIRED'; end if;

  select d.company_id into v_company_id
  from public.drivers d
  where d.id = p_driver_id and d.status = 'active';

  if v_company_id is null then raise exception 'DRIVER_NOT_ACCESSIBLE'; end if;
  if not public.can_manage_company(v_company_id) then raise exception 'FORBIDDEN'; end if;
  if p_vehicle_id is null then raise exception 'VEHICLE_REQUIRED'; end if;

  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id
      and v.company_id = v_company_id
      and coalesce(v.status, 'active') <> 'inactive'
  ) then raise exception 'VEHICLE_NOT_ACCESSIBLE'; end if;

  select a.vehicle_id into v_current_vehicle_id
  from public.vehicle_driver_assignments a
  where a.driver_id = p_driver_id and a.status = 'active' and a.unassigned_at is null
  order by a.assigned_at desc limit 1;

  if exists (
    select 1 from public.vehicle_driver_assignments a
    where a.vehicle_id = p_vehicle_id
      and a.driver_id <> p_driver_id
      and a.status = 'active'
      and a.unassigned_at is null
  ) then raise exception 'VEHICLE_ALREADY_ASSIGNED'; end if;

  update public.drivers
  set full_name = v_name,
      license_number = nullif(btrim(coalesce(p_license_number, '')), ''),
      phone = nullif(btrim(coalesce(p_phone, '')), ''),
      updated_at = now()
  where id = p_driver_id;

  if v_current_vehicle_id is distinct from p_vehicle_id then
    update public.vehicle_driver_assignments
    set unassigned_at = now(), status = 'inactive'
    where driver_id = p_driver_id and status = 'active' and unassigned_at is null;

    insert into public.vehicle_driver_assignments (company_id, vehicle_id, driver_id, assigned_at, status)
    values (v_company_id, p_vehicle_id, p_driver_id, now(), 'active');
  end if;

  return p_driver_id;
end;
$$;

revoke all on function public.update_driver_with_assignment(uuid,text,text,text,uuid) from public;
grant execute on function public.update_driver_with_assignment(uuid,text,text,text,uuid) to authenticated;
