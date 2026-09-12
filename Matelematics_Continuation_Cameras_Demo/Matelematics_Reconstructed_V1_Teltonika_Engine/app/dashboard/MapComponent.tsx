"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { supabase } from "../components/supabase";

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

type FleetVehicle = {
  id: string;
  motionStatus: "En mouvement" | "À l'arrêt" | "Hors ligne";
  position: {
    lat: number | null;
    lng: number | null;
    speed: number | null;
    heading: number | null;
    recordedAt: string;
  } | null;
};

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[500px] w-full items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
        <p className="text-sm text-slate-400">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

export default function MapComponent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [route] = useState<RoutePoint[]>([]);

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
          throw new Error(payload.error ?? "Impossible de charger la carte.");
        }

        const mapped: Vehicle[] = (payload.vehicles ?? [])
          .filter(
            (vehicle) =>
              vehicle.position?.lat !== null &&
              vehicle.position?.lat !== undefined &&
              vehicle.position?.lng !== null &&
              vehicle.position?.lng !== undefined,
          )
          .map((vehicle) => ({
            lat: vehicle.position!.lat as number,
            lng: vehicle.position!.lng as number,
            status:
              vehicle.motionStatus === "En mouvement"
                ? ("en route" as const)
                : vehicle.motionStatus === "Hors ligne"
                  ? ("offline" as const)
                  : ("online" as const),
            vehicleId: vehicle.id,
          }));

        if (!cancelled) {
          setVehicles(mapped);
        }
      } catch (error) {
        console.error("[Dashboard overview map]", error);
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
    <div className="relative h-[65vh] min-h-[500px] w-full overflow-hidden rounded-3xl border border-slate-700 bg-slate-950">
      <LeafletMap vehicles={vehicles} route={route} />
    </div>
  );
}
