"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { DemoVehicle } from "../../lib/demo-fleet";

export default function VehicleStatusChart() {
  const [data, setData] = useState([
    { name: "En ligne", value: 3, color: "#22c55e" },
    { name: "En mouvement", value: 3, color: "#06b6d4" },
    { name: "À l'arrêt", value: 1, color: "#f59e0b" },
    { name: "Hors ligne", value: 1, color: "#ef4444" },
  ]);

  useEffect(() => {
    void fetch("/api/demo/fleet", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as { vehicles: DemoVehicle[] };
      const counts = payload.vehicles.reduce<Record<string, number>>((acc, vehicle) => {
        acc[vehicle.status] = (acc[vehicle.status] ?? 0) + 1;
        return acc;
      }, {});
      setData([
        { name: "En ligne", value: counts["En ligne"] ?? 0, color: "#22c55e" },
        { name: "En mouvement", value: counts["En mouvement"] ?? 0, color: "#06b6d4" },
        { name: "À l'arrêt", value: counts["À l'arrêt"] ?? 0, color: "#f59e0b" },
        { name: "Hors ligne", value: counts["Hors ligne"] ?? 0, color: "#ef4444" },
      ]);
    }).catch(() => undefined);
  }, []);

  return <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={4} dataKey="value">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>;
}
