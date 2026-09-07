"use client";

import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Route,
  Truck,
  User,
  ArrowRight,
} from "lucide-react";

const trips = [
  {
    vehicle: "Renault Express",
    registration: "12345-A-6",
    driver: "Ahmed Benali",
    departure: "Casablanca",
    arrival: "Rabat",
    distance: "92 km",
    duration: "1h 24min",
    date: "Aujourd'hui",
    time: "08:42",
  },
  {
    vehicle: "Ford Transit",
    registration: "67890-B-7",
    driver: "Youssef Karim",
    departure: "Rabat",
    arrival: "Kénitra",
    distance: "46 km",
    duration: "52 min",
    date: "Aujourd'hui",
    time: "09:15",
  },
  {
    vehicle: "Dacia Dokker",
    registration: "24680-C-8",
    driver: "Samir El Idrissi",
    departure: "Tanger",
    arrival: "Tétouan",
    distance: "63 km",
    duration: "1h 08min",
    date: "Aujourd'hui",
    time: "07:31",
  },
  {
    vehicle: "Peugeot Partner",
    registration: "13579-D-9",
    driver: "Omar Alaoui",
    departure: "Marrakech",
    arrival: "Safi",
    distance: "154 km",
    duration: "2h 17min",
    date: "Hier",
    time: "14:06",
  },
  {
    vehicle: "Citroën Berlingo",
    registration: "97531-E-4",
    driver: "Karim Amrani",
    departure: "Fès",
    arrival: "Meknès",
    distance: "68 km",
    duration: "1h 02min",
    date: "Hier",
    time: "10:28",
  },
];

export default function DemoHistoryPage() {
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
            Historique
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Consultez l'historique des trajets et déplacements de la flotte.
          </p>
        </div>

        <Link
          href="/demo"
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          ← Vue d'ensemble
        </Link>
      </div>

      {/* FILTRES */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <div className="grid gap-4 md:grid-cols-3">

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Véhicule
            </label>

            <select className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none">
              <option>Tous les véhicules</option>
              <option>Renault Express</option>
              <option>Ford Transit</option>
              <option>Dacia Dokker</option>
              <option>Peugeot Partner</option>
              <option>Citroën Berlingo</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Date de début
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
              <CalendarDays className="h-4 w-4 text-slate-500" />

              <input
                type="date"
                className="w-full bg-transparent text-sm text-slate-300 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Date de fin
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5">
              <CalendarDays className="h-4 w-4 text-slate-500" />

              <input
                type="date"
                className="w-full bg-transparent text-sm text-slate-300 outline-none"
              />
            </div>
          </div>

        </div>

      </section>

      {/* STATISTIQUES */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <Route className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Trajets
              </p>

              <p className="text-2xl font-bold text-white">
                324
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Distance
              </p>

              <p className="text-2xl font-bold text-white">
                24 560 km
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Temps de conduite
              </p>

              <p className="text-2xl font-bold text-white">
                186 h
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Truck className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Véhicules actifs
              </p>

              <p className="text-2xl font-bold text-white">
                128
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* TRAJETS */}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 px-5 py-4">
          <h2 className="font-semibold text-white">
            Derniers trajets
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Données fictives de démonstration
          </p>
        </div>

        <div className="divide-y divide-slate-800">

          {trips.map((trip) => (
            <div
              key={`${trip.registration}-${trip.time}`}
              className="p-5 transition hover:bg-slate-800/40"
            >

              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                {/* VEHICULE */}

                <div className="flex items-center gap-3 xl:w-1/5">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                    <Truck className="h-5 w-5 text-blue-400" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {trip.vehicle}
                    </p>

                    <p className="text-xs text-slate-500">
                      {trip.registration}
                    </p>
                  </div>

                </div>

                {/* CONDUCTEUR */}

                <div className="flex items-center gap-2 xl:w-1/5">

                  <User className="h-4 w-4 text-slate-500" />

                  <span className="text-sm text-slate-300">
                    {trip.driver}
                  </span>

                </div>

                {/* TRAJET */}

                <div className="flex items-center gap-3 xl:flex-1">

                  <div>
                    <p className="text-sm font-medium text-white">
                      {trip.departure}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Départ
                    </p>
                  </div>

                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-px flex-1 bg-slate-700" />

                    <ArrowRight className="h-4 w-4 text-cyan-400" />

                    <div className="h-px flex-1 bg-slate-700" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">
                      {trip.arrival}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Arrivée
                    </p>
                  </div>

                </div>

                {/* DISTANCE */}

                <div className="xl:w-28">
                  <p className="text-sm font-semibold text-cyan-400">
                    {trip.distance}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Distance
                  </p>
                </div>

                {/* DUREE */}

                <div className="xl:w-28">
                  <p className="text-sm font-medium text-white">
                    {trip.duration}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Durée
                  </p>
                </div>

                {/* DATE */}

                <div className="xl:w-28">
                  <p className="text-sm text-slate-300">
                    {trip.date}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {trip.time}
                  </p>
                </div>

              </div>

            </div>
          ))}

        </div>

      </section>

      {/* BANDEAU */}

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <div className="flex gap-3">

          <Route className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />

          <div>
            <p className="text-sm font-semibold text-cyan-300">
              Historique de démonstration
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Les trajets présentés sont fictifs et servent uniquement à
              illustrer les fonctionnalités de suivi et d'analyse de
              Matelematics.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}