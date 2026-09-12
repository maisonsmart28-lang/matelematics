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

type FleetVehicle = {
  id: string;
  motionStatus: "En mouvement" | "À l'arrêt" | "Hors ligne";
};

const emptyData: ChartRow[] = [
  { name: "En mouvement", value: 0, color: "#06b6d4" },
  { name: "À l'arrêt", value: 0, color: "#f59e0b" },
  { name: "Hors ligne", value: 0, color: "#ef4444" },
];

export default function VehicleStatusChart() {
  const [data, setData] = useState<ChartRow[]>(emptyData);

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
          throw new Error(
            payload.error ?? "Impossible de charger l'état de la flotte.",
          );
        }

        const counts = {
          "En mouvement": 0,
          "À l'arrêt": 0,
          "Hors ligne": 0,
        };

        for (const vehicle of payload.vehicles ?? []) {
          counts[vehicle.motionStatus] += 1;
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

        if (!cancelled) {
          setData(emptyData);
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
