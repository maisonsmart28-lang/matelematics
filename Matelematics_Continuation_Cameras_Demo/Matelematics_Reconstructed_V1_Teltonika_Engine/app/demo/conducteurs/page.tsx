"use client";

import {
  Activity,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Plus,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

interface Driver {
  id: number;
  name: string;
  phone: string;
  vehicle: string;
  status: "Actif" | "En pause" | "Hors ligne";
  location: string;
  trips: number;
  distance: number;
  lastActivity: string;
}

const initialDrivers: Driver[] = [
  {
    id: 1,
    name: "Ahmed Benali",
    phone: "+212 6 61 24 35 78",
    vehicle: "Renault Express",
    status: "Actif",
    location: "Casablanca",
    trips: 8,
    distance: 184,
    lastActivity: "Il y a 4 min",
  },
  {
    id: 2,
    name: "Youssef Karim",
    phone: "+212 6 62 45 18 92",
    vehicle: "Ford Transit",
    status: "Actif",
    location: "Rabat",
    trips: 6,
    distance: 156,
    lastActivity: "Il y a 9 min",
  },
  {
    id: 3,
    name: "Samir El Idrissi",
    phone: "+212 6 63 74 29 51",
    vehicle: "Dacia Dokker",
    status: "En pause",
    location: "Tanger",
    trips: 5,
    distance: 121,
    lastActivity: "Il y a 13 min",
  },
  {
    id: 4,
    name: "Omar Alaoui",
    phone: "+212 6 64 31 76 45",
    vehicle: "Peugeot Partner",
    status: "Actif",
    location: "Casablanca",
    trips: 7,
    distance: 169,
    lastActivity: "Il y a 17 min",
  },
  {
    id: 5,
    name: "Mehdi Tazi",
    phone: "+212 6 65 42 83 17",
    vehicle: "Citroën Berlingo",
    status: "Hors ligne",
    location: "Mohammedia",
    trips: 4,
    distance: 98,
    lastActivity: "Il y a 32 min",
  },
  {
    id: 6,
    name: "Anas Berrada",
    phone: "+212 6 66 58 14 63",
    vehicle: "Renault Kangoo",
    status: "Actif",
    location: "El Jadida",
    trips: 9,
    distance: 203,
    lastActivity: "Il y a 6 min",
  },
];

export default function DemoDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "Tous" | "Actif" | "En pause" | "Hors ligne"
  >("Tous");

  const [showAddForm, setShowAddForm] = useState(false);

  const [newDriver, setNewDriver] = useState({
    name: "",
    phone: "",
    vehicle: "",
    status: "Actif" as "Actif" | "En pause" | "Hors ligne",
    location: "",
  });

  const filteredDrivers = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();

    return drivers.filter((driver) => {
      const matchesFilter =
        filter === "Tous" || driver.status === filter;

      const matchesSearch =
        normalizedSearch === "" ||
        driver.name.toLowerCase().includes(normalizedSearch) ||
        driver.vehicle.toLowerCase().includes(normalizedSearch) ||
        driver.location.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [search, filter, drivers]);

  const activeDrivers = drivers.filter(
    (driver) => driver.status === "Actif"
  ).length;

  const pausedDrivers = drivers.filter(
    (driver) => driver.status === "En pause"
  ).length;

  const offlineDrivers = drivers.filter(
    (driver) => driver.status === "Hors ligne"
  ).length;

  const totalTrips = drivers.reduce(
    (total, driver) => total + driver.trips,
    0
  );

  const statusStyles = {
    Actif: {
      wrapper: "bg-emerald-500/10 text-emerald-400",
      dot: "bg-emerald-400",
      icon: CheckCircle2,
    },
    "En pause": {
      wrapper: "bg-amber-500/10 text-amber-400",
      dot: "bg-amber-400",
      icon: Clock,
    },
    "Hors ligne": {
      wrapper: "bg-red-500/10 text-red-400",
      dot: "bg-red-400",
      icon: XCircle,
    },
  };

  function handleAddDriver(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !newDriver.name.trim() ||
      !newDriver.phone.trim() ||
      !newDriver.vehicle.trim() ||
      !newDriver.location.trim()
    ) {
      return;
    }

    const driver: Driver = {
      id: Date.now(),
      name: newDriver.name.trim(),
      phone: newDriver.phone.trim(),
      vehicle: newDriver.vehicle.trim(),
      status: newDriver.status,
      location: newDriver.location.trim(),
      trips: 0,
      distance: 0,
      lastActivity: "À l'instant",
    };

    setDrivers((currentDrivers) => [
      ...currentDrivers,
      driver,
    ]);

    setNewDriver({
      name: "",
      phone: "",
      vehicle: "",
      status: "Actif",
      location: "",
    });

    setShowAddForm(false);
  }

  function handleCancelAdd() {
    setNewDriver({
      name: "",
      phone: "",
      vehicle: "",
      status: "Actif",
      location: "",
    });

    setShowAddForm(false);
  }

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-blue-400" />

              <span className="text-xs font-medium uppercase tracking-wider text-blue-400">
                Gestion de flotte
              </span>

            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Conducteurs
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Suivez l'activité et les performances de vos conducteurs.
            </p>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

            <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">

              <Users className="h-5 w-5 text-cyan-400" />

              <div>

                <p className="text-xs text-zinc-500">
                  Conducteurs enregistrés
                </p>

                <p className="text-lg font-bold text-white">
                  {drivers.length}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Ajouter un conducteur
            </button>

          </div>

        </div>

      </section>

      {/* FORMULAIRE AJOUT */}

      {showAddForm && (
        <section className="rounded-2xl border border-cyan-500/20 bg-zinc-950 p-6 shadow-xl">

          <div className="mb-6 flex items-start justify-between gap-4">

            <div>

              <h2 className="text-lg font-semibold text-white">
                Ajouter un conducteur
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Renseignez les informations du nouveau conducteur.
              </p>

            </div>

            <button
              type="button"
              onClick={handleCancelAdd}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

          </div>

          <form
            onSubmit={handleAddDriver}
            className="grid gap-5 md:grid-cols-2"
          >

            {/* NOM */}

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Nom complet
              </label>

              <input
                type="text"
                value={newDriver.name}
                onChange={(event) =>
                  setNewDriver({
                    ...newDriver,
                    name: event.target.value,
                  })
                }
                placeholder="Ex. Mohamed Amrani"
                required
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
              />

            </div>

            {/* TELEPHONE */}

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Téléphone
              </label>

              <input
                type="tel"
                value={newDriver.phone}
                onChange={(event) =>
                  setNewDriver({
                    ...newDriver,
                    phone: event.target.value,
                  })
                }
                placeholder="+212 6 XX XX XX XX"
                required
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
              />

            </div>

            {/* VEHICULE */}

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Véhicule
              </label>

              <input
                type="text"
                value={newDriver.vehicle}
                onChange={(event) =>
                  setNewDriver({
                    ...newDriver,
                    vehicle: event.target.value,
                  })
                }
                placeholder="Ex. Renault Express"
                required
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
              />

            </div>

            {/* LOCALISATION */}

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Localisation
              </label>

              <input
                type="text"
                value={newDriver.location}
                onChange={(event) =>
                  setNewDriver({
                    ...newDriver,
                    location: event.target.value,
                  })
                }
                placeholder="Ex. Casablanca"
                required
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
              />

            </div>

            {/* STATUT */}

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Statut
              </label>

              <select
                value={newDriver.status}
                onChange={(event) =>
                  setNewDriver({
                    ...newDriver,
                    status: event.target.value as
                      | "Actif"
                      | "En pause"
                      | "Hors ligne",
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none transition focus:border-cyan-500"
              >

                <option value="Actif">
                  Actif
                </option>

                <option value="En pause">
                  En pause
                </option>

                <option value="Hors ligne">
                  Hors ligne
                </option>

              </select>

            </div>

            {/* BOUTONS */}

            <div className="flex items-end gap-3">

              <button
                type="button"
                onClick={handleCancelAdd}
                className="flex-1 rounded-lg border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                Annuler
              </button>

              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>

            </div>

          </form>

        </section>
      )}

      {/* STATISTIQUES */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-400">
                Conducteurs actifs
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {activeDrivers}
              </p>

              <p className="mt-1 text-xs text-emerald-400">
                En service actuellement
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <UserCheck className="h-6 w-6 text-emerald-400" />
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-400">
                En pause
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {pausedDrivers}
              </p>

              <p className="mt-1 text-xs text-amber-400">
                Conducteurs en pause
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-400" />
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-400">
                Hors ligne
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {offlineDrivers}
              </p>

              <p className="mt-1 text-xs text-red-400">
                Non connectés
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
              <XCircle className="h-6 w-6 text-red-400" />
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-400">
                Trajets aujourd'hui
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {totalTrips}
              </p>

              <p className="mt-1 text-xs text-cyan-400">
                Total enregistré
              </p>

            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <Activity className="h-6 w-6 text-cyan-400" />
            </div>

          </div>

        </div>

      </section>

      {/* TABLEAU */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        {/* BARRE */}

        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h2 className="font-semibold text-white">
              Liste des conducteurs
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Données fictives de démonstration
            </p>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* RECHERCHE */}

            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">

              <Search className="h-4 w-4 text-zinc-500" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Rechercher..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600 sm:w-48"
              />

            </div>

            {/* FILTRE */}

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as
                    | "Tous"
                    | "Actif"
                    | "En pause"
                    | "Hors ligne"
                )
              }
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-cyan-500"
            >

              <option value="Tous">
                Tous les statuts
              </option>

              <option value="Actif">
                Actifs
              </option>

              <option value="En pause">
                En pause
              </option>

              <option value="Hors ligne">
                Hors ligne
              </option>

            </select>

          </div>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[900px]">

            <thead>

              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">

                <th className="px-5 py-4 font-medium">
                  Conducteur
                </th>

                <th className="px-5 py-4 font-medium">
                  Véhicule
                </th>

                <th className="px-5 py-4 font-medium">
                  Statut
                </th>

                <th className="px-5 py-4 font-medium">
                  Localisation
                </th>

                <th className="px-5 py-4 font-medium">
                  Trajets
                </th>

                <th className="px-5 py-4 font-medium">
                  Distance
                </th>

                <th className="px-5 py-4 font-medium">
                  Activité
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredDrivers.map((driver) => {

                const status = statusStyles[driver.status];
                const StatusIcon = status.icon;

                return (
                  <tr
                    key={driver.id}
                    className="border-b border-zinc-800/70 transition hover:bg-zinc-900/60"
                  >

                    {/* CONDUCTEUR */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-sm font-bold text-blue-400">

                          {driver.name
                            .split(" ")
                            .map((name) => name[0])
                            .join("")
                            .slice(0, 2)}

                        </div>

                        <div>

                          <p className="font-medium text-white">
                            {driver.name}
                          </p>

                          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">

                            <Phone className="h-3 w-3" />

                            {driver.phone}

                          </div>

                        </div>

                      </div>

                    </td>

                    {/* VEHICULE */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-2">

                        <Car className="h-4 w-4 text-zinc-500" />

                        <span className="text-sm text-zinc-300">
                          {driver.vehicle}
                        </span>

                      </div>

                    </td>

                    {/* STATUT */}

                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${status.wrapper}`}
                      >

                        <span
                          className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                        />

                        <StatusIcon className="h-3.5 w-3.5" />

                        {driver.status}

                      </span>

                    </td>

                    {/* LOCALISATION */}

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-2 text-sm text-zinc-400">

                        <MapPin className="h-4 w-4 text-cyan-400" />

                        {driver.location}

                      </div>

                    </td>

                    {/* TRAJETS */}

                    <td className="px-5 py-4">

                      <span className="text-sm font-medium text-white">
                        {driver.trips}
                      </span>

                    </td>

                    {/* DISTANCE */}

                    <td className="px-5 py-4">

                      <span className="text-sm text-zinc-300">
                        {driver.distance} km
                      </span>

                    </td>

                    {/* ACTIVITE */}

                    <td className="px-5 py-4">

                      <span className="text-xs text-zinc-500">
                        {driver.lastActivity}
                      </span>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

          {filteredDrivers.length === 0 && (
            <div className="px-6 py-12 text-center">

              <Users className="mx-auto h-10 w-10 text-zinc-700" />

              <p className="mt-3 text-sm font-medium text-zinc-400">
                Aucun conducteur trouvé
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Modifiez votre recherche ou votre filtre.
              </p>

            </div>
          )}

        </div>

      </section>

      {/* NOTE DEMO */}

      <div className="flex items-center gap-3 rounded-xl border border-cyan-500/10 bg-cyan-500/5 px-4 py-3">

        <Activity className="h-4 w-4 shrink-0 text-cyan-400" />

        <p className="text-xs text-zinc-500">

          Cette page est en{" "}

          <span className="font-medium text-cyan-400">
            mode démonstration
          </span>

          . Les informations affichées sont fictives et ne sont pas
          connectées aux données réelles de votre flotte.

        </p>

      </div>

    </div>
  );
}