"use client";

import { Fuel } from "lucide-react";

export default function FuelConsumptionChart() {
  return (
    <div className="flex h-80 w-full items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
          <Fuel className="h-6 w-6 text-amber-400" />
        </div>

        <p className="mt-4 text-sm font-medium text-zinc-200">
          Historique de consommation réel indisponible
        </p>

        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Aucun graphique de démonstration n’est affiché sur le dashboard réel.
          Cette zone sera alimentée uniquement à partir des données carburant
          réellement remontées et historisées par les trackers compatibles.
        </p>
      </div>
    </div>
  );
}
