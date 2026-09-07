import { demoTelemetryAlerts } from "./demo-fleet";

export type DemoCameraStatus = "En ligne" | "Hors ligne";
export type DemoCameraEventSeverity = "info" | "warning" | "danger";

export type DemoCamera = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  registration: string;
  companyName: string;
  label: string;
  position: "Route" | "Cabine" | "Arrière";
  status: DemoCameraStatus;
  videoSrc: string;
  location: string;
  lastSeen: string;
};

export type DemoCameraEvent = {
  id: string;
  cameraId: string;
  vehicleName: string;
  title: string;
  description: string;
  severity: DemoCameraEventSeverity;
  time: string;
  clipSrc: string;
};

export const demoCameras: DemoCamera[] = [
  {
    id: "CAM-001",
    vehicleId: "V-001",
    vehicleName: "Renault Express",
    registration: "12345-A-6",
    companyName: "Atlas Distribution",
    label: "Caméra avant",
    position: "Route",
    status: "En ligne",
    videoSrc: "/demo-camera/road-front.mp4",
    location: "Casablanca",
    lastSeen: "À l'instant",
  },
  {
    id: "CAM-002",
    vehicleId: "V-002",
    vehicleName: "Ford Transit",
    registration: "55218-B-6",
    companyName: "Atlas Distribution",
    label: "Caméra cabine",
    position: "Cabine",
    status: "En ligne",
    videoSrc: "/demo-camera/cabin.mp4",
    location: "Rabat",
    lastSeen: "À l'instant",
  },
  {
    id: "CAM-003",
    vehicleId: "V-005",
    vehicleName: "Dacia Dokker",
    registration: "91014-C-1",
    companyName: "Nord Logistique",
    label: "Caméra arrière",
    position: "Arrière",
    status: "En ligne",
    videoSrc: "/demo-camera/rear.mp4",
    location: "Tanger",
    lastSeen: "Il y a 8 s",
  },
  {
    id: "CAM-004",
    vehicleId: "V-007",
    vehicleName: "Toyota Hilux",
    registration: "66210-A-7",
    companyName: "Sahara Services",
    label: "Caméra avant",
    position: "Route",
    status: "En ligne",
    videoSrc: "/demo-camera/road-front.mp4",
    location: "Agadir",
    lastSeen: "Il y a 4 s",
  },
];

export const demoCameraEvents: DemoCameraEvent[] = demoTelemetryAlerts
  .filter((alert) => Boolean(alert.cameraId))
  .map((alert) => ({
    id: `VE-${alert.id}`,
    cameraId: alert.cameraId ?? "CAM-000",
    vehicleName: alert.vehicle,
    title: alert.type,
    description: `${alert.message} · Clip simulé associé à l'événement télématique.`,
    severity: alert.severity === "Critique" ? "danger" : alert.severity === "Importante" ? "warning" : "info",
    time: `Il y a ${Math.max(2, alert.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 12)} min`,
    clipSrc: alert.clipSrc ?? "/demo-camera/road-front.mp4",
  }));
