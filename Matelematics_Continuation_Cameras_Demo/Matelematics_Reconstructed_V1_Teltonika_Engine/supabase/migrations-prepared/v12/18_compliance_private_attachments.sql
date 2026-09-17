-- 8G-6: private compliance document attachments in Supabase Storage
-- Bucket is private; access is tenant-scoped by the first path segment (company UUID).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'compliance-documents',
  'compliance-documents',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "compliance_documents_select" on storage.objects;
create policy "compliance_documents_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'compliance-documents'
  and (storage.foldername(name))[1] is not null
  and public.can_access_company(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "compliance_documents_insert" on storage.objects;
create policy "compliance_documents_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'compliance-documents'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "compliance_documents_update" on storage.objects;
create policy "compliance_documents_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'compliance-documents'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'compliance-documents'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "compliance_documents_delete" on storage.objects;
create policy "compliance_documents_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'compliance-documents'
  and (storage.foldername(name))[1] is not null
  and public.can_manage_company(((storage.foldername(name))[1])::uuid)
);

create or replace function public.set_vehicle_compliance_document_storage_path(
  p_document_id uuid,
  p_storage_path text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_doc public.vehicle_compliance_documents%rowtype;
begin
  select *
  into v_doc
  from public.vehicle_compliance_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception 'DOCUMENT_NOT_FOUND';
  end if;

  if not public.can_manage_company(v_doc.company_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_doc.status <> 'active' then
    raise exception 'INVALID_STATUS';
  end if;

  if p_storage_path is not null then
    if p_storage_path !~ ('^' || v_doc.company_id::text || '/' || v_doc.id::text || '/[A-Za-z0-9._-]+$') then
      raise exception 'INVALID_STORAGE_PATH';
    end if;
  end if;

  update public.vehicle_compliance_documents
  set storage_path = nullif(btrim(p_storage_path), ''),
      updated_at = now()
  where id = p_document_id;
end;
$$;

revoke all on function public.set_vehicle_compliance_document_storage_path(uuid,text) from public;
grant execute on function public.set_vehicle_compliance_document_storage_path(uuid,text) to authenticated;
