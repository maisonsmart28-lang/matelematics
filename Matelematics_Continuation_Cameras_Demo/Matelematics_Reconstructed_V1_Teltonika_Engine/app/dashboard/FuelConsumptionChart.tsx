"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function FuelConsumptionChart() {
  const [data, setData] = useState([{ day: "Lun", fuel: 420 }, { day: "Mar", fuel: 510 }, { day: "Mer", fuel: 480 }, { day: "Jeu", fuel: 610 }, { day: "Ven", fuel: 560 }, { day: "Sam", fuel: 430 }, { day: "Dim", fuel: 390 }]);

  useEffect(() => {
    void fetch("/api/demo/fleet", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as { fuelWeek: { day: string; fuel: number }[] };
      setData(payload.fuelWeek);
    }).catch(() => undefined);
  }, []);

  return <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><defs><linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#27272a" /><XAxis dataKey="day" stroke="#a1a1aa" /><YAxis stroke="#a1a1aa" /><Tooltip /><Area type="monotone" dataKey="fuel" stroke="#06b6d4" fill="url(#fuelGradient)" strokeWidth={3} /></AreaChart></ResponsiveContainer></div>;
}
