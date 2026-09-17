-- 8G-6: private compliance document attachments
-- Bucket "vehicle-compliance" is created through the Supabase Storage API/Dashboard, not by writing storage metadata directly.

drop policy if exists "vehicle_compliance_files_select" on storage.objects;
create policy "vehicle_compliance_files_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'vehicle-compliance'
  and (storage.foldername(name))[1] is not null
  and public.can_access_company(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "vehicle_compliance_files_insert" on storage.objects;
create policy "vehicle_compliance_files_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vehicle-compliance'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "vehicle_compliance_files_update" on storage.objects;
create policy "vehicle_compliance_files_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vehicle-compliance'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'vehicle-compliance'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "vehicle_compliance_files_delete" on storage.objects;
create policy "vehicle_compliance_files_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vehicle-compliance'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
);

create or replace function public.set_vehicle_compliance_document_storage_path(
  p_document_id uuid,
  p_storage_path text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_doc public.vehicle_compliance_documents%rowtype;
  v_company_prefix text;
begin
  select * into v_doc
  from public.vehicle_compliance_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;
  if not public.can_manage_company(v_doc.company_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_storage_path is null or btrim(p_storage_path) = '' then
    raise exception 'STORAGE_PATH_REQUIRED';
  end if;

  v_company_prefix := v_doc.company_id::text || '/' || v_doc.id::text || '/';
  if left(p_storage_path, length(v_company_prefix)) <> v_company_prefix then
    raise exception 'INVALID_STORAGE_PATH';
  end if;

  update public.vehicle_compliance_documents
  set storage_path = p_storage_path, updated_at = now()
  where id = p_document_id;
end;
$$;

create or replace function public.clear_vehicle_compliance_document_storage_path(
  p_document_id uuid
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_doc public.vehicle_compliance_documents%rowtype;
  v_old_path text;
begin
  select * into v_doc
  from public.vehicle_compliance_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;
  if not public.can_manage_company(v_doc.company_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_old_path := v_doc.storage_path;
  update public.vehicle_compliance_documents
  set storage_path = null, updated_at = now()
  where id = p_document_id;

  return v_old_path;
end;
$$;

revoke all on function public.set_vehicle_compliance_document_storage_path(uuid,text) from public, anon;
revoke all on function public.clear_vehicle_compliance_document_storage_path(uuid) from public, anon;
grant execute on function public.set_vehicle_compliance_document_storage_path(uuid,text) to authenticated;
grant execute on function public.clear_vehicle_compliance_document_storage_path(uuid) to authenticated;
