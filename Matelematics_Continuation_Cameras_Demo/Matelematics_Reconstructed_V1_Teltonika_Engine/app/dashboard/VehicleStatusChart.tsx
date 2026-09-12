"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { supabase } from "../components/supabase";

type ChartRow = {
  name: "En mouvement" | "À l'arrêt" | "Hors ligne";
  value: number;
  color: string;
};

function getStatus(lastSeenAt: string | null, speed: number) {
  if (!lastSeenAt) {
    return "Hors ligne" as const;
  }

  const ageMs = Date.now() - new Date(lastSeenAt).getTime();

  if (ageMs > 120_000) {
    return "Hors ligne" as const;
  }

  return speed > 2 ? ("En mouvement" as const) : ("À l'arrêt" as const);
}

export default function VehicleStatusChart() {
  const [data, setData] = useState<ChartRow[]>([
    { name: "En mouvement", value: 0, color: "#06b6d4" },
    { name: "À l'arrêt", value: 0, color: "#f59e0b" },
    { name: "Hors ligne", value: 0, color: "#ef4444" },
  ]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const {
          data: devices,
          error: devicesError,
        } = await supabase
          .from("devices")
          .select("vehicle_id,last_seen_at")
          .not("vehicle_id", "is", null);

        if (devicesError) {
          throw devicesError;
        }

        if (!devices || devices.length === 0) {
          if (!cancelled) {
            setData([
              { name: "En mouvement", value: 0, color: "#06b6d4" },
              { name: "À l'arrêt", value: 0, color: "#f59e0b" },
              { name: "Hors ligne", value: 0, color: "#ef4444" },
            ]);
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
          .select("vehicle_id,speed,recorded_at")
          .in("vehicle_id", vehicleIds)
          .order("recorded_at", { ascending: false })
          .limit(500);

        if (positionsError) {
          throw positionsError;
        }

        const latestSpeed = new Map<string, number>();

        for (const position of positionRows ?? []) {
          if (!latestSpeed.has(position.vehicle_id)) {
            latestSpeed.set(position.vehicle_id, position.speed ?? 0);
          }
        }

        const counts = {
          "En mouvement": 0,
          "À l'arrêt": 0,
          "Hors ligne": 0,
        };

        for (const device of devices) {
          if (!device.vehicle_id) {
            continue;
          }

          const status = getStatus(
            device.last_seen_at,
            latestSpeed.get(device.vehicle_id) ?? 0,
          );

          counts[status] += 1;
        }

        if (!cancelled) {
          setData([
            {
              name: "En mouvement",
              value: counts["En mouvement"],
              color: "#06b6d4",
            },
            {
              name: "À l'arrêt",
              value: counts["À l'arrêt"],
              color: "#f59e0b",
            },
            {
              name: "Hors ligne",
              value: counts["Hors ligne"],
              color: "#ef4444",
            },
          ]);
        }
      } catch (error) {
        console.error("[Dashboard fleet status]", error);
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
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={45}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
