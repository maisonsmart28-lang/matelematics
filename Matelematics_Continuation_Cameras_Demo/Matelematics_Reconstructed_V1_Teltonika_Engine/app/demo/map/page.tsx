"use client";

import Link from "next/link";
import {
  MapPin,
  Truck,
  Navigation,
  Activity,
} from "lucide-react";

import CustomMap from "../../dashboard/MapComponent";

export default function DemoMapPage() {
  return (
    <div className="space-y-6">

      {/* EN-TÊTE */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />

            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Mode démonstration
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white">
            Carte en direct
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Visualisez la position de votre flotte en temps réel.
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
              <Truck className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Véhicules en ligne
              </p>

              <p className="text-2xl font-bold text-white">
                128
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <Navigation className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                En déplacement
              </p>

              <p className="text-2xl font-bold text-white">
                96
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <MapPin className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Véhicules arrêtés
              </p>

              <p className="text-2xl font-bold text-white">
                32
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                État plateforme
              </p>

              <p className="text-lg font-bold text-emerald-400">
                Opérationnelle
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* CARTE */}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <MapPin className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Flotte en temps réel
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Données fictives de démonstration
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-xs text-emerald-400">
              Système opérationnel
            </span>

          </div>

        </div>

        <div className="p-4">
          <CustomMap />
        </div>

      </section>

      {/* INFORMATIONS */}

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <div className="flex gap-3">

          <Activity className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />

          <div>
            <p className="text-sm font-semibold text-cyan-300">
              Mode démonstration
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Cette carte utilise les composants de la plateforme
              Matelematics avec des données fictives. Les positions
              affichées servent uniquement à présenter les fonctionnalités.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}