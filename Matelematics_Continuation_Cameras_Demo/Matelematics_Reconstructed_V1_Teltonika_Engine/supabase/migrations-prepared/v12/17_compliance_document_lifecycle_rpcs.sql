-- 8G-5: secure compliance-document lifecycle.
-- Renewal preserves the previous row and creates a new active cycle linked to it.

create or replace function public.renew_vehicle_compliance_document(
  p_document_id uuid,
  p_expires_on date,
  p_document_number text default null,
  p_issuer text default null,
  p_valid_from date default null,
  p_amount numeric default null,
  p_notes text default null
) returns uuid
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_old public.vehicle_compliance_documents%rowtype;
  v_new_id uuid;
begin
  select * into v_old
  from public.vehicle_compliance_documents
  where id=p_document_id
  for update;

  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  if not public.can_manage_company(v_old.company_id) then raise exception 'FORBIDDEN'; end if;
  if v_old.status <> 'active' then raise exception 'INVALID_STATUS'; end if;
  if p_expires_on is null then raise exception 'EXPIRY_REQUIRED'; end if;
  if p_valid_from is not null and p_expires_on < p_valid_from then raise exception 'INVALID_DATE_RANGE'; end if;
  if p_amount is not null and p_amount < 0 then raise exception 'INVALID_AMOUNT'; end if;

  update public.vehicle_compliance_documents
  set status='renewed', updated_at=now()
  where id=v_old.id;

  insert into public.vehicle_compliance_documents(
    company_id,vehicle_id,document_type,title,document_number,issuer,
    valid_from,expires_on,amount,currency,storage_path,status,
    renewed_from_id,notes,created_by
  ) values (
    v_old.company_id,v_old.vehicle_id,v_old.document_type,v_old.title,
    coalesce(nullif(trim(p_document_number),''),v_old.document_number),
    coalesce(nullif(trim(p_issuer),''),v_old.issuer),
    p_valid_from,p_expires_on,p_amount,v_old.currency,null,'active',
    v_old.id,nullif(trim(p_notes),''),auth.uid()
  ) returning id into v_new_id;

  return v_new_id;
end
$$;

create or replace function public.cancel_vehicle_compliance_document(p_document_id uuid)
returns void
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_company_id uuid;
  v_status text;
begin
  select company_id,status into v_company_id,v_status
  from public.vehicle_compliance_documents
  where id=p_document_id
  for update;

  if not found then raise exception 'DOCUMENT_NOT_FOUND'; end if;
  if not public.can_manage_company(v_company_id) then raise exception 'FORBIDDEN'; end if;
  if v_status <> 'active' then raise exception 'INVALID_STATUS'; end if;

  update public.vehicle_compliance_documents
  set status='cancelled',updated_at=now()
  where id=p_document_id;
end
$$;

grant execute on function public.renew_vehicle_compliance_document(uuid,date,text,text,date,numeric,text) to authenticated;
grant execute on function public.cancel_vehicle_compliance_document(uuid) to authenticated;
