-- PREPARED ONLY. Run inside an explicitly controlled transaction.
DO $guard$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='matelematics_ingest_native')
 OR to_regclass('public.telemetry_teltonika_fingerprint_unique') IS NOT NULL THEN
 RAISE EXCEPTION 'Ingestion role or index already exists; do not overwrite'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.devices'::regclass,'public.vehicles'::regclass,'public.positions'::regclass,'public.telemetry'::regclass,'public.alerts'::regclass,'public.alert_settings'::regclass) AND NOT relrowsecurity) THEN
 RAISE EXCEPTION 'RLS required on all six tables'; END IF;
END $guard$;
CREATE ROLE matelematics_ingest_native NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO matelematics_ingest_native;
GRANT SELECT(id,company_id,vehicle_id,imei) ON public.devices TO matelematics_ingest_native;
GRANT UPDATE(status,last_seen_at,updated_at) ON public.devices TO matelematics_ingest_native;
GRANT SELECT(id,company_id) ON public.vehicles TO matelematics_ingest_native;
-- PostgreSQL row locking requires UPDATE privilege on at least one column.
GRANT UPDATE(updated_at) ON public.vehicles TO matelematics_ingest_native;
GRANT SELECT(company_id,device_id,source,metadata) ON public.telemetry TO matelematics_ingest_native;
GRANT INSERT(company_id,vehicle_id,device_id,recorded_at,source,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition) ON public.telemetry TO matelematics_ingest_native;
GRANT INSERT(company_id,vehicle_id,device_id,recorded_at,latitude,longitude,altitude,speed,heading) ON public.positions TO matelematics_ingest_native;
GRANT SELECT(id,alert_type,status,triggered_at,resolved_at,company_id,vehicle_id) ON public.alerts TO matelematics_ingest_native;
GRANT INSERT(company_id,vehicle_id,device_id,alert_type,severity,title,message,latitude,longitude,triggered_at,status,metadata) ON public.alerts TO matelematics_ingest_native;
GRANT UPDATE(status,resolved_at) ON public.alerts TO matelematics_ingest_native;
GRANT SELECT(company_id,vehicle_id,rule_key,enabled,threshold_value,threshold_secondary,severity) ON public.alert_settings TO matelematics_ingest_native;
GRANT USAGE ON SEQUENCE public.positions_id_seq,public.telemetry_id_seq TO matelematics_ingest_native;

CREATE POLICY native_ingest_select ON public.devices FOR SELECT TO matelematics_ingest_native USING(true);
CREATE POLICY native_ingest_update ON public.devices FOR UPDATE TO matelematics_ingest_native USING(true) WITH CHECK(true);
CREATE POLICY native_ingest_select ON public.vehicles FOR SELECT TO matelematics_ingest_native USING(true);
CREATE POLICY native_ingest_update ON public.vehicles FOR UPDATE TO matelematics_ingest_native USING(true) WITH CHECK(true);
CREATE POLICY native_ingest_select ON public.telemetry FOR SELECT TO matelematics_ingest_native USING(true);
CREATE POLICY native_ingest_insert ON public.telemetry FOR INSERT TO matelematics_ingest_native WITH CHECK(true);
CREATE POLICY native_ingest_insert ON public.positions FOR INSERT TO matelematics_ingest_native WITH CHECK(true);
CREATE POLICY native_ingest_select ON public.alerts FOR SELECT TO matelematics_ingest_native USING(true);
CREATE POLICY native_ingest_insert ON public.alerts FOR INSERT TO matelematics_ingest_native WITH CHECK(true);
CREATE POLICY native_ingest_update ON public.alerts FOR UPDATE TO matelematics_ingest_native USING(true) WITH CHECK(true);
CREATE POLICY native_ingest_select ON public.alert_settings FOR SELECT TO matelematics_ingest_native USING(true);

-- An existing duplicate causes failure and rollback; no historical row is deleted.
CREATE UNIQUE INDEX telemetry_teltonika_fingerprint_unique
 ON public.telemetry(company_id,device_id,(metadata->>'ingest_fingerprint'))
 WHERE source='teltonika' AND device_id IS NOT NULL AND metadata ? 'ingest_fingerprint';
