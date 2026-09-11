import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CameraBinding,
  CameraEventInput,
  CameraPersistence,
  VideoClipInput,
} from "./integration";

type CameraRow = {
  id: string;
  company_id: string;
  vehicle_id: string;
  device_identifier: string | null;
  status: string;
  model: string | null;
};

export function createSupabaseCameraPersistence(
  supabase: SupabaseClient,
): CameraPersistence {
  return {
    async findActiveCamera({ companyId, vehicleId, deviceIdentifier }): Promise<CameraBinding | null> {
      const { data, error } = await supabase
        .from("cameras")
        .select("id,company_id,vehicle_id,device_identifier,status,model")
        .eq("company_id", companyId)
        .eq("vehicle_id", vehicleId)
        .eq("device_identifier", deviceIdentifier)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        throw new Error(`[Teltonika Camera] Unable to resolve camera: ${error.message}`);
      }

      if (!data) return null;
      const row = data as CameraRow;
      if (!row.device_identifier) return null;

      return {
        cameraId: row.id,
        companyId: row.company_id,
        vehicleId: row.vehicle_id,
        deviceIdentifier: row.device_identifier,
        status: row.status,
        model: row.model,
      };
    },

    async markCameraSeen(cameraId: string, seenAt: string): Promise<void> {
      const { error } = await supabase
        .from("cameras")
        .update({ last_seen_at: seenAt, updated_at: seenAt })
        .eq("id", cameraId);

      if (error) {
        throw new Error(`[Teltonika Camera] Unable to update camera last_seen_at: ${error.message}`);
      }
    },

    async createCameraEvent(input: CameraEventInput): Promise<{ id: string }> {
      const { data, error } = await supabase
        .from("camera_events")
        .insert({
          company_id: input.companyId,
          vehicle_id: input.vehicleId,
          camera_id: input.cameraId,
          event_type: input.eventType,
          event_time: input.eventTime,
          metadata: input.metadata ?? null,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `[Teltonika Camera] Unable to create camera event: ${error?.message ?? "missing inserted row"}`,
        );
      }

      return { id: String(data.id) };
    },

    async createVideoClip(input: VideoClipInput): Promise<{ id: string }> {
      const { data, error } = await supabase
        .from("video_clips")
        .insert({
          company_id: input.companyId,
          vehicle_id: input.vehicleId,
          camera_id: input.cameraId,
          camera_event_id: input.cameraEventId ?? null,
          storage_path: input.storagePath,
          mime_type: input.mimeType ?? null,
          duration_seconds: input.durationSeconds ?? null,
          start_time: input.startTime ?? null,
          end_time: input.endTime ?? null,
          thumbnail_path: input.thumbnailPath ?? null,
          status: input.status ?? "ready",
          metadata: input.metadata ?? null,
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `[Teltonika Camera] Unable to create video clip metadata: ${error?.message ?? "missing inserted row"}`,
        );
      }

      return { id: String(data.id) };
    },
  };
}
