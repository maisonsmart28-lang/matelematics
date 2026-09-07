-- ============================================================
-- MATELEMATICS V1
-- 03_cameras.sql
-- Cameras / camera events / video clips
--
-- PREPARED MIGRATION
-- DO NOT EXECUTE BEFORE FINAL REVIEW
-- ============================================================


-- ============================================================
-- 1. CAMERAS
-- ============================================================

CREATE TABLE public.cameras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,

  manufacturer text,
  model text,
  serial_number text,
  device_identifier text,

  channel integer,

  orientation text NOT NULL DEFAULT 'road',

  status text NOT NULL DEFAULT 'active',
  live_capable boolean NOT NULL DEFAULT false,

  last_seen_at timestamptz,

  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cameras_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE,

  CONSTRAINT cameras_company_vehicle_fkey
    FOREIGN KEY (company_id, vehicle_id)
    REFERENCES public.vehicles(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT cameras_orientation_check
    CHECK (
      orientation IN ('road', 'cabin', 'rear', 'other')
    ),

  CONSTRAINT cameras_company_id_id_key
    UNIQUE (company_id, id)
);


-- ============================================================
-- 2. CAMERA EVENTS
--
-- A camera event may be linked to:
-- - vehicle
-- - camera
-- - telemetry
-- - alert
-- - position
--
-- All references are tenant-safe.
-- ============================================================

CREATE TABLE public.camera_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL,

  vehicle_id uuid,
  camera_id uuid,

  telemetry_id bigint,
  alert_id uuid,
  position_id bigint,

  event_type text NOT NULL,
  event_time timestamptz NOT NULL,

  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT camera_events_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE,

  CONSTRAINT camera_events_company_vehicle_fkey
    FOREIGN KEY (company_id, vehicle_id)
    REFERENCES public.vehicles(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT camera_events_company_camera_fkey
    FOREIGN KEY (company_id, camera_id)
    REFERENCES public.cameras(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT camera_events_company_telemetry_fkey
    FOREIGN KEY (company_id, telemetry_id)
    REFERENCES public.telemetry(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT camera_events_company_alert_fkey
    FOREIGN KEY (company_id, alert_id)
    REFERENCES public.alerts(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT camera_events_company_position_fkey
    FOREIGN KEY (company_id, position_id)
    REFERENCES public.positions(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT camera_events_company_id_id_key
    UNIQUE (company_id, id)
);


-- ============================================================
-- 3. VIDEO CLIPS
--
-- IMPORTANT:
-- The actual video binary must NOT be stored in PostgreSQL.
--
-- storage_path points to the future private Supabase Storage
-- bucket "vehicle-videos".
-- ============================================================

CREATE TABLE public.video_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id uuid NOT NULL,

  vehicle_id uuid,
  camera_id uuid,
  camera_event_id uuid,

  storage_path text NOT NULL,

  mime_type text,
  duration_seconds double precision,

  start_time timestamptz,
  end_time timestamptz,

  thumbnail_path text,

  status text NOT NULL DEFAULT 'ready',

  metadata jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT video_clips_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE,

  CONSTRAINT video_clips_company_vehicle_fkey
    FOREIGN KEY (company_id, vehicle_id)
    REFERENCES public.vehicles(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT video_clips_company_camera_fkey
    FOREIGN KEY (company_id, camera_id)
    REFERENCES public.cameras(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT video_clips_company_camera_event_fkey
    FOREIGN KEY (company_id, camera_event_id)
    REFERENCES public.camera_events(company_id, id)
    ON DELETE RESTRICT,

  CONSTRAINT video_clips_duration_check
    CHECK (
      duration_seconds IS NULL
      OR duration_seconds >= 0
    ),

  CONSTRAINT video_clips_time_range_check
    CHECK (
      start_time IS NULL
      OR end_time IS NULL
      OR end_time >= start_time
    ),

  CONSTRAINT video_clips_company_id_id_key
    UNIQUE (company_id, id)
);


-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
--
-- 1. Cameras are treated as a first-class Matelematics module.
--
-- 2. No assumption is made about ADAS, DMS or AI capabilities.
--    Those capabilities will only be added if verified on the
--    selected camera hardware/API.
--
-- 3. Video binaries are NOT stored in PostgreSQL.
--
-- 4. Future video storage:
--
--      Supabase Storage bucket:
--      vehicle-videos
--
--      PRIVATE
--
--      Suggested path:
--      company_id/vehicle_id/yyyy/mm/dd/...
--
--      Access:
--      signed URLs generated by the application/backend.
--
-- 5. camera_events can link telemetry, alerts and GPS positions
--    to a video event.
--
-- 6. Composite foreign keys guarantee that references cannot
--    cross company boundaries.
--
-- ============================================================
-- END OF FILE
-- ============================================================