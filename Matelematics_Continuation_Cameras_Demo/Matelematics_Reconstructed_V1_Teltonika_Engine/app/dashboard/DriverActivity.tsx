"use client";

import { Activity, Clock, MapPin, Truck, User } from "lucide-react";
import { useEffect, useState } from "react";
import type { DemoVehicle } from "../../lib/demo-fleet";

export default function DriverActivity() {
  const [vehicles, setVehicles] = useState<DemoVehicle[]>([]);

  useEffect(() => {
    void fetch("/api/demo/fleet", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as { vehicles: DemoVehicle[] };
      setVehicles(payload.vehicles.filter((vehicle) => vehicle.status !== "Hors ligne").slice(0, 4));
    }).catch(() => undefined);
  }, []);

  return <div className="space-y-4">{vehicles.map((item, index) => <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-cyan-500"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800"><User className="h-5 w-5 text-cyan-400" /></div><div><h3 className="font-semibold text-white">{item.driver}</h3><p className="text-sm text-zinc-400">{item.name}</p></div></div><Activity className="h-5 w-5 text-green-400" /></div><div className="mt-4 space-y-2 text-sm"><div className="flex items-center gap-2 text-zinc-300"><MapPin className="h-4 w-4 text-cyan-400" />{item.location}</div><div className="flex items-center gap-2 text-zinc-300"><Truck className="h-4 w-4 text-green-400" />{item.status}</div><div className="flex items-center gap-2 text-zinc-400"><Clock className="h-4 w-4" />Il y a {2 + index * 7} min</div></div></div>)}</div>;
}
