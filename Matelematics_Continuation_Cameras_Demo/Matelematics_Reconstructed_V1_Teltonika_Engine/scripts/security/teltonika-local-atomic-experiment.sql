-- EXPERIMENT ONLY: all objects and fixture rows roll back at the end.
BEGIN;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='5s';
DO $guard$ BEGIN
 IF session_user <> 'supabase_admin' OR current_database() <> 'postgres'
 OR inet_server_addr() IS NOT NULL
 OR current_setting('application_name') <> 'matelematics-local-atomic-audit'
 OR to_regnamespace('matelematics_rls_lab') IS NULL
 THEN RAISE EXCEPTION 'Expected local recovery lab'; END IF;
 IF to_regnamespace('matelematics_ingest_lab') IS NOT NULL THEN
  RAISE EXCEPTION 'Candidate schema already exists';
 END IF;
END $guard$;
CREATE SCHEMA matelematics_ingest_lab;
REVOKE ALL ON SCHEMA matelematics_ingest_lab FROM PUBLIC,anon,authenticated,service_role;

-- No old row is deleted or rewritten. Existing duplicates cause a safe failure.
CREATE UNIQUE INDEX telemetry_teltonika_lab_fingerprint_unique
 ON public.telemetry(company_id,device_id,(metadata->>'ingest_fingerprint'))
 WHERE source='teltonika' AND device_id IS NOT NULL
 AND metadata ? 'ingest_fingerprint';

