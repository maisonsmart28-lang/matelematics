"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";

import L from "leaflet";

type Vehicle = {
  lat: number;
  lng: number;
  status: "online" | "en route" | "offline";
  vehicleId: string;
};

type RoutePoint = {
  lat: number;
  lng: number;
};

type Props = {
  vehicles: Vehicle[];
  route: RoutePoint[];
};

const vehicleIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",

  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function LeafletMap({
  vehicles,
  route,
}: Props) {
  return (
    <MapContainer
      center={[33.555, -7.59]}
      zoom={12}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {vehicles.map((vehicle) => (
        <Marker
          key={vehicle.vehicleId}
          position={[vehicle.lat, vehicle.lng]}
          icon={vehicleIcon}
        >
          <Popup>
            <div className="min-w-[180px] p-2">
              <h3 className="mb-2 text-base font-semibold">
                {vehicle.vehicleId}
              </h3>

              <p className="text-sm">
                <strong>Statut :</strong>{" "}
                {vehicle.status === "en route"
                  ? "En mouvement"
                  : vehicle.status === "online"
                    ? "En ligne"
                    : "Hors ligne"}
              </p>

              <p className="text-sm">
                <strong>Position :</strong>{" "}
                {vehicle.lat.toFixed(4)},{" "}
                {vehicle.lng.toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {route.length > 1 && (
        <Polyline
          positions={route.map(
            (point) =>
              [point.lat, point.lng] as [number, number]
          )}
          pathOptions={{
            color: "#2563EB",
            weight: 4,
            opacity: 0.7,
          }}
        />
      )}
    </MapContainer>
  );
}