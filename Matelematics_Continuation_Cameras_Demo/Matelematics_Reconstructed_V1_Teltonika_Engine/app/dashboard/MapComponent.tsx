"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { DemoVehicle } from "../../lib/demo-fleet";

type Vehicle = { lat: number; lng: number; status: "online" | "en route" | "offline"; vehicleId: string };
type RoutePoint = { lat: number; lng: number };

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="flex h-full min-h-[500px] w-full items-center justify-center bg-slate-950"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" /><p className="text-sm text-slate-400">Chargement de la carte...</p></div></div>,
});

export default function MapComponent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [route, setRoute] = useState<RoutePoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/demo/fleet", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { vehicles: DemoVehicle[] };
        if (cancelled) return;
        const mapped = payload.vehicles.map((vehicle) => ({
          lat: vehicle.lat,
          lng: vehicle.lng,
          status: vehicle.status === "Hors ligne" ? "offline" as const : vehicle.status === "En mouvement" ? "en route" as const : "online" as const,
          vehicleId: vehicle.id,
        }));
        setVehicles(mapped);
        setRoute(mapped.filter((vehicle) => vehicle.status !== "offline").map(({ lat, lng }) => ({ lat, lng })));
      } catch {
        // La carte conserve son état courant si l'API de simulation est indisponible.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  return <div className="relative h-[65vh] min-h-[500px] w-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-950"><LeafletMap vehicles={vehicles} route={route} /></div>;
}
