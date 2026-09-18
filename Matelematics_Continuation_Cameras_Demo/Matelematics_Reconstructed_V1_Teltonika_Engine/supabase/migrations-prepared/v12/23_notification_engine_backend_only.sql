-- STEP 8G-7
-- Security hardening: reminder engine is backend-only.
--
-- The global notification generator must not be executable
-- directly by browser/authenticated users.
--
-- Execution is reserved to trusted backend roles:
--   - postgres
--   - service_role

revoke execute
on function public.generate_maintenance_compliance_notifications()
from public, anon, authenticated;

grant execute
on function public.generate_maintenance_compliance_notifications()
to service_role, postgres;