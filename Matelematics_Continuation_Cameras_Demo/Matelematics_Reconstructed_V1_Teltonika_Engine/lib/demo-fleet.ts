export type DemoVehicleStatus = "En ligne" | "En mouvement" | "À l'arrêt" | "Hors ligne";

export type DemoVehicle = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  registration: string;
  driver: string;
  location: string;
  lat: number;
  lng: number;
  speed: number;
  fuel: number;
  status: DemoVehicleStatus;
  trackerImei: string;
  deviceModel: "FMC125" | "FMC150" | "FMC650";
};

export const demoVehicles: DemoVehicle[] = [
  { id: "V-001", companyId: "demo-atlas", companyName: "Atlas Distribution", name: "Renault Express", registration: "12345-A-6", driver: "Ahmed Benali", location: "Casablanca", lat: 33.5731, lng: -7.5898, speed: 48, fuel: 72, status: "En mouvement", trackerImei: "356307042441234", deviceModel: "FMC150" },
  { id: "V-002", companyId: "demo-atlas", companyName: "Atlas Distribution", name: "Ford Transit", registration: "55218-B-6", driver: "Youssef Karim", location: "Rabat", lat: 34.0209, lng: -6.8416, speed: 81, fuel: 48, status: "En mouvement", trackerImei: "356307042441235", deviceModel: "FMC150" },
  { id: "V-003", companyId: "demo-atlas", companyName: "Atlas Distribution", name: "Mercedes Sprinter", registration: "77920-A-6", driver: "Samir Idrissi", location: "Tanger", lat: 35.7595, lng: -5.8340, speed: 0, fuel: 91, status: "À l'arrêt", trackerImei: "356307042441236", deviceModel: "FMC125" },
  { id: "V-004", companyId: "demo-nord", companyName: "Nord Logistique", name: "Peugeot Partner", registration: "22109-D-1", driver: "Hassan El Alaoui", location: "Marrakech", lat: 31.6295, lng: -7.9811, speed: 54, fuel: 63, status: "En ligne", trackerImei: "356307042441237", deviceModel: "FMC125" },
  { id: "V-005", companyId: "demo-nord", companyName: "Nord Logistique", name: "Dacia Dokker", registration: "91014-C-1", driver: "Omar Tazi", location: "Tanger", lat: 35.7650, lng: -5.8200, speed: 39, fuel: 56, status: "En mouvement", trackerImei: "356307042441238", deviceModel: "FMC150" },
  { id: "V-006", companyId: "demo-nord", companyName: "Nord Logistique", name: "Fiat Ducato", registration: "34081-D-1", driver: "Mehdi Amrani", location: "Kénitra", lat: 34.2610, lng: -6.5802, speed: 0, fuel: 35, status: "Hors ligne", trackerImei: "356307042441239", deviceModel: "FMC650" },
  { id: "V-007", companyId: "demo-sahara", companyName: "Sahara Services", name: "Toyota Hilux", registration: "66210-A-7", driver: "Karim Berrada", location: "Agadir", lat: 30.4278, lng: -9.5981, speed: 66, fuel: 77, status: "En mouvement", trackerImei: "356307042441240", deviceModel: "FMC650" },
  { id: "V-008", companyId: "demo-sahara", companyName: "Sahara Services", name: "Isuzu D-Max", registration: "14590-B-7", driver: "Nabil Chraibi", location: "Agadir", lat: 30.4378, lng: -9.5881, speed: 0, fuel: 82, status: "En ligne", trackerImei: "356307042441241", deviceModel: "FMC650" },
];

export type DemoTelemetryAlertType =
  | "Excès de vitesse"
  | "Freinage brusque"
  | "Accélération forte"
  | "Distraction"
  | "Carburant"
  | "Batterie"
  | "Géozone";

export type DemoTelemetryAlertSeverity = "Critique" | "Importante" | "Information";
export type DemoTelemetryAlertStatus = "Active" | "Résolue";

export type DemoTelemetryAlert = {
  id: string;
  vehicleId: string;
  vehicle: string;
  registration: string;
  companyName: string;
  type: DemoTelemetryAlertType;
  severity: DemoTelemetryAlertSeverity;
  message: string;
  location: string;
  date: string;
  time: string;
  status: DemoTelemetryAlertStatus;
  cameraId?: string;
  clipSrc?: string;
};

