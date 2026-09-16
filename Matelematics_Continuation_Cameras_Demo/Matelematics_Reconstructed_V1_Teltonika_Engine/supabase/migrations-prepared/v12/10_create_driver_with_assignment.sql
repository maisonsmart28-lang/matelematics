create or replace function public.create_driver_with_assignment(
  p_company_id uuid,
  p_vehicle_id uuid,
  p_full_name text,
  p_license_number text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if v_name = '' then
    raise exception 'DRIVER_NAME_REQUIRED';
  end if;

  if not public.can_manage_company(p_company_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not exists (
    select 1 from public.vehicles v
    where v.id = p_vehicle_id
      and v.company_id = p_company_id
      and coalesce(v.status, 'active') <> 'inactive'
  ) then
    raise exception 'VEHICLE_NOT_ACCESSIBLE';
  end if;

  if exists (
    select 1 from public.vehicle_driver_assignments a
    where a.vehicle_id = p_vehicle_id
      and a.status = 'active'
      and a.unassigned_at is null
  ) then
    raise exception 'VEHICLE_ALREADY_ASSIGNED';
  end if;

  insert into public.drivers (company_id, full_name, license_number, phone, status)
  values (
    p_company_id,
    v_name,
    nullif(btrim(coalesce(p_license_number, '')), ''),
    nullif(btrim(coalesce(p_phone, '')), ''),
    'active'
  )
  returning id into v_driver_id;

  insert into public.vehicle_driver_assignments (
    company_id, vehicle_id, driver_id, assigned_at, status
  ) values (
    p_company_id, p_vehicle_id, v_driver_id, now(), 'active'
  );

  return v_driver_id;
end;
$$;

revoke all on function public.create_driver_with_assignment(uuid,uuid,text,text,text) from public;
grant execute on function public.create_driver_with_assignment(uuid,uuid,text,text,text) to authenticated;
