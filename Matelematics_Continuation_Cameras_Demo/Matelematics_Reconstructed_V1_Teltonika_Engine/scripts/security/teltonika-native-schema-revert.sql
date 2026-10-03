-- PREPARED ONLY. Stop ingestion and its dedicated login before rollback.
-- Run inside a controlled transaction. No data rows are deleted.
DO $guard$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='matelematics_ingest_native' AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls)
 THEN RAISE EXCEPTION 'Unexpected ingestion role'; END IF;
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid=(SELECT oid FROM pg_roles WHERE rolname='matelematics_ingest_native'))
 THEN RAISE EXCEPTION 'Revoke dedicated login membership before rollback'; END IF;
END $guard$;
DROP POLICY native_ingest_select ON public.devices;
DROP POLICY native_ingest_update ON public.devices;
DROP POLICY native_ingest_select ON public.vehicles;
DROP POLICY native_ingest_update ON public.vehicles;
DROP POLICY native_ingest_select ON public.telemetry;
DROP POLICY native_ingest_insert ON public.telemetry;
DROP POLICY native_ingest_insert ON public.positions;
DROP POLICY native_ingest_select ON public.alerts;
DROP POLICY native_ingest_insert ON public.alerts;
DROP POLICY native_ingest_update ON public.alerts;
DROP POLICY native_ingest_select ON public.alert_settings;
REVOKE SELECT(id,company_id,vehicle_id,imei),UPDATE(status,last_seen_at,updated_at) ON public.devices FROM matelematics_ingest_native;
REVOKE SELECT(id,company_id),UPDATE(updated_at) ON public.vehicles FROM matelematics_ingest_native;
REVOKE SELECT(company_id,device_id,source,metadata),INSERT(company_id,vehicle_id,device_id,recorded_at,source,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition) ON public.telemetry FROM matelematics_ingest_native;
REVOKE INSERT(company_id,vehicle_id,device_id,recorded_at,latitude,longitude,altitude,speed,heading) ON public.positions FROM matelematics_ingest_native;
REVOKE SELECT(id,alert_type,status,triggered_at,resolved_at,company_id,vehicle_id),INSERT(company_id,vehicle_id,device_id,alert_type,severity,title,message,latitude,longitude,triggered_at,status,metadata),UPDATE(status,resolved_at) ON public.alerts FROM matelematics_ingest_native;
REVOKE SELECT(company_id,vehicle_id,rule_key,enabled,threshold_value,threshold_secondary,severity) ON public.alert_settings FROM matelematics_ingest_native;
REVOKE USAGE ON SEQUENCE public.positions_id_seq,public.telemetry_id_seq FROM matelematics_ingest_native;
REVOKE USAGE ON SCHEMA public FROM matelematics_ingest_native;
DROP ROLE matelematics_ingest_native;
DROP INDEX public.telemetry_teltonika_fingerprint_unique;
