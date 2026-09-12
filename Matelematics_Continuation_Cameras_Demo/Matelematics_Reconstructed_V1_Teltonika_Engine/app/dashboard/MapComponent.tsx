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

function resolveStatus(lastSeenAt: string | null, speed: number) {
  if (!lastSeenAt) {
    return "offline" as const;
  }

  const ageMs = Date.now() - new Date(lastSeenAt).getTime();

  if (ageMs > 120_000) {
    return "offline" as const;
  }

  return speed > 2 ? ("en route" as const) : ("online" as const);
}

export default function MapComponent() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [route] = useState<RoutePoint[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: devices,
          error: devicesError,
        } = await supabase
          .from("devices")
          .select("id,vehicle_id,last_seen_at")
          .not("vehicle_id", "is", null);

        if (devicesError) {
          throw devicesError;
        }

        if (!devices || devices.length === 0) {
          if (!cancelled) {
            setVehicles([]);
          }
          return;
        }

        const vehicleIds = devices
          .map((device) => device.vehicle_id)
          .filter((id): id is string => Boolean(id));

        const {
          data: positionRows,
          error: positionsError,
        } = await supabase
          .from("positions")
          .select("vehicle_id,latitude,longitude,speed,recorded_at")
          .in("vehicle_id", vehicleIds)
          .order("recorded_at", { ascending: false })
          .limit(500);

        if (positionsError) {
          throw positionsError;
        }

        const latestPosition = new Map<
          string,
          NonNullable<typeof positionRows>[number]
        >();

        for (const position of positionRows ?? []) {
          if (!latestPosition.has(position.vehicle_id)) {
            latestPosition.set(position.vehicle_id, position);
          }
        }

        const mapped: Vehicle[] = [];

        for (const device of devices) {
          if (!device.vehicle_id) {
            continue;
          }

          const position = latestPosition.get(device.vehicle_id);

          if (
            !position ||
            position.latitude === null ||
            position.longitude === null
          ) {
            continue;
          }

          const speed = position.speed ?? 0;

          mapped.push({
            lat: position.latitude,
            lng: position.longitude,
            status: resolveStatus(device.last_seen_at, speed),
            vehicleId: device.vehicle_id,
          });
        }

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