CREATE TABLE matelematics_ingest_lab.alert_work (
 telemetry_id bigint PRIMARY KEY REFERENCES public.telemetry(id) ON DELETE RESTRICT,
 company_id uuid NOT NULL,
 vehicle_id uuid NOT NULL,
 device_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 FOREIGN KEY(company_id,vehicle_id) REFERENCES public.vehicles(company_id,id),
 FOREIGN KEY(company_id,device_id) REFERENCES public.devices(company_id,id)
);
ALTER TABLE matelematics_ingest_lab.alert_work ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE matelematics_ingest_lab.alert_work FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION matelematics_ingest_lab.persist(
 p_imei text,p_fingerprint text,p_telemetry jsonb,p_position jsonb,p_alerts_required boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $function$
DECLARE
 d public.devices%ROWTYPE; existing public.telemetry%ROWTYPE;
 rid bigint; recorded timestamptz; pending boolean;
BEGIN
 IF session_user <> 'supabase_admin' OR inet_server_addr() IS NOT NULL THEN
  RAISE EXCEPTION 'Local candidate only';
 END IF;
 IF p_imei IS NULL OR p_imei !~ '^[0-9]{10,20}$'
 OR p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$'
 OR jsonb_typeof(p_telemetry) IS DISTINCT FROM 'object'
 OR p_alerts_required IS NULL THEN RAISE EXCEPTION 'Invalid ingest input'; END IF;
 IF p_telemetry ? 'metadata' AND jsonb_typeof(p_telemetry->'metadata') IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'Invalid metadata'; END IF;
 IF p_position IS NOT NULL AND jsonb_typeof(p_position) IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'Invalid position input'; END IF;
 IF p_telemetry->>'codec' IS NULL OR p_telemetry->>'codec' NOT IN ('8','8E')
 THEN RAISE EXCEPTION 'Invalid codec'; END IF;
 recorded:=(p_telemetry->>'recorded_at')::timestamptz;
 IF recorded IS NULL OR NOT isfinite(recorded) THEN RAISE EXCEPTION 'Invalid timestamp'; END IF;
 IF p_position IS NOT NULL AND
 ((p_position->>'recorded_at')::timestamptz IS DISTINCT FROM recorded)
 THEN RAISE EXCEPTION 'Position timestamp mismatch'; END IF;

 -- Serializes this device across different connections to this candidate.
 SELECT * INTO d FROM public.devices WHERE imei=p_imei FOR UPDATE;
 IF NOT FOUND OR d.vehicle_id IS NULL THEN RAISE EXCEPTION 'Unknown or unassigned device'; END IF;
 SELECT * INTO existing FROM public.telemetry
 WHERE company_id=d.company_id AND device_id=d.id AND source='teltonika'
 AND metadata->>'ingest_fingerprint'=p_fingerprint LIMIT 1;
 IF FOUND THEN
  IF existing.metadata->>'atomic_ingest_version' IS DISTINCT FROM 'lab-v1' THEN
   RAISE EXCEPTION 'Legacy fingerprint needs reconciliation';
  END IF;
  SELECT EXISTS(SELECT 1 FROM matelematics_ingest_lab.alert_work
   WHERE telemetry_id=existing.id AND completed_at IS NULL) INTO pending;
  RETURN jsonb_build_object('result','duplicate','alerts_pending',pending);
 END IF;

 IF p_position IS NOT NULL THEN
  INSERT INTO public.positions(company_id,vehicle_id,device_id,recorded_at,latitude,longitude,altitude,speed,heading)
  VALUES(d.company_id,d.vehicle_id,d.id,recorded,
   (p_position->>'latitude')::float8,(p_position->>'longitude')::float8,
   (p_position->>'altitude')::float8,(p_position->>'speed')::float8,(p_position->>'heading')::float8);
 END IF;
 INSERT INTO public.telemetry(company_id,vehicle_id,device_id,recorded_at,source,codec,
 raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition)
 VALUES(d.company_id,d.vehicle_id,d.id,recorded,'teltonika',p_telemetry->>'codec',
 p_telemetry->>'raw_payload',p_telemetry->'io_values',p_telemetry->'can_payload',
 coalesce(p_telemetry->'metadata','{}'::jsonb) ||
 jsonb_build_object('ingest_fingerprint',p_fingerprint,'atomic_ingest_version','lab-v1'),
 (p_telemetry->>'signal_strength')::integer,(p_telemetry->>'battery_voltage')::float8,
 (p_telemetry->>'ignition')::boolean)
 RETURNING id INTO rid;
 IF p_alerts_required THEN
  INSERT INTO matelematics_ingest_lab.alert_work(telemetry_id,company_id,vehicle_id,device_id)
  VALUES(rid,d.company_id,d.vehicle_id,d.id);
 END IF;
 UPDATE public.devices SET status='online',last_seen_at=clock_timestamp(),updated_at=clock_timestamp()
 WHERE id=d.id;
 RETURN jsonb_build_object('result','inserted','alerts_pending',p_alerts_required);
END $function$;
REVOKE ALL ON FUNCTION matelematics_ingest_lab.persist(text,text,jsonb,jsonb,boolean)
 FROM PUBLIC,anon,authenticated,service_role;

-- Late failure injection exists only on the candidate's temporary work table.
CREATE FUNCTION matelematics_ingest_lab.inject_failure() RETURNS trigger
LANGUAGE plpgsql AS $trigger$
BEGIN
 IF current_setting('matelematics_ingest_lab.fail_work',true)='yes'
 THEN RAISE EXCEPTION 'Injected work insert failure' USING ERRCODE='P1001'; END IF;
 RETURN NEW;
END $trigger$;
REVOKE ALL ON FUNCTION matelematics_ingest_lab.inject_failure() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER inject_work_failure BEFORE INSERT ON matelematics_ingest_lab.alert_work
 FOR EACH ROW EXECUTE FUNCTION matelematics_ingest_lab.inject_failure();

DO $tests$
DECLARE
 vid uuid:=gen_random_uuid(); did uuid:=gen_random_uuid(); cid uuid; admin_id uuid;
 imei text; fp text; fp2 text; fp3 text;
 vehicle_source jsonb; tele jsonb; pos jsonb; result jsonb;
 old_seen timestamptz:='2001-01-01T00:00:00Z'; n integer; rid bigint;
BEGIN
 SELECT id INTO admin_id FROM public.profiles WHERE role='matelematics_admin' LIMIT 1;
 IF admin_id IS NULL THEN RAISE EXCEPTION 'Administrator missing'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
 SELECT to_jsonb(v) INTO vehicle_source FROM public.vehicles v LIMIT 1;
 cid:=(vehicle_source->>'company_id')::uuid;
 IF cid IS NULL THEN RAISE EXCEPTION 'Vehicle source missing'; END IF;
 imei:='990'||lpad((abs(hashtextextended(did::text,1) % 1000000000000))::text,12,'0');
 fp:=md5(did::text)||md5(vid::text);
 fp2:=md5(did::text||'2')||md5(vid::text||'2');
 fp3:=md5(did::text||'3')||md5(vid::text||'3');
 INSERT INTO public.vehicles SELECT (jsonb_populate_record(NULL::public.vehicles,vehicle_source ||
 jsonb_build_object('id',vid,'device_id',NULL,'name','ATOMIC LAB '||vid,'registration',vid::text))).*;
 INSERT INTO public.devices(id,company_id,vehicle_id,imei,status,last_seen_at)
 VALUES(did,cid,vid,imei,'offline',old_seen);
 tele:=jsonb_build_object('codec','8E','recorded_at','2026-10-01T00:00:00Z',
 'io_values','{}'::jsonb,'metadata','{}'::jsonb,'signal_strength',3,'ignition',true);
 pos:=jsonb_build_object('recorded_at','2026-10-01T00:00:00Z','latitude',0,'longitude',0,
 'altitude',0,'speed',0,'heading',0);

 -- Failure after position INSERT, while preparing the telemetry INSERT.
 BEGIN
  PERFORM matelematics_ingest_lab.persist(imei,fp,tele||'{"signal_strength":"bad"}'::jsonb,pos,true);
  RAISE EXCEPTION 'Expected conversion failure';
 EXCEPTION WHEN invalid_text_representation THEN NULL;
 END;
 IF EXISTS(SELECT 1 FROM public.positions WHERE device_id=did)
 OR EXISTS(SELECT 1 FROM public.telemetry WHERE device_id=did)
 OR EXISTS(SELECT 1 FROM matelematics_ingest_lab.alert_work WHERE device_id=did)
 OR EXISTS(SELECT 1 FROM public.devices WHERE id=did AND (status<>'offline' OR last_seen_at IS DISTINCT FROM old_seen))
 THEN RAISE EXCEPTION 'Partial write after telemetry failure'; END IF;
 RAISE NOTICE 'PASS: failure after position leaves no partial row or device update';

 PERFORM set_config('matelematics_ingest_lab.fail_work','yes',true);
 BEGIN
  PERFORM matelematics_ingest_lab.persist(imei,fp,tele,pos,true);
  RAISE EXCEPTION 'Expected injected work failure';
 EXCEPTION WHEN SQLSTATE 'P1001' THEN NULL;
 END;
 PERFORM set_config('matelematics_ingest_lab.fail_work','no',true);
 IF EXISTS(SELECT 1 FROM public.positions WHERE device_id=did)
 OR EXISTS(SELECT 1 FROM public.telemetry WHERE device_id=did)
 OR EXISTS(SELECT 1 FROM matelematics_ingest_lab.alert_work WHERE device_id=did)
 OR EXISTS(SELECT 1 FROM public.devices WHERE id=did AND (status<>'offline' OR last_seen_at IS DISTINCT FROM old_seen))
 THEN RAISE EXCEPTION 'Partial write after work failure'; END IF;
 RAISE NOTICE 'PASS: late work failure rolls back position and telemetry';

 result:=matelematics_ingest_lab.persist(imei,fp,tele,pos,true);
 IF result->>'result' IS DISTINCT FROM 'inserted' OR result->>'alerts_pending' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Insert result'; END IF;
 result:=matelematics_ingest_lab.persist(imei,fp,tele,pos,true);
 IF result->>'result' IS DISTINCT FROM 'duplicate' OR result->>'alerts_pending' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Replay result'; END IF;
 SELECT count(*) INTO n FROM public.positions WHERE device_id=did; IF n<>1 THEN RAISE EXCEPTION 'Position duplicate'; END IF;
 SELECT count(*) INTO n FROM public.telemetry WHERE device_id=did; IF n<>1 THEN RAISE EXCEPTION 'Telemetry duplicate'; END IF;
 SELECT count(*) INTO n FROM matelematics_ingest_lab.alert_work WHERE device_id=did; IF n<>1 THEN RAISE EXCEPTION 'Work duplicate'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.devices WHERE id=did AND status='online' AND last_seen_at>old_seen)
 THEN RAISE EXCEPTION 'Device not updated'; END IF;
 RAISE NOTICE 'PASS: success and ACK-loss replay produce one position, one telemetry and one pending work item';

 SELECT id INTO rid FROM public.telemetry WHERE device_id=did;
 BEGIN
  INSERT INTO public.telemetry(company_id,vehicle_id,device_id,recorded_at,source,metadata)
  VALUES(cid,vid,did,now(),'teltonika',jsonb_build_object('ingest_fingerprint',fp));
  RAISE EXCEPTION 'Expected unique constraint';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 RAISE NOTICE 'PASS: database uniqueness rejects direct duplicate fingerprint';

 UPDATE matelematics_ingest_lab.alert_work SET completed_at=now() WHERE telemetry_id=rid;
 result:=matelematics_ingest_lab.persist(imei,fp,tele,pos,true);
 IF result->>'alerts_pending' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Completed work restarted'; END IF;
 RAISE NOTICE 'PASS: completed work not restarted by replay (worker itself not tested)';

 result:=matelematics_ingest_lab.persist(imei,fp2,tele,NULL,false);
 SELECT count(*) INTO n FROM public.positions WHERE device_id=did; IF n<>1 THEN RAISE EXCEPTION 'No-GPS wrote position'; END IF;
 SELECT count(*) INTO n FROM public.telemetry WHERE device_id=did; IF n<>2 THEN RAISE EXCEPTION 'No-GPS telemetry missing'; END IF;
 RAISE NOTICE 'PASS: telemetry without GPS does not create a position';

 -- Legacy fingerprints are retained and explicitly require reconciliation.
 INSERT INTO public.telemetry(company_id,vehicle_id,device_id,recorded_at,source,metadata)
 VALUES(cid,vid,did,now(),'teltonika',jsonb_build_object('ingest_fingerprint',fp3));
 BEGIN
  PERFORM matelematics_ingest_lab.persist(imei,fp3,tele,pos,true);
  RAISE EXCEPTION 'Legacy fingerprint silently accepted' USING ERRCODE='P1002';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL;
 END;
 RAISE NOTICE 'PASS: legacy fingerprint reconciliation required, no old row rewritten';

 IF has_function_privilege('anon','matelematics_ingest_lab.persist(text,text,jsonb,jsonb,boolean)','EXECUTE')
 OR has_function_privilege('authenticated','matelematics_ingest_lab.persist(text,text,jsonb,jsonb,boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'Candidate exposed to public JWT'; END IF;
 RAISE NOTICE 'PASS: candidate private and not executable by anon/authenticated';
 RAISE NOTICE 'LOCAL ATOMIC CANDIDATE PASS; no concurrent sessions, real crash, RPC integration or alert worker tested';
END $tests$;
ROLLBACK;
