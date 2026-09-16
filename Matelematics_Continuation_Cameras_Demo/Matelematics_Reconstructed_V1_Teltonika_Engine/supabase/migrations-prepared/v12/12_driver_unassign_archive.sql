create or replace function public.unassign_driver(p_driver_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
  v_assignment_id uuid;
begin
  select company_id into v_company_id from public.drivers where id = p_driver_id and status = 'active';
  if v_company_id is null then raise exception 'DRIVER_NOT_ACCESSIBLE'; end if;
  if not public.can_manage_company(v_company_id) then raise exception 'FORBIDDEN'; end if;

  select id into v_assignment_id
  from public.vehicle_driver_assignments
  where driver_id = p_driver_id and company_id = v_company_id and status = 'active' and unassigned_at is null
  for update;
  if v_assignment_id is null then raise exception 'NO_ACTIVE_ASSIGNMENT'; end if;

  update public.vehicle_driver_assignments
  set status = 'inactive', unassigned_at = now()
  where id = v_assignment_id;
  return p_driver_id;
end;
$$;

create or replace function public.archive_driver(p_driver_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id into v_company_id from public.drivers where id = p_driver_id and status = 'active' for update;
  if v_company_id is null then raise exception 'DRIVER_NOT_ACCESSIBLE'; end if;
  if not public.can_manage_company(v_company_id) then raise exception 'FORBIDDEN'; end if;

  update public.vehicle_driver_assignments
  set status = 'inactive', unassigned_at = coalesce(unassigned_at, now())
  where driver_id = p_driver_id and company_id = v_company_id and status = 'active' and unassigned_at is null;

  update public.drivers set status = 'inactive', updated_at = now() where id = p_driver_id;
  return p_driver_id;
end;
$$;

revoke execute on function public.unassign_driver(uuid) from public;
revoke execute on function public.archive_driver(uuid) from public;
grant execute on function public.unassign_driver(uuid) to authenticated;
grant execute on function public.archive_driver(uuid) to authenticated;
grant update on public.drivers to authenticated;
grant update on public.vehicle_driver_assignments to authenticated;
