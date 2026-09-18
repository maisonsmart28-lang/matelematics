-- 8G-6: remove obsolete Storage policies for the unused "vehicle-compliance" bucket.
-- Canonical private bucket: "compliance-documents".
-- This migration intentionally does not modify the validated compliance-documents policies or RPCs.

drop policy if exists "vehicle_compliance_files_select"
  on storage.objects;

drop policy if exists "vehicle_compliance_files_insert"
  on storage.objects;

drop policy if exists "vehicle_compliance_files_update"
  on storage.objects;

drop policy if exists "vehicle_compliance_files_delete"
  on storage.objects;
