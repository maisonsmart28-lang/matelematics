"use client";

import Link from "next/link";
import {
  Truck,
  MapPin,
  Gauge,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";

const vehicles = [
  {
    name: "Renault Express",
    registration: "12345-A-6",
    driver: "Ahmed Benali",
    status: "En ligne",
    location: "Casablanca",
    speed: 62,
    fuel: 78,
    alert: "Aucune",
  },
  {
    name: "Ford Transit",
    registration: "67890-B-7",
    driver: "Youssef Karim",
    status: "En ligne",
    location: "Rabat",
    speed: 48,
    fuel: 54,
    alert: "Carburant faible",
  },
  {
    name: "Dacia Dokker",
    registration: "24680-C-8",
    driver: "Samir El Idrissi",
    status: "Arrêté",
    location: "Tanger",
    speed: 0,
    fuel: 91,
    alert: "Aucune",
  },
  {
    name: "Peugeot Partner",
    registration: "13579-D-9",
    driver: "Omar Alaoui",
    status: "En ligne",
    location: "Marrakech",
    speed: 71,
    fuel: 66,
    alert: "Excès de vitesse",
  },
  {
    name: "Citroën Berlingo",
    registration: "97531-E-4",
    driver: "Karim Amrani",
    status: "Hors ligne",
    location: "Fès",
    speed: 0,
    fuel: 42,
    alert: "Connexion perdue",
  },
];

export default function DemoVehiclesPage() {
  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />

            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Mode démonstration
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white">
            Véhicules
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Visualisez l'état et les informations de votre flotte.
          </p>
        </div>

        <Link
          href="/demo"
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          ← Vue d'ensemble
        </Link>
      </div>

      {/* STATISTIQUES */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                En ligne
              </p>

              <p className="text-2xl font-bold text-white">
                3
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Truck className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Arrêtés
              </p>

              <p className="text-2xl font-bold text-white">
                1
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/50">
              <Gauge className="h-5 w-5 text-slate-300" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Hors ligne
              </p>

              <p className="text-2xl font-bold text-white">
                1
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Alertes
              </p>

              <p className="text-2xl font-bold text-white">
                2
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* RECHERCHE */}

      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
        <Search className="h-5 w-5 text-slate-500" />

        <input
          type="text"
          placeholder="Rechercher un véhicule..."
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
        />
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Flotte
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Données fictives de démonstration
          </p>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1100px]">

            <thead className="border-b border-slate-800 bg-slate-950/50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">

                <th className="px-5 py-4">
                  Véhicule
                </th>

                <th className="px-5 py-4">
                  Conducteur
                </th>

                <th className="px-5 py-4">
                  Position
                </th>

                <th className="px-5 py-4">
                  Vitesse
                </th>

                <th className="px-5 py-4">
                  Carburant
                </th>

                <th className="px-5 py-4">
                  État
                </th>

                <th className="px-5 py-4">
                  Alerte
                </th>

                <th className="px-5 py-4">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">

              {vehicles.map((vehicle) => (

                <tr
                  key={vehicle.registration}
                  className="transition hover:bg-slate-800/40"
                >

                  {/* Véhicule */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Truck className="h-5 w-5 text-blue-400" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-white">
                          {vehicle.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {vehicle.registration}
                        </p>
                      </div>

                    </div>

                  </td>

                  {/* Conducteur */}

                  <td className="px-5 py-4 text-sm text-slate-300">
                    {vehicle.driver}
                  </td>

                  {/* Position */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2">

                      <MapPin className="h-4 w-4 text-cyan-400" />

                      <span className="text-sm text-slate-300">
                        {vehicle.location}
                      </span>

                    </div>

                  </td>

                  {/* Vitesse */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2">

                      <Gauge className="h-4 w-4 text-slate-500" />

                      <span className="text-sm text-slate-300">
                        {vehicle.speed} km/h
                      </span>

                    </div>

                  </td>

                  {/* Carburant */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2">

                      <Fuel className="h-4 w-4 text-amber-400" />

                      <span className="text-sm text-slate-300">
                        {vehicle.fuel}%
                      </span>

                    </div>

                  </td>

                  {/* État */}

                  <td className="px-5 py-4">

                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        vehicle.status === "En ligne"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : vehicle.status === "Arrêté"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {vehicle.status}
                    </span>

                  </td>

                  {/* Alerte */}

                  <td className="px-5 py-4">

                    <span
                      className={`text-xs font-medium ${
                        vehicle.alert === "Aucune"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {vehicle.alert}
                    </span>

                  </td>

                  {/* ACTIONS */}

                  <td className="px-5 py-4">

                    <Link
                      href={`/demo/vehicles/${vehicle.registration}`}
                      className="inline-flex whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                    >
                      Plus de détails
                    </Link>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}