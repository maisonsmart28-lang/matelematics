"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Droplets,
  Fuel,
  Gauge,
  TrendingDown,
  Truck,
} from "lucide-react";

const vehicles = [
  {
    name: "Renault Express",
    registration: "12345-A-6",
    consumption: "8,4 L/100 km",
    fuel: "42 L",
    distance: "500 km",
    trend: "+2,1%",
  },
  {
    name: "Ford Transit",
    registration: "67890-B-7",
    consumption: "9,1 L/100 km",
    fuel: "51 L",
    distance: "560 km",
    trend: "-1,4%",
  },
  {
    name: "Dacia Dokker",
    registration: "24680-C-8",
    consumption: "7,2 L/100 km",
    fuel: "34 L",
    distance: "472 km",
    trend: "-4,2%",
  },
  {
    name: "Peugeot Partner",
    registration: "13579-D-9",
    consumption: "7,8 L/100 km",
    fuel: "38 L",
    distance: "487 km",
    trend: "+0,8%",
  },
  {
    name: "Renault Kangoo",
    registration: "11223-E-4",
    consumption: "8,7 L/100 km",
    fuel: "46 L",
    distance: "529 km",
    trend: "-2,6%",
  },
];

const history = [
  {
    date: "26 août 2026",
    vehicle: "Renault Express",
    liters: "42 L",
    distance: "500 km",
    cost: "630 DH",
  },
  {
    date: "25 août 2026",
    vehicle: "Ford Transit",
    liters: "51 L",
    distance: "560 km",
    cost: "765 DH",
  },
  {
    date: "24 août 2026",
    vehicle: "Dacia Dokker",
    liters: "34 L",
    distance: "472 km",
    cost: "510 DH",
  },
  {
    date: "23 août 2026",
    vehicle: "Peugeot Partner",
    liters: "38 L",
    distance: "487 km",
    cost: "570 DH",
  },
];

const chartData = [
  { day: "20", value: 310 },
  { day: "21", value: 355 },
  { day: "22", value: 330 },
  { day: "23", value: 390 },
  { day: "24", value: 365 },
  { day: "25", value: 420 },
  { day: "26", value: 400 },
];

export default function DemoFuelPage() {
  const maxValue = Math.max(...chartData.map((item) => item.value));

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />

              <span className="text-xs font-medium uppercase tracking-wider text-amber-400">
                Gestion carburant — Démonstration
              </span>

            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Carburant
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Suivez la consommation et les performances énergétiques de votre flotte.
            </p>

          </div>

          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Fuel className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <p className="text-xs text-zinc-500">
                Données
              </p>

              <p className="text-sm font-semibold text-amber-400">
                Démonstration
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* KPI */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-zinc-400">
                Consommation totale
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                2 450 L
              </p>

              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <ArrowDownRight className="h-3.5 w-3.5" />
                -3,1%
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <Fuel className="h-5 w-5 text-amber-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-zinc-400">
                Consommation moyenne
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                8,2 L
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Pour 100 km
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
              <Gauge className="h-5 w-5 text-cyan-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-zinc-400">
                Coût estimatif
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                36 750 DH
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Prix moyen : 15 DH/L
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-sm text-zinc-400">
                Distance parcourue
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                24 560 km
              </p>

              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
                +8,6%
              </div>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <Truck className="h-5 w-5 text-blue-400" />
            </div>

          </div>

        </div>

      </section>


      {/* GRAPHIQUE */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="font-semibold text-white">
              Évolution de la consommation
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Consommation quotidienne de la flotte
            </p>

          </div>

          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
            <CalendarDays className="h-4 w-4" />
            20 — 26 août 2026
          </div>

        </div>


        <div className="mt-8">

          <div className="flex h-64 items-end gap-3 sm:gap-5">

            {chartData.map((item) => {

              const height = `${(item.value / maxValue) * 100}%`;

              return (
                <div
                  key={item.day}
                  className="flex h-full flex-1 flex-col justify-end gap-2"
                >

                  <div className="flex flex-1 items-end">

                    <div
                      className="w-full rounded-t-lg bg-amber-500/70 transition hover:bg-amber-400"
                      style={{ height }}
                      title={`${item.value} L`}
                    />

                  </div>

                  <span className="text-center text-[11px] text-zinc-500">
                    {item.day}
                  </span>

                </div>
              );
            })}

          </div>

        </div>

      </section>


      {/* VEHICULES */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="border-b border-zinc-800 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <Truck className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Consommation par véhicule
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Comparaison des performances énergétiques
              </p>
            </div>

          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[720px] text-left">

            <thead className="border-b border-zinc-800 bg-zinc-900/50">

              <tr className="text-xs text-zinc-500">

                <th className="px-5 py-4 font-medium">
                  Véhicule
                </th>

                <th className="px-5 py-4 font-medium">
                  Consommation
                </th>

                <th className="px-5 py-4 font-medium">
                  Carburant
                </th>

                <th className="px-5 py-4 font-medium">
                  Distance
                </th>

                <th className="px-5 py-4 font-medium">
                  Évolution
                </th>

              </tr>

            </thead>

            <tbody>

              {vehicles.map((vehicle) => (

                <tr
                  key={vehicle.registration}
                  className="border-b border-zinc-800/70 transition hover:bg-zinc-900/60"
                >

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900">
                        <Truck className="h-4 w-4 text-zinc-400" />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-white">
                          {vehicle.name}
                        </p>

                        <p className="text-[11px] text-zinc-500">
                          {vehicle.registration}
                        </p>
                      </div>

                    </div>

                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-white">
                    {vehicle.consumption}
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {vehicle.fuel}
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {vehicle.distance}
                  </td>

                  <td className="px-5 py-4">

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        vehicle.trend.startsWith("-")
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >

                      {vehicle.trend.startsWith("-") ? (
                        <TrendingDown className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      )}

                      {vehicle.trend}

                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>


      {/* HISTORIQUE */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="border-b border-zinc-800 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Droplets className="h-5 w-5 text-purple-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Historique des consommations
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Données fictives du mode démonstration
              </p>
            </div>

          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[680px] text-left">

            <thead className="border-b border-zinc-800 bg-zinc-900/50">

              <tr className="text-xs text-zinc-500">

                <th className="px-5 py-4 font-medium">
                  Date
                </th>

                <th className="px-5 py-4 font-medium">
                  Véhicule
                </th>

                <th className="px-5 py-4 font-medium">
                  Carburant
                </th>

                <th className="px-5 py-4 font-medium">
                  Distance
                </th>

                <th className="px-5 py-4 font-medium">
                  Coût estimatif
                </th>

              </tr>

            </thead>

            <tbody>

              {history.map((entry) => (

                <tr
                  key={`${entry.date}-${entry.vehicle}`}
                  className="border-b border-zinc-800/70 transition hover:bg-zinc-900/60"
                >

                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {entry.date}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-white">
                    {entry.vehicle}
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {entry.liters}
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {entry.distance}
                  </td>

                  <td className="px-5 py-4 text-sm font-medium text-amber-400">
                    {entry.cost}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>


      {/* RETOUR */}

      <div className="flex justify-end">

        <Link
          href="/demo"
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-white"
        >
          Retour au dashboard
        </Link>

      </div>

    </div>
  );
}