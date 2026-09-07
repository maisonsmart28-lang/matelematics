-- ============================================================
-- MATELEMATICS V1
-- 04_indexes.sql
-- Performance indexes
--
-- PREPARED MIGRATION
-- DO NOT EXECUTE BEFORE FINAL REVIEW
-- ============================================================


-- ============================================================
-- 1. VEHICLES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_company_id
ON public.vehicles(company_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_company_status
ON public.vehicles(company_id, status);


-- ============================================================
-- 2. DRIVERS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_drivers_company_id
ON public.drivers(company_id);

CREATE INDEX IF NOT EXISTS idx_drivers_company_status
ON public.drivers(company_id, status);


-- ============================================================
-- 3. DEVICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_devices_company_id
ON public.devices(company_id);

CREATE INDEX IF NOT EXISTS idx_devices_company_vehicle
ON public.devices(company_id, vehicle_id);

CREATE INDEX IF NOT EXISTS idx_devices_company_status
ON public.devices(company_id, status);

CREATE INDEX IF NOT EXISTS idx_devices_vehicle_id
ON public.devices(vehicle_id);

-- IMEI already has a UNIQUE constraint in 01_core.sql.
-- No duplicate index is required here.


-- ============================================================
-- 4. VEHICLE / DRIVER ASSIGNMENTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_assignments_company_id
ON public.vehicle_driver_assignments(company_id);

CREATE INDEX IF NOT EXISTS idx_assignments_company_vehicle
ON public.vehicle_driver_assignments(
  company_id,
  vehicle_id,
  assigned_at DESC
);

CREATE INDEX IF NOT EXISTS idx_assignments_company_driver
ON public.vehicle_driver_assignments(
  company_id,
  driver_id,
  assigned_at DESC
);

-- Active assignment uniqueness is already enforced in 01_core.sql:
-- idx_vehicle_driver_assignments_active_vehicle
-- idx_vehicle_driver_assignments_active_driver


-- ============================================================
-- 5. POSITIONS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_positions_vehicle_recorded_at
ON public.positions(
  vehicle_id,
  recorded_at DESC
);

CREATE INDEX IF NOT EXISTS idx_positions_device_recorded_at
ON public.positions(
  device_id,
  recorded_at DESC
);

CREATE INDEX IF NOT EXISTS idx_positions_company_vehicle_recorded_at
ON public.positions(
  company_id,
  vehicle_id,
  recorded_at DESC
);


-- ============================================================
-- 6. TELEMETRY
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_telemetry_vehicle_recorded_at
ON public.telemetry(
  vehicle_id,
  recorded_at DESC
);

CREATE INDEX IF NOT EXISTS idx_telemetry_device_recorded_at
ON public.telemetry(
  device_id,
  recorded_at DESC
);

CREATE INDEX IF NOT EXISTS idx_telemetry_company_vehicle_recorded_at
ON public.telemetry(
  company_id,
  vehicle_id,
  recorded_at DESC
);


-- ============================================================
-- 7. ALERTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_alerts_company_triggered_at
ON public.alerts(
  company_id,
  triggered_at DESC
);

CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_triggered_at
ON public.alerts(
  vehicle_id,
  triggered_at DESC
);

CREATE INDEX IF NOT EXISTS idx_alerts_company_status
ON public.alerts(
  company_id,
  status
);


-- ============================================================
-- 8. TRIPS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trips_vehicle_started_at
ON public.trips(
  vehicle_id,
  started_at DESC
);

CREATE INDEX IF NOT EXISTS idx_trips_driver_started_at
ON public.trips(
  driver_id,
  started_at DESC
);

CREATE INDEX IF NOT EXISTS idx_trips_company_started_at
ON public.trips(
  company_id,
  started_at DESC
);


-- ============================================================
-- 9. CAMERAS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cameras_company_vehicle
ON public.cameras(
  company_id,
  vehicle_id
);

CREATE INDEX IF NOT EXISTS idx_cameras_vehicle_status
ON public.cameras(
  vehicle_id,
  status
);


-- ============================================================
-- 10. CAMERA EVENTS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_camera_events_vehicle_time
ON public.camera_events(
  vehicle_id,
  event_time DESC
);

CREATE INDEX IF NOT EXISTS idx_camera_events_camera_time
ON public.camera_events(
  camera_id,
  event_time DESC
);

CREATE INDEX IF NOT EXISTS idx_camera_events_company_time
ON public.camera_events(
  company_id,
  event_time DESC
);

CREATE INDEX IF NOT EXISTS idx_camera_events_alert_time
ON public.camera_events(
  alert_id,
  event_time DESC
);


-- ============================================================
-- 11. VIDEO CLIPS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_video_clips_company_vehicle
ON public.video_clips(
  company_id,
  vehicle_id
);

CREATE INDEX IF NOT EXISTS idx_video_clips_camera_event
ON public.video_clips(
  camera_event_id
);

CREATE INDEX IF NOT EXISTS idx_video_clips_camera
ON public.video_clips(
  camera_id
);


-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
--
-- 1. No duplicate indexes are added for primary keys.
--
-- 2. No duplicate index is added for devices.imei because the
--    UNIQUE constraint already creates the required index.
--
-- 3. Time-series tables use compound indexes on entity + time.
--
-- 4. Indexes are optimized around the current dashboard needs:
--    latest positions, latest telemetry, alerts, trips,
--    camera events and per-company queries.
--
-- 5. This migration intentionally avoids over-indexing.
--
-- ============================================================
-- END OF FILE
-- ============================================================