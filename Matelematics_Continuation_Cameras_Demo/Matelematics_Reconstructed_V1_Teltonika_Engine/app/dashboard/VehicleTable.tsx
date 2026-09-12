"use client";

import { Eye, Fuel, Gauge, MapPin, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "../components/supabase";

type VehicleStatus = "En mouvement" | "À l'arrêt" | "Hors ligne";

type FleetVehicle = {
  id: string;
  name: string;
  registration: string;
  driver: string;
  motionStatus: VehicleStatus;
  position: {
    lat: number | null;
    lng: number | null;
    speed: number | null;
    heading: number | null;
    recordedAt: string;
  } | null;
};

type VehicleRow = {
  id: string;
  name: string;
  registration: string;
  driver: string;
  location: string;
  speed: number | null;
  fuel: number | null;
  status: VehicleStatus;
};

function formatCoordinates(latitude: number | null, longitude: number | null) {
  if (latitude === null || longitude === null) {
    return "Position indisponible";
  }

  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export default function VehicleTable() {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Session expirée.");
        }

        const response = await fetch("/api/dashboard/fleet", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await response.json()) as {
          vehicles?: FleetVehicle[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger les véhicules.");
        }

        const mapped: VehicleRow[] = (payload.vehicles ?? [])
          .slice(0, 6)
          .map((vehicle) => ({
            id: vehicle.id,
            name: vehicle.name,
            registration: vehicle.registration,
            driver: vehicle.driver,
            location: formatCoordinates(
              vehicle.position?.lat ?? null,
              vehicle.position?.lng ?? null,
            ),
            speed:
              vehicle.motionStatus === "Hors ligne"
                ? null
                : (vehicle.position?.speed ?? null),
            fuel: null,
            status: vehicle.motionStatus,
          }));

        if (!cancelled) {
          setVehicles(mapped);
        }
      } catch (error) {
        console.error("[Dashboard vehicle table]", error);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
            <th className="py-4">Véhicule</th>
            <th>Conducteur</th>
            <th>Dernière position</th>
            <th>Vitesse</th>
            <th>Carburant</th>
            <th>État</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr
              key={vehicle.id}
              className="border-b border-zinc-800 transition hover:bg-zinc-900"
            >
              <td className="py-4 font-medium text-white">
                <div>{vehicle.name}</div>
                <div className="mt-1 text-xs font-normal text-zinc-500">
                  {vehicle.registration}
                </div>
              </td>
              <td className="text-zinc-300">{vehicle.driver}</td>
              <td>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-400" />
                  <span className="text-zinc-300">{vehicle.location}</span>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-yellow-400" />
                  <span>
                    {vehicle.speed === null ? "—" : `${vehicle.speed} km/h`}
                  </span>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-green-400" />
                  <span>{vehicle.fuel === null ? "—" : `${vehicle.fuel}%`}</span>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Wifi
                    className={`h-4 w-4 ${
                      vehicle.status === "Hors ligne"
                        ? "text-zinc-500"
                        : "text-green-400"
                    }`}
                  />
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      vehicle.status === "Hors ligne"
                        ? "bg-zinc-700/40 text-zinc-400"
                        : vehicle.status === "À l'arrêt"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>
              </td>
              <td className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `/dashboard/vehicle/${vehicle.id}`;
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm text-white transition hover:bg-cyan-600"
                >
                  <Eye className="h-4 w-4" />
                  Voir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
