"use client";

import { Eye, MapPin, Gauge, Fuel, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import type { DemoVehicle } from "../../lib/demo-fleet";

export default function VehicleTable() {
  const [vehicles, setVehicles] = useState<DemoVehicle[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/demo/fleet", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { vehicles: DemoVehicle[] };
        if (!cancelled) setVehicles(payload.vehicles.slice(0, 6));
      } catch {
        // La table reste vide si la source de démonstration n'est pas disponible.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full">
        <thead><tr className="border-b border-zinc-800 text-left text-sm text-zinc-400">
          <th className="py-4">Véhicule</th><th>Conducteur</th><th>Position</th><th>Vitesse</th><th>Carburant</th><th>État</th><th className="text-right">Action</th>
        </tr></thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id} className="border-b border-zinc-800 transition hover:bg-zinc-900">
              <td className="py-4 font-medium text-white">{vehicle.name}</td>
              <td className="text-zinc-300">{vehicle.driver}</td>
              <td><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-400" /><span className="text-zinc-300">{vehicle.location}</span></div></td>
              <td><div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-yellow-400" /><span>{vehicle.speed} km/h</span></div></td>
              <td><div className="flex items-center gap-2"><Fuel className="h-4 w-4 text-green-400" /><span>{vehicle.fuel}%</span></div></td>
              <td><div className="flex items-center gap-2"><Wifi className={`h-4 w-4 ${vehicle.status === "Hors ligne" ? "text-zinc-500" : "text-green-400"}`} /><span className={`rounded-full px-3 py-1 text-xs font-medium ${vehicle.status === "Hors ligne" ? "bg-zinc-700/40 text-zinc-400" : vehicle.status === "À l'arrêt" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>{vehicle.status}</span></div></td>
              <td className="text-right"><button
                type="button"
                onClick={() => {
                  const demo =
                    window.location.pathname.startsWith(
                      "/demo"
                    );

                  window.location.href =
                    demo
                      ? "/demo/vehicles/" +
                        encodeURIComponent(
                          vehicle.registration
                        )
                      : "/dashboard/vehicle/" +
                        vehicle.id;
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm text-white transition hover:bg-cyan-600"
              >
                <Eye className="h-4 w-4" />
                Voir
              </button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
