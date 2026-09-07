"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gauge,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
  Route,
  AlertTriangle,
} from "lucide-react";

type DriverStatus = "Actif" | "Disponible" | "Inactif";

type Driver = {
  id: number;
  name: string;
  initials: string;
  phone: string;
  vehicle: string;
  registration: string;
  status: DriverStatus;
  lastActivity: string;
  location: string;
  trips: number;
  distance: number;
  score: number;
  incidents: number;
};

const initialDrivers: Driver[] = [
  {
    id: 1,
    name: "Mohamed Amrani",
    initials: "MA",
    phone: "+212 6 00 00 00 01",
    vehicle: "Ford Transit Custom",
    registration: "12345-A-6",
    status: "Actif",
    lastActivity: "Il y a 5 min",
    location: "Casablanca",
    trips: 12,
    distance: 184,
    score: 94,
    incidents: 1,
  },
  {
    id: 2,
    name: "Youssef Benali",
    initials: "YB",
    phone: "+212 6 00 00 00 02",
    vehicle: "Renault Express",
    registration: "45678-B-7",
    status: "Disponible",
    lastActivity: "Il y a 18 min",
    location: "Aïn Sebaâ",
    trips: 8,
    distance: 126,
    score: 88,
    incidents: 0,
  },
  {
    id: 3,
    name: "Omar El Idrissi",
    initials: "OE",
    phone: "+212 6 00 00 00 03",
    vehicle: "Dacia Dokker",
    registration: "78912-C-8",
    status: "Inactif",
    lastActivity: "Hier",
    location: "Mohammedia",
    trips: 5,
    distance: 74,
    score: 76,
    incidents: 2,
  },
  {
    id: 4,
    name: "Karim Alaoui",
    initials: "KA",
    phone: "+212 6 00 00 00 04",
    vehicle: "Peugeot Partner",
    registration: "32145-D-9",
    status: "Actif",
    lastActivity: "Il y a 2 min",
    location: "Bouskoura",
    trips: 15,
    distance: 241,
    score: 97,
    incidents: 0,
  },
];

function StatusBadge({ status }: { status: DriverStatus }) {
  if (status === "Actif") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Actif
      </span>
    );
  }

  if (status === "Disponible") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Disponible
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400">
      <XCircle className="h-3.5 w-3.5" />
      Inactif
    </span>
  );
}

