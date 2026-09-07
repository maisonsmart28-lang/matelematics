"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Gauge,
  Plus,
  Search,
  Truck,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";

const maintenanceItems = [
  {
    id: 1,
    vehicle: "Renault Express",
    registration: "12345-A-6",
    type: "Vidange moteur",
    date: "28 août 2026",
    mileage: "42 850 km",
    status: "À prévoir",
    priority: "warning",
  },
  {
    id: 2,
    vehicle: "Ford Transit",
    registration: "78421-B-4",
    type: "Révision générale",
    date: "30 août 2026",
    mileage: "68 420 km",
    status: "Planifiée",
    priority: "normal",
  },
  {
    id: 3,
    vehicle: "Dacia Dokker",
    registration: "45678-C-2",
    type: "Contrôle des freins",
    date: "25 août 2026",
    mileage: "91 230 km",
    status: "Urgente",
    priority: "danger",
  },
  {
    id: 4,
    vehicle: "Renault Kangoo",
    registration: "90213-D-8",
    type: "Remplacement pneus",
    date: "03 septembre 2026",
    mileage: "37 650 km",
    status: "Planifiée",
    priority: "normal",
  },
  {
    id: 5,
    vehicle: "Peugeot Partner",
    registration: "31567-E-1",
    type: "Vidange moteur",
    date: "10 septembre 2026",
    mileage: "52 180 km",
    status: "À prévoir",
    priority: "warning",
  },
];