export const demoTelemetryAlerts: DemoTelemetryAlert[] = [
  {
    id: "ALERT-101",
    vehicleId: "V-002",
    vehicle: "Ford Transit",
    registration: "55218-B-6",
    companyName: "Atlas Distribution",
    type: "Excès de vitesse",
    severity: "Critique",
    message: "Vitesse supérieure à la limite autorisée",
    location: "Boulevard Mohammed V, Casablanca",
    date: "2026-08-24",
    time: "10:37",
    status: "Active",
    cameraId: "CAM-002",
    clipSrc: "/demo-camera/cabin.mp4",
  },
  {
    id: "ALERT-102",
    vehicleId: "V-001",
    vehicle: "Renault Express",
    registration: "12345-A-6",
    companyName: "Atlas Distribution",
    type: "Freinage brusque",
    severity: "Importante",
    message: "Freinage brusque détecté sur le trajet actuel",
    location: "Aïn Sebaâ, Casablanca",
    date: "2026-08-24",
    time: "10:21",
    status: "Active",
    cameraId: "CAM-001",
    clipSrc: "/demo-camera/road-front.mp4",
  },
  {
    id: "ALERT-103",
    vehicleId: "V-005",
    vehicle: "Dacia Dokker",
    registration: "91014-C-1",
    companyName: "Nord Logistique",
    type: "Distraction",
    severity: "Critique",
    message: "Distraction du conducteur détectée pendant le déplacement",
    location: "Boulevard d'Azemmour, Tanger",
    date: "2026-08-24",
    time: "09:48",
    status: "Active",
    cameraId: "CAM-003",
    clipSrc: "/demo-camera/rear.mp4",
  },
  {
    id: "ALERT-104",
    vehicleId: "V-007",
    vehicle: "Toyota Hilux",
    registration: "66210-A-7",
    companyName: "Sahara Services",
    type: "Accélération forte",
    severity: "Importante",
    message: "Accélération forte détectée sur un segment urbain",
    location: "Agadir Centre",
    date: "2026-08-23",
    time: "18:42",
    status: "Résolue",
    cameraId: "CAM-004",
    clipSrc: "/demo-camera/road-front.mp4",
  },
  {
    id: "ALERT-105",
    vehicleId: "V-003",
    vehicle: "Mercedes Sprinter",
    registration: "77920-A-6",
    companyName: "Atlas Distribution",
    type: "Carburant",
    severity: "Information",
    message: "Niveau de carburant inférieur à 15 %",
    location: "Mohammedia",
    date: "2026-08-24",
    time: "09:14",
    status: "Active",
  },
];

export function buildDemoTelemetryAlerts() {
  return demoTelemetryAlerts.map((alert) => ({ ...alert }));
}

export function buildVehicleTelemetryHistory(vehicleId: string) {
  const vehicle = demoVehicles.find((entry) => entry.id === vehicleId) ?? demoVehicles[0];
  const alert =
    demoTelemetryAlerts.find((entry) => entry.vehicleId === vehicleId) ??
    demoTelemetryAlerts[0];

  return [
    {
      id: `${vehicleId}-start`,
      date: "2026-08-24",
      time: "08:42",
      event: "Départ",
      location: vehicle.location,
      description: "Début du trajet",
      detail: `Kilométrage : ${vehicle.speed} km/h`,
      type: "start" as const,
    },
    {
      id: `${vehicleId}-movement`,
      date: "2026-08-24",
      time: "09:18",
      event: "En mouvement",
      location: alert.location,
      description: "Véhicule en déplacement",
      detail: `Vitesse : ${vehicle.speed} km/h`,
      type: "movement" as const,
    },
    {
      id: `${vehicleId}-alert`,
      date: alert.date,
      time: alert.time,
      event: alert.type,
      location: alert.location,
      description: "Événement télématique simulé",
      detail: `${alert.message} · ${alert.severity}`,
      type: "alert" as const,
    },
    {
      id: `${vehicleId}-end`,
      date: "2026-08-24",
      time: "11:24",
      event: "Arrivée",
      location: "Rabat",
      description: "Fin du trajet",
      detail: `Distance parcourue : ${Math.max(15, vehicle.speed * 2)} km`,
      type: "end" as const,
    },
  ];
}

export function buildDemoHistoryEvents() {
  return demoVehicles.flatMap((vehicle) => {
    const alert = demoTelemetryAlerts.find((entry) => entry.vehicleId === vehicle.id) ?? demoTelemetryAlerts[0];

    return [
      {
        id: `${vehicle.id}-home-${alert.id}`,
        vehicle: vehicle.name,
        registration: vehicle.registration,
        type: "Trajet" as const,
        date: "24 août 2026",
        time: "10:42",
        location: vehicle.location,
        destination: alert.location,
        distance: `${Math.max(12, vehicle.speed * 0.3).toFixed(1)} km`,
        duration: "32 min",
        speed: `${vehicle.speed} km/h`,
        dateValue: "2026-08-24",
      },
      {
        id: `${vehicle.id}-alert-${alert.id}`,
        vehicle: vehicle.name,
        registration: vehicle.registration,
        type: "Alerte" as const,
        date: "24 août 2026",
        time: alert.time,
        location: alert.location,
        destination: "—",
        distance: "—",
        duration: "—",
        speed: `${vehicle.speed} km/h`,
        dateValue: "2026-08-24",
      },
    ];
  });
}

export function buildDemoSnapshot(now = new Date()) {
  const pulse = Math.floor(now.getTime() / 15_000);
  const vehicles = demoVehicles.map((vehicle, index) => {
    if (vehicle.status === "Hors ligne" || vehicle.status === "À l'arrêt") return vehicle;
    const delta = ((pulse + index) % 5) - 2;
    return {
      ...vehicle,
      speed: Math.max(0, vehicle.speed + delta),
      lat: vehicle.lat + delta * 0.00008,
      lng: vehicle.lng + delta * 0.00006,
    };
  });

  const online = vehicles.filter((vehicle) => vehicle.status !== "Hors ligne").length;
  const drivers = vehicles.filter((vehicle) => vehicle.status === "En mouvement").length;
  const distance = 1240 + (pulse % 500) * 3;
  const fuel = 386 + (pulse % 120);
  const alerts = 4;
  const trips = 18 + (pulse % 9);

  return {
    generatedAt: now.toISOString(),
    mode: "simulation" as const,
    stats: { online, total: vehicles.length, fuel, alerts, distance, drivers, trips },
    vehicles,
    fuelWeek: [
      { day: "Lun", fuel: 420 }, { day: "Mar", fuel: 510 }, { day: "Mer", fuel: 480 },
      { day: "Jeu", fuel: 610 }, { day: "Ven", fuel: 560 }, { day: "Sam", fuel: 430 }, { day: "Dim", fuel },
    ],
  };
}
