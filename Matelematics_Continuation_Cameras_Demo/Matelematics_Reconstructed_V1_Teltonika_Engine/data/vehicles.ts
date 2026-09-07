export interface Vehicle {
  id: string;
  name: string;
  model: string;
  year: string;
  driver: string;
  client: string;
  status: 'online' | 'offline' | 'idle' | 'maintenance';
  speed: string;
  fuel: string;
  battery: string;
  engineTemp: string;
  rpm: string;
  odometer: string;
  latitude: string;
  longitude: string;
  lastUpdate: string;
  vin: string;
  imei: string;
  simNumber: string;
  alerts: string[];
  diagnostics: string[];
  sensors: string[];
}

export const mockVehicles: Vehicle[] = [
  {
    id: "truck-01",
    name: "Renault Express",
    model: "Express Van",
    year: "2025",
    driver: "Ahmed Benali",
    client: "Transport Atlas",
    status: "online",
    speed: "78",
    fuel: "80",
    battery: "92",
    engineTemp: "84",
    rpm: "2800",
    odometer: "15400",
    latitude: "33.5731",
    longitude: "-7.5898",
    lastUpdate: new Date().toISOString(),
    vin: "VF1ABC123",
    imei: "356245789654",
    simNumber: "+212612345678",
    alerts: [
      "Survitesse détectée",
      "Température moteur élevée"
    ],
    diagnostics: [
      "P0300 Ratés d'allumage",
      "P0171 Mélange pauvre"
    ],
    sensors: [
      "GPS",
      "Carburant",
      "Batterie",
      "OBD",
      "Température",
      "Pneus"
    ]
  },
  {
    id: "van-02",
    name: "Peugeot Partner",
    model: "Partner Tepee",
    year: "2024",
    driver: "Youssef Alami",
    client: "Transport Atlas",
    status: "offline",
    speed: "0",
    fuel: "15",
    battery: "30",
    engineTemp: "40",
    rpm: "0",
    odometer: "89200",
    latitude: "33.5732",
    longitude: "-7.5899",
    lastUpdate: new Date(Date.now() - 3600000).toISOString(),
    vin: "VF3ABC456",
    imei: "356245789655",
    simNumber: "+212612345679",
    alerts: [],
    diagnostics: [
      "P0420 Catalyseur inférieur au seuil"
    ],
    sensors: [
      "GPS",
      "Carburant",
      "Batterie",
      "OBD"
    ]
  },
  {
    id: "sedan-03",
    name: "Dacia Logan",
    model: "Logan MCV",
    year: "2023",
    driver: "Fatima Zahra",
    client: "Logistics Maroc",
    status: "idle",
    speed: "0",
    fuel: "45",
    battery: "85",
    engineTemp: "70",
    rpm: "800",
    odometer: "45600",
    latitude: "33.5730",
    longitude: "-7.5897",
    lastUpdate: new Date(Date.now() - 300000).toISOString(),
    vin: "VS1ABC789",
    imei: "356245789656",
    simNumber: "+212612345680",
    alerts: [
      "Maintenance requise"
    ],
    diagnostics: [],
    sensors: [
      "GPS",
      "Carburant",
      "Batterie",
      "OBD",
      "Température"
    ]
  },
  {
    id: "van-04",
    name: "Mercedes Sprinter",
    model: "Sprinter 319 CDI",
    year: "2025",
    driver: "Karim Bennani",
    client: "Logistics Maroc",
    status: "online",
    speed: "65",
    fuel: "60",
    battery: "88",
    engineTemp: "82",
    rpm: "2500",
    odometer: "22000",
    latitude: "33.5733",
    longitude: "-7.5900",
    lastUpdate: new Date(Date.now() - 120000).toISOString(),
    vin: "WDD2040081A123456",
    imei: "356245789657",
    simNumber: "+212612345681",
    alerts: [
      "Pression des pneus basse"
    ],
    diagnostics: [
      "P0562 Tension système basse"
    ],
    sensors: [
      "GPS",
      "Carburant",
      "Batterie",
      "OBD",
      "Pression pneus",
      "Niveau huile"
    ]
  }
];
