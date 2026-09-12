"use client";

import { Activity, Clock, MapPin, Truck, User } from "lucide-react";
import { useEffect, useState } from "react";

import { supabase } from "../components/supabase";

type FleetVehicle = {
  id: string;
  name: string;
  driver: string;
  status: string;
  motionStatus: "En mouvement" | "À l'arrêt" | "Hors ligne";
  lastSeenAt: string | null;
  position: {
    lat: number | null;
    lng: number | null;
    speed: number | null;
    heading: number | null;
    recordedAt: string;
  } | null;
};

function formatLocation(vehicle: FleetVehicle) {
  const lat = vehicle.position?.lat;
  const lng = vehicle.position?.lng;

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return "Position indisponible";
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function formatLastSeen(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return "Dernière connexion inconnue";
  }

  const timestamp = new Date(lastSeenAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Dernière connexion inconnue";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) {
    return `Il y a ${diffSeconds} sec`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Il y a ${diffDays} j`;
}

export default function DriverActivity() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);

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
          throw new Error(payload.error ?? "Impossible de charger l'activité de la flotte.");
        }

        const activeVehicles = (payload.vehicles ?? [])
          .filter((vehicle) => vehicle.status === "En ligne")
          .sort((a, b) => {
            const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
            const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
            return bTime - aTime;
          })
          .slice(0, 4);

        if (!cancelled) {
          setVehicles(activeVehicles);
        }
      } catch (error) {
        console.error("[Dashboard fleet activity]", error);

        if (!cancelled) {
          setVehicles([]);
        }
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
        Aucun véhicule connecté actuellement.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vehicles.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-cyan-500"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                <User className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{item.driver}</h3>
                <p className="text-sm text-zinc-400">{item.name}</p>
              </div>
            </div>
            <Activity className="h-5 w-5 text-green-400" />
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-zinc-300">
              <MapPin className="h-4 w-4 text-cyan-400" />
              {formatLocation(item)}
            </div>

            <div className="flex items-center gap-2 text-zinc-300">
              <Truck className="h-4 w-4 text-green-400" />
              {item.motionStatus}
            </div>

            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="h-4 w-4" />
              {formatLastSeen(item.lastSeenAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