function Score({ value }: { value: number }) {
  const label =
    value >= 90 ? "Excellent" : value >= 80 ? "Bon" : "À améliorer";

  const textColor =
    value >= 90
      ? "text-emerald-400"
      : value >= 80
        ? "text-blue-400"
        : "text-amber-400";

  return (
    <div className="min-w-[120px]">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Score conduite
        </span>

        <span className={`text-xs font-semibold ${textColor}`}>
          {value}/100
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${
            value >= 90
              ? "bg-emerald-500"
              : value >= 80
                ? "bg-blue-500"
                : "bg-amber-500"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>

      <p className={`mt-1 text-[10px] ${textColor}`}>
        {label}
      </p>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>

      <p className="mt-2 text-sm font-medium text-white">
        {value}
      </p>
    </div>
  );
}

export default function ConducteursPage() {
  const [drivers, setDrivers] =
    useState<Driver[]>(initialDrivers);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState<
    "Tous" | DriverStatus
  >("Tous");

  const [selectedDriver, setSelectedDriver] =
    useState<Driver | null>(null);

  const [showAddDriver, setShowAddDriver] =
    useState(false);

  const [newDriver, setNewDriver] = useState({
    name: "",
    phone: "",
    vehicle: "",
    registration: "",
    status: "Disponible" as DriverStatus,
    location: "",
  });

  const [formError, setFormError] = useState("");

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        driver.name.toLowerCase().includes(searchValue) ||
        driver.vehicle.toLowerCase().includes(searchValue) ||
        driver.registration.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tous" ||
        driver.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [drivers, search, statusFilter]);

  const activeDrivers = drivers.filter(
    (driver) => driver.status === "Actif"
  ).length;

  const availableDrivers = drivers.filter(
    (driver) => driver.status === "Disponible"
  ).length;

  const averageScore =
    drivers.length > 0
      ? Math.round(
          drivers.reduce(
            (sum, driver) => sum + driver.score,
            0
          ) / drivers.length
        )
      : 0;

  const totalDistance = drivers.reduce(
    (sum, driver) => sum + driver.distance,
    0
  );

  const totalTrips = drivers.reduce(
    (sum, driver) => sum + driver.trips,
    0
  );

  const totalIncidents = drivers.reduce(
    (sum, driver) => sum + driver.incidents,
    0
  );

  const getInitials = (name: string) => {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 0) return "ND";

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const resetAddForm = () => {
    setNewDriver({
      name: "",
      phone: "",
      vehicle: "",
      registration: "",
      status: "Disponible",
      location: "",
    });

    setFormError("");
  };

  const closeAddDriverModal = () => {
    setShowAddDriver(false);
    resetAddForm();
  };

  const handleAddDriver = () => {
    const name = newDriver.name.trim();
    const phone = newDriver.phone.trim();
    const vehicle = newDriver.vehicle.trim();
    const registration = newDriver.registration.trim();
    const location = newDriver.location.trim();

    if (!name || !phone || !vehicle || !registration) {
      setFormError(
        "Veuillez remplir tous les champs obligatoires."
      );
      return;
    }

    const registrationExists = drivers.some(
      (driver) =>
        driver.registration.toLowerCase() ===
        registration.toLowerCase()
    );

    if (registrationExists) {
      setFormError(
        "Un conducteur utilise déjà cette immatriculation."
      );
      return;
    }

    const newDriverItem: Driver = {
      id:
        drivers.length > 0
          ? Math.max(...drivers.map((driver) => driver.id)) + 1
          : 1,
      name,
      initials: getInitials(name),
      phone,
      vehicle,
      registration,
      status: newDriver.status,
      lastActivity: "À l'instant",
      location: location || "Non renseignée",
      trips: 0,
      distance: 0,
      score: 100,
      incidents: 0,
    };

    setDrivers((currentDrivers) => [
      ...currentDrivers,
      newDriverItem,
    ]);

    closeAddDriverModal();
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <Users className="h-6 w-6 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Conducteurs
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Gérez vos conducteurs et analysez leur activité.
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={() => setShowAddDriver(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Ajouter un conducteur
        </button>

      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Total conducteurs
            </span>
            <Users className="h-5 w-5 text-blue-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {drivers.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Conducteurs enregistrés
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              En conduite
            </span>
            <Activity className="h-5 w-5 text-emerald-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {activeDrivers}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Conducteurs actuellement actifs
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Disponibles
            </span>
            <CheckCircle2 className="h-5 w-5 text-blue-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-blue-400">
            {availableDrivers}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Prêts pour une affectation
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Score moyen
            </span>
            <ShieldCheck className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-400">
            {averageScore}/100
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Performance de conduite
          </p>
        </div>

      </div>

      {/* RESUME */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Activité des conducteurs
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Données cumulées de la flotte
              </p>
            </div>

            <Gauge className="h-5 w-5 text-blue-400" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Distance parcourue
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {totalDistance} km
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Trajets aujourd'hui
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {totalTrips}
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Incidents détectés
              </p>

              <p className="mt-2 text-xl font-bold text-red-400">
                {totalIncidents}
              </p>
            </div>

          </div>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Sécurité
              </h2>

              <p className="text-xs text-slate-500">
                Score global
              </p>
            </div>

          </div>

          <div className="mt-5">

            <div className="flex items-end justify-between">

              <span className="text-4xl font-bold text-emerald-400">
                {averageScore}
              </span>

              <span className="pb-1 text-xs text-slate-500">
                / 100
              </span>

            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${averageScore}%` }}
              />
            </div>

            <p className="mt-3 text-xs text-slate-400">
              La flotte présente actuellement un bon niveau de sécurité.
            </p>

          </div>

        </div>

      </div>

      {/* LISTE */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 p-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>
              <h2 className="font-semibold text-white">
                Liste des conducteurs
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredDrivers.length} conducteur
                {filteredDrivers.length > 1 ? "s" : ""} affiché
                {filteredDrivers.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="relative">

                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Rechercher..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500 sm:w-64"
                />

              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as
                      | "Tous"
                      | DriverStatus
                  )
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
              >
                <option value="Tous">
                  Tous les statuts
                </option>
                <option value="Actif">
                  Actifs
                </option>
                <option value="Disponible">
                  Disponibles
                </option>
                <option value="Inactif">
                  Inactifs
                </option>
              </select>

            </div>

          </div>

        </div>

        <div className="divide-y divide-slate-800">

          {filteredDrivers.map((driver) => (

            <div
              key={driver.id}
              className="group p-5 transition hover:bg-slate-800/30"
            >

              <div className="flex flex-col gap-5 xl:flex-row xl:items-center">

                {/* IDENTITÉ */}
                <div className="flex min-w-[250px] flex-1 items-center gap-4">

                  <div className="relative">

                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/20 text-sm font-bold text-blue-300 ring-1 ring-blue-500/20">
                      {driver.initials}
                    </div>

                    {driver.status === "Actif" && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-400" />
                    )}

                  </div>

                  <div>

                    <h3 className="font-medium text-white">
                      {driver.name}
                    </h3>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <Phone className="h-3.5 w-3.5" />
                      {driver.phone}
                    </div>

                  </div>

                </div>

                {/* VEHICULE */}
                <div className="min-w-[220px] flex-1">

                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                    Véhicule affecté
                  </p>

                  <div className="flex items-center gap-2">

                    <Car className="h-4 w-4 text-blue-400" />

                    <div>

                      <p className="text-sm text-slate-300">
                        {driver.vehicle}
                      </p>

                      <p className="text-xs text-slate-500">
                        {driver.registration}
                      </p>

                    </div>

                  </div>

                </div>

                {/* LOCALISATION */}
                <div className="min-w-[150px]">

                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-600">
                    Position
                  </p>

                  <div className="flex items-center gap-2 text-sm text-slate-300">

                    <MapPin className="h-4 w-4 text-slate-500" />

                    {driver.location}

                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {driver.lastActivity}
                  </p>

                </div>

                {/* SCORE */}
                <div className="min-w-[130px]">
                  <Score value={driver.score} />
                </div>

                {/* STATUT + ACTION */}
                <div className="flex items-center justify-between gap-4 xl:w-[180px] xl:justify-end">

                  <StatusBadge status={driver.status} />

                  <button
                    type="button"
                    title={`Voir les détails de ${driver.name}`}
                    aria-label={`Voir les détails de ${driver.name}`}
                    onClick={() =>
                      setSelectedDriver(driver)
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                </div>

              </div>

            </div>

          ))}

          {filteredDrivers.length === 0 && (
            <div className="p-12 text-center">

              <UserRound className="mx-auto h-10 w-10 text-slate-700" />

              <p className="mt-3 text-sm font-medium text-slate-300">
                Aucun conducteur trouvé
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Modifiez votre recherche ou vos filtres.
              </p>

            </div>
          )}

        </div>

      </div>

      {/* INFO */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

        <div className="flex gap-3">

          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

          <div>

            <p className="text-sm font-medium text-white">
              Suivi des conducteurs
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Les informations affichées sont actuellement des données de
              démonstration. Le module pourra ensuite être connecté aux
              données réelles de Traccar afin de suivre les conducteurs,
              leurs trajets, leurs positions et leur comportement de conduite.
            </p>

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* MODALE AJOUT CONDUCTEUR                                   */}
      {/* ========================================================= */}

      {showAddDriver && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddDriverModal();
            }
          }}
        >

          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div className="flex items-center gap-4">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                  <UserRound className="h-5 w-5 text-blue-400" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Ajouter un conducteur
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Ajoutez un nouveau conducteur à votre flotte.
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={closeAddDriverModal}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            {/* FORMULAIRE */}
            <div className="max-h-[75vh] overflow-y-auto p-5">

              {formError && (
                <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />

                  <p className="text-xs leading-5 text-red-300">
                    {formError}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* NOM */}
                <div className="sm:col-span-2">

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Nom complet *
                  </label>

                  <input
                    type="text"
                    value={newDriver.name}
                    onChange={(event) =>
                      setNewDriver((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex. Ahmed Benali"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                </div>

                {/* TELEPHONE */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Téléphone *
                  </label>

                  <input
                    type="tel"
                    value={newDriver.phone}
                    onChange={(event) =>
                      setNewDriver((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+212 6 XX XX XX XX"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                </div>

                {/* STATUT */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Statut
                  </label>

                  <select
                    value={newDriver.status}
                    onChange={(event) =>
                      setNewDriver((current) => ({
                        ...current,
                        status: event.target.value as DriverStatus,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
                  >
                    <option value="Disponible">
                      Disponible
                    </option>

                    <option value="Actif">
                      Actif
                    </option>

                    <option value="Inactif">
                      Inactif
                    </option>
                  </select>

                </div>

                {/* VEHICULE */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Véhicule *
                  </label>

                  <input
                    type="text"
                    value={newDriver.vehicle}
                    onChange={(event) =>
                      setNewDriver((current) => ({
                        ...current,
                        vehicle: event.target.value,
                      }))
                    }
                    placeholder="Ex. Ford Transit Custom"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                </div>

                {/* IMMATRICULATION */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Immatriculation *
                  </label>

                  <input
                    type="text"
                    value={newDriver.registration}
                    onChange={(event) =>
                      setNewDriver((current) => ({
                        ...current,
                        registration: event.target.value,
                      }))
                    }
                    placeholder="Ex. 12345-A-6"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white uppercase outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                </div>

                {/* LOCALISATION */}
                <div className="sm:col-span-2">

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Localisation
                  </label>

                  <input
                    type="text"
                    value={newDriver.location}
                    onChange={(event) =>
                      setNewDriver((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                    placeholder="Ex. Casablanca"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                  />

                </div>

              </div>

              <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                <div className="flex gap-3">

                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

                  <div>

                    <p className="text-sm font-medium text-white">
                      Création du conducteur
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Le conducteur sera ajouté immédiatement à la liste.
                      Ses statistiques commenceront à zéro et son score
                      initial sera fixé à 100/100 jusqu'à réception des
                      données réelles de conduite.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-800 p-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={closeAddDriverModal}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleAddDriver}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Ajouter le conducteur
              </button>

            </div>

          </div>

        </div>

      )}

      {/* ========================================================= */}
      {/* PANNEAU DETAILS CONDUCTEUR                                */}
      {/* ========================================================= */}

      {selectedDriver && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDriver(null);
            }
          }}
        >

          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            {/* HEADER MODAL */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div className="flex items-center gap-4">

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-indigo-500/20 text-sm font-bold text-blue-300 ring-1 ring-blue-500/20">
                  {selectedDriver.initials}
                </div>

                <div>

                  <h2 className="text-lg font-semibold text-white">
                    {selectedDriver.name}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Détails du conducteur
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            {/* CONTENU */}
            <div className="max-h-[75vh] overflow-y-auto p-5">

              {/* PROFIL */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <p className="text-xs text-slate-500">
                      Conducteur
                    </p>

                    <p className="mt-1 text-base font-semibold text-white">
                      {selectedDriver.name}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-400">
                      <Phone className="h-4 w-4" />
                      {selectedDriver.phone}
                    </div>

                  </div>

                  <StatusBadge
                    status={selectedDriver.status}
                  />

                </div>

              </div>

              {/* INFORMATIONS */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                <DetailCard
                  icon={<Car className="h-4 w-4" />}
                  label="Véhicule affecté"
                  value={selectedDriver.vehicle}
                />

                <DetailCard
                  icon={<Gauge className="h-4 w-4" />}
                  label="Immatriculation"
                  value={selectedDriver.registration}
                />

                <DetailCard
                  icon={<MapPin className="h-4 w-4" />}
                  label="Position"
                  value={selectedDriver.location}
                />

                <DetailCard
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Dernière activité"
                  value={selectedDriver.lastActivity}
                />

              </div>

              {/* STATISTIQUES */}
              <div className="mt-4">

                <h3 className="mb-3 text-sm font-semibold text-white">
                  Activité
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <Route className="h-4 w-4 text-blue-400" />

                    <p className="mt-3 text-xl font-bold text-white">
                      {selectedDriver.trips}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Trajets
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <MapPin className="h-4 w-4 text-purple-400" />

                    <p className="mt-3 text-xl font-bold text-white">
                      {selectedDriver.distance} km
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Distance
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />

                    <p className="mt-3 text-xl font-bold text-emerald-400">
                      {selectedDriver.score}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Score /100
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <AlertTriangle className="h-4 w-4 text-red-400" />

                    <p className="mt-3 text-xl font-bold text-red-400">
                      {selectedDriver.incidents}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Incidents
                    </p>
                  </div>

                </div>

              </div>

              {/* SCORE */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-sm font-medium text-white">
                      Score de conduite
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Évaluation actuelle
                    </p>

                  </div>

                  <span className="text-2xl font-bold text-emerald-400">
                    {selectedDriver.score}/100
                  </span>

                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className={`h-full rounded-full ${
                      selectedDriver.score >= 90
                        ? "bg-emerald-500"
                        : selectedDriver.score >= 80
                          ? "bg-blue-500"
                          : "bg-amber-500"
                    }`}
                    style={{
                      width: `${selectedDriver.score}%`,
                    }}
                  />

                </div>

              </div>

              {/* FOOTER INFO */}
              <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                <div className="flex gap-3">

                  <Activity className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

                  <div>

                    <p className="text-sm font-medium text-white">
                      Données du conducteur
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Ces informations sont actuellement des données de
                      démonstration. Elles pourront être remplacées par les
                      données réelles provenant de Traccar et des boîtiers
                      télématiques.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* FOOTER */}
            <div className="flex justify-end border-t border-slate-800 p-4">

              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Fermer
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}