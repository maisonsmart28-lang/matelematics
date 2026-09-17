-- 8G-4: lifecycle RPCs are SECURITY INVOKER and therefore need the caller
-- to hold the underlying column privilege. RLS vehicles_manage_scope remains
-- the authorization boundary (can_manage_company(company_id)).
-- Grant only the status column, not unrestricted UPDATE on vehicles.
grant update (status) on table public.vehicles to authenticated;