const statusStyles = {
  Urgente: "bg-red-500/10 text-red-400 border-red-500/20",
  "À prévoir": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Planifiée: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function DemoMaintenancePage() {
  const [newMaintenanceOpen, setNewMaintenanceOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Tous");

  const filteredItems = maintenanceItems.filter((item) => {
    const matchesSearch =
      item.vehicle.toLowerCase().includes(search.toLowerCase()) ||
      item.registration.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      selectedFilter === "Tous" || item.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="relative space-y-6">

      {/* HEADER */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                Gestion de flotte — Démonstration
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Maintenance
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Suivez les opérations de maintenance et anticipez les
              prochaines interventions.
            </p>

          </div>

          <button
            type="button"
            onClick={() => setNewMaintenanceOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Nouvelle maintenance
          </button>

        </div>

      </section>


      {/* STATISTIQUES */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <p className="text-sm text-zinc-400">
              Total interventions
            </p>

            <div className="rounded-xl bg-blue-500/10 p-3">
              <Wrench className="h-5 w-5 text-blue-400" />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            24
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Ce mois-ci
          </p>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <p className="text-sm text-zinc-400">
              À prévoir
            </p>

            <div className="rounded-xl bg-amber-500/10 p-3">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            8
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Prochaines interventions
          </p>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <p className="text-sm text-zinc-400">
              Urgentes
            </p>

            <div className="rounded-xl bg-red-500/10 p-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            2
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Nécessitent une intervention
          </p>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <p className="text-sm text-zinc-400">
              Terminées
            </p>

            <div className="rounded-xl bg-emerald-500/10 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            14
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Interventions réalisées
          </p>

        </div>

      </section>


      {/* RAPPEL MAINTENANCE */}

      <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>

            <div>

              <h2 className="font-semibold text-amber-300">
                Attention maintenance
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                2 véhicules nécessitent une intervention prioritaire.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() => setSelectedFilter("Urgente")}
            className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20"
          >
            Voir les urgences
          </button>

        </div>

      </section>


      {/* LISTE */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h2 className="font-semibold text-white">
              Planning de maintenance
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Données fictives de démonstration
            </p>

          </div>

          <div className="flex flex-col gap-2 sm:flex-row">

            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">

              <Search className="h-4 w-4 text-zinc-500" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un véhicule..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />

            </div>

            <button
              type="button"
              onClick={() => setFilterOpen((value) => !value)}
              className="flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
            >
              <Filter className="h-4 w-4" />
              Filtrer
            </button>

          </div>

        </div>

        {filterOpen && (
          <div className="border-b border-zinc-800 bg-zinc-900/70 px-5 py-4">

            <div className="flex flex-wrap gap-2">

              {["Tous", "Urgente", "À prévoir", "Planifiée"].map(
                (filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setSelectedFilter(filter);
                      setFilterOpen(false);
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      selectedFilter === filter
                        ? "bg-cyan-500 text-white"
                        : "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}

            </div>

          </div>
        )}


        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px]">

            <thead>

              <tr className="border-b border-zinc-800 text-left">

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Véhicule
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Intervention
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Date
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Kilométrage
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Statut
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Action
                </th>

              </tr>

            </thead>


            <tbody>

              {filteredItems.map((item) => (

                <tr
                  key={item.id}
                  className="border-b border-zinc-800 transition hover:bg-zinc-900/60"
                >

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                        <Truck className="h-5 w-5 text-cyan-400" />
                      </div>

                      <div>

                        <p className="text-sm font-medium text-white">
                          {item.vehicle}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {item.registration}
                        </p>

                      </div>

                    </div>

                  </td>


                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2">

                      <Wrench className="h-4 w-4 text-zinc-600" />

                      <span className="text-sm text-zinc-300">
                        {item.type}
                      </span>

                    </div>

                  </td>


                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2">

                      <Calendar className="h-4 w-4 text-zinc-600" />

                      <span className="text-sm text-zinc-400">
                        {item.date}
                      </span>

                    </div>

                  </td>


                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2">

                      <Gauge className="h-4 w-4 text-zinc-600" />

                      <span className="text-sm text-zinc-400">
                        {item.mileage}
                      </span>

                    </div>

                  </td>


                  <td className="px-5 py-4">

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
                        statusStyles[
                          item.status as keyof typeof statusStyles
                        ]
                      }`}
                    >

                      {item.status === "Urgente" && (
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                      )}

                      {item.status === "À prévoir" && (
                        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                      )}

                      {item.status === "Planifiée" && (
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      )}

                      {item.status}

                    </span>

                  </td>


                  <td className="px-5 py-4">

                    <button
                      type="button"
                      onClick={() => setDetailsOpen(item.id)}
                      className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                    >
                      Détails
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {filteredItems.length === 0 && (
            <div className="px-6 py-12 text-center">

              <Wrench className="mx-auto h-10 w-10 text-zinc-700" />

              <p className="mt-3 text-sm text-zinc-400">
                Aucune maintenance trouvée.
              </p>

            </div>
          )}

        </div>

      </section>


      {/* MODAL NOUVELLE MAINTENANCE */}

      {newMaintenanceOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">

            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">

              <div>

                <h2 className="text-lg font-semibold text-white">
                  Nouvelle maintenance
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Créer une demande de maintenance — démonstration
                </p>

              </div>

              <button
                type="button"
                onClick={() => setNewMaintenanceOpen(false)}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                alert(
                  "Demande de maintenance créée avec succès — mode démonstration."
                );
                setNewMaintenanceOpen(false);
              }}
              className="space-y-5 p-6"
            >

              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Véhicule
                  </label>

                  <select
                    required
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">Sélectionner</option>
                    {maintenanceItems.map((item) => (
                      <option key={item.registration}>
                        {item.vehicle} — {item.registration}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Type d'intervention
                  </label>

                  <select
                    required
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">Sélectionner</option>
                    <option>Vidange moteur</option>
                    <option>Révision générale</option>
                    <option>Contrôle des freins</option>
                    <option>Remplacement pneus</option>
                    <option>Contrôle technique</option>
                    <option>Autre</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Date prévue
                  </label>

                  <input
                    required
                    type="date"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Kilométrage
                  </label>

                  <input
                    required
                    type="number"
                    placeholder="Ex. 50000"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-500"
                  />
                </div>

              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Notes
                </label>

                <textarea
                  rows={4}
                  placeholder="Ajouter une remarque ou une information..."
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-800 pt-5">

                <button
                  type="button"
                  onClick={() => setNewMaintenanceOpen(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-400"
                >
                  Créer la demande
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


      {/* MODAL DÉTAILS */}

      {detailsOpen !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">

            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">

              <div>

                <h2 className="text-lg font-semibold text-white">
                  Détails de la maintenance
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Informations de démonstration
                </p>

              </div>

              <button
                type="button"
                onClick={() => setDetailsOpen(null)}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {(() => {
              const item = maintenanceItems.find(
                (maintenance) => maintenance.id === detailsOpen
              );

              if (!item) return null;

              return (
                <div className="space-y-4 p-6">

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
                        <Truck className="h-5 w-5 text-cyan-400" />
                      </div>

                      <div>
                        <p className="font-medium text-white">
                          {item.vehicle}
                        </p>

                        <p className="text-xs text-zinc-500">
                          {item.registration}
                        </p>
                      </div>

                    </div>

                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-500">
                        Intervention
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {item.type}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-500">
                        Date
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {item.date}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-500">
                        Kilométrage
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {item.mileage}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <p className="text-xs text-zinc-500">
                        Statut
                      </p>
                      <p className="mt-1 text-sm text-white">
                        {item.status}
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailsOpen(null)}
                    className="w-full rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-700"
                  >
                    Fermer
                  </button>

                </div>
              );
            })()}

          </div>

        </div>
      )}


      {/* NOTE DEMO */}

      <div className="flex items-center justify-center gap-2 border-t border-zinc-800 pt-6 text-xs text-zinc-600">

        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />

        Mode démonstration — les données affichées sont fictives.

      </div>

    </div>
  );
}