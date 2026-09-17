-- Allow lifecycle RPCs (SECURITY INVOKER) to change only the vehicle operational status.
-- Row-level policies still enforce can_manage_company(company_id).
grant update (status) on table public.vehicles to authenticated;
