-- Synthetic GT06 test device only. Run as one migration transaction.
CREATE SCHEMA IF NOT EXISTS gt06_lab;
REVOKE ALL ON SCHEMA gt06_lab FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS gt06_lab.gt06_test_receipts (
  device_id uuid NOT NULL,
  packet_sha256 text NOT NULL CHECK (packet_sha256 ~ '^[0-9a-f]{64}$'),
  position_id bigint NOT NULL,
  telemetry_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, packet_sha256)
);
REVOKE ALL ON gt06_lab.gt06_test_receipts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.persist_gt06_test_packet(
  p_imei text, p_raw_hex text,
  p_recorded_at timestamptz, p_latitude double precision, p_longitude double precision,
  p_speed_kph double precision, p_heading double precision,
  p_protocol integer, p_serial integer, p_satellites integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_device record;
  v_position_id bigint;
  v_telemetry_id bigint;
  v_inserted boolean;
  v_packet_sha256 text;
BEGIN
  IF p_imei IS DISTINCT FROM '864180070000001'
     OR p_raw_hex IS NULL OR length(p_raw_hex) > 512 OR length(p_raw_hex) < 20
     OR p_raw_hex !~ '^[0-9a-f]+$'
     OR p_recorded_at IS NULL OR p_recorded_at < now() - interval '30 days'
     OR p_recorded_at > now() + interval '10 minutes'
     OR p_latitude IS NULL OR NOT (p_latitude BETWEEN -90 AND 90)
     OR p_longitude IS NULL OR NOT (p_longitude BETWEEN -180 AND 180)
     OR p_speed_kph IS NULL OR NOT (p_speed_kph BETWEEN 0 AND 1000)
     OR p_heading IS NULL OR NOT (p_heading BETWEEN 0 AND 360)
     OR p_protocol NOT IN (18, 34) OR p_protocol IS NULL
     OR p_serial IS NULL OR p_serial NOT BETWEEN 0 AND 65535
     OR p_satellites IS NULL OR p_satellites NOT BETWEEN 0 AND 15
  THEN
    RAISE EXCEPTION 'Invalid synthetic GT06 packet';
  END IF;

  v_packet_sha256 := encode(extensions.digest(decode(p_raw_hex, 'hex'), 'sha256'), 'hex');

  SELECT d.id, d.company_id, d.vehicle_id INTO v_device
  FROM public.devices d
  JOIN public.vehicles v ON v.id = d.vehicle_id AND v.company_id = d.company_id
  JOIN public.companies c ON c.id = d.company_id
  WHERE d.imei = p_imei AND d.manufacturer = 'Accurate' AND d.model = 'GT06 Simulator'
    AND c.name = 'Matelematics' AND v.name = 'Renault Express Test'
    AND v.registration = 'Test-001';
  IF NOT FOUND THEN RAISE EXCEPTION 'Synthetic GT06 test device not registered'; END IF;

  -- The unique receipt serializes concurrent attempts. Any later error rolls it back
  -- along with positions, telemetry and status updates in this same RPC transaction.
  INSERT INTO gt06_lab.gt06_test_receipts (device_id, packet_sha256, position_id, telemetry_id)
  VALUES (v_device.id, v_packet_sha256, 0, 0)
  ON CONFLICT DO NOTHING RETURNING true INTO v_inserted;
  IF v_inserted IS DISTINCT FROM true THEN
    RETURN jsonb_build_object('result', 'duplicate');
  END IF;

  -- Older pre-migration writes may contain this exact raw packet already.
  IF EXISTS (SELECT 1 FROM public.telemetry t WHERE t.device_id = v_device.id
             AND t.source = 'gt06' AND t.raw_payload = p_raw_hex) THEN
    DELETE FROM gt06_lab.gt06_test_receipts
    WHERE device_id = v_device.id AND packet_sha256 = v_packet_sha256;
    RETURN jsonb_build_object('result', 'legacy_duplicate');
  END IF;

  INSERT INTO public.positions(company_id, vehicle_id, device_id, latitude, longitude,
                               altitude, speed, heading, recorded_at)
  VALUES (v_device.company_id, v_device.vehicle_id, v_device.id, p_latitude, p_longitude,
          0, p_speed_kph, p_heading, p_recorded_at)
  RETURNING id INTO v_position_id;

  INSERT INTO public.telemetry(company_id, vehicle_id, device_id, recorded_at, source,
                               codec, raw_payload, io_values, can_payload, metadata)
  VALUES (v_device.company_id, v_device.vehicle_id, v_device.id, p_recorded_at, 'gt06',
          'GT06-' || upper(to_hex(p_protocol)), p_raw_hex, '{}'::jsonb, '{}'::jsonb,
          jsonb_build_object('packet_sha256', v_packet_sha256, 'protocol', p_protocol,
                             'serial', p_serial, 'satellites', p_satellites,
                             'gps_valid', true, 'tracker_family', 'GT06',
                             'tracker_brand', 'Accurate', 'simulator', true))
  RETURNING id INTO v_telemetry_id;

  UPDATE gt06_lab.gt06_test_receipts SET position_id = v_position_id,
    telemetry_id = v_telemetry_id
  WHERE device_id = v_device.id AND packet_sha256 = v_packet_sha256;

  UPDATE public.devices SET status = 'online', last_seen_at = now(), updated_at = now()
  WHERE id = v_device.id;

  RETURN jsonb_build_object('result', 'inserted', 'position_id', v_position_id,
                            'telemetry_id', v_telemetry_id);
END;
$$;
REVOKE ALL ON FUNCTION public.persist_gt06_test_packet(text,text,timestamptz,double precision,double precision,double precision,double precision,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_gt06_test_packet(text,text,timestamptz,double precision,double precision,double precision,double precision,integer,integer,integer) TO service_role;
