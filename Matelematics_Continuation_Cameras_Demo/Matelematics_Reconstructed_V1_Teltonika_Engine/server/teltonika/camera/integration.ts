import type { CameraCommand } from "./media-protocol";
import {
  createCameraMediaServer,
  type CameraMediaServerHandle,
  type CameraMediaServerOptions,
  type CameraMediaSession,
} from "./media-server";
import { findDeviceByImei } from "../registry";

export type CameraBinding = {
  cameraId: string;
  companyId: string;
  vehicleId: string;
  deviceIdentifier: string;
  status: string;
  model: string | null;
};

export type CameraEventInput = {
  companyId: string;
  vehicleId: string;
  cameraId: string;
  eventType: string;
  eventTime: string;
  metadata?: Record<string, unknown> | null;
};

export type VideoClipInput = {
  companyId: string;
  vehicleId: string;
  cameraId: string;
  cameraEventId?: string | null;
  storagePath: string;
  mimeType?: string | null;
  durationSeconds?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  thumbnailPath?: string | null;
  status?: string;
  metadata?: Record<string, unknown> | null;
};

export type CameraPersistence = {
  findActiveCamera(input: {
    companyId: string;
    vehicleId: string;
    deviceIdentifier: string;
  }): Promise<CameraBinding | null>;
  markCameraSeen(cameraId: string, seenAt: string): Promise<void>;
  createCameraEvent(input: CameraEventInput): Promise<{ id: string }>;
  createVideoClip(input: VideoClipInput): Promise<{ id: string }>;
};

export type RegisteredCameraMediaIntegrationOptions = Omit<
  CameraMediaServerOptions,
  "authorizeImei" | "onAuthenticated" | "onCommand" | "onDisconnected"
> & {
  persistence: CameraPersistence;
  onCommand?: (session: CameraMediaSession, command: CameraCommand) => void | Promise<void>;
};

export type RegisteredCameraMediaIntegration = {
  server: CameraMediaServerHandle;
  bindings: Map<string, CameraBinding>;
  recordVideoClip: (input: Omit<VideoClipInput, "companyId" | "vehicleId" | "cameraId"> & {
    imei: string;
  }) => Promise<{ id: string }>;
};

export function createRegisteredCameraMediaIntegration(
  options: RegisteredCameraMediaIntegrationOptions,
): RegisteredCameraMediaIntegration {
  const { persistence } = options;
  const bindings = new Map<string, CameraBinding>();

  const server = createCameraMediaServer({
    host: options.host,
    port: options.port,
    idleTimeoutMs: options.idleTimeoutMs,
    maxBufferedBytes: options.maxBufferedBytes,

    authorizeImei: async (imei) => {
      const device = findDeviceByImei(imei);
      if (!device) return false;

      const camera = await persistence.findActiveCamera({
        companyId: device.clientId,
        vehicleId: device.vehicleId,
        deviceIdentifier: imei,
      });

      if (!camera || camera.status !== "active") return false;
      if (camera.companyId !== device.clientId || camera.vehicleId !== device.vehicleId) return false;
      if (camera.deviceIdentifier !== imei) return false;

      bindings.set(imei, camera);
      return true;
    },

    onAuthenticated: async (session) => {
      const camera = bindings.get(session.imei);
      if (!camera) throw new Error("camera binding missing after authorization");

      const now = new Date().toISOString();
      await persistence.markCameraSeen(camera.cameraId, now);
      await persistence.createCameraEvent({
        companyId: camera.companyId,
        vehicleId: camera.vehicleId,
        cameraId: camera.cameraId,
        eventType: "camera_connected",
        eventTime: now,
        metadata: {
          imei: session.imei,
          protocol_id: session.init.protocolId,
          settings: session.init.settings,
        },
      });
    },

    onCommand: async (session, command) => {
      const camera = bindings.get(session.imei);
      if (!camera) throw new Error("camera binding missing for command");

      await persistence.markCameraSeen(camera.cameraId, new Date().toISOString());
      if (options.onCommand) await options.onCommand(session, command);
    },

    onDisconnected: async (session, reason) => {
      const camera = bindings.get(session.imei);
      bindings.delete(session.imei);
      if (!camera) return;

      await persistence.createCameraEvent({
        companyId: camera.companyId,
        vehicleId: camera.vehicleId,
        cameraId: camera.cameraId,
        eventType: "camera_disconnected",
        eventTime: new Date().toISOString(),
        metadata: {
          imei: session.imei,
          reason,
        },
      });
    },
  });

  return {
    server,
    bindings,
    recordVideoClip: async ({ imei, ...clip }) => {
      const camera = bindings.get(imei);
      if (!camera) throw new Error(`No active camera binding for IMEI ${imei}`);
      if (!clip.storagePath || clip.storagePath.startsWith("/") || clip.storagePath.includes("..")) {
        throw new Error("video storage path must be a safe relative object path");
      }

      return await persistence.createVideoClip({
        ...clip,
        companyId: camera.companyId,
        vehicleId: camera.vehicleId,
        cameraId: camera.cameraId,
      });
    },
  };
}
