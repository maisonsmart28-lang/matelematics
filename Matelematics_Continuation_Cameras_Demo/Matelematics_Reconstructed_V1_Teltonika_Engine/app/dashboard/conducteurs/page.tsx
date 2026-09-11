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

import {
  useDashboardAccess,
} from "../DashboardAccessContext";

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
  const {
    canCreate,
  } = useDashboardAccess();

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
    if (!canCreate) {
      setFormError(
        "Votre rôle ne permet pas d'ajouter un conducteur."
      );
      return;
    }

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

        {canCreate && (
          <button
            type="button"
            onClick={() => setShowAddDriver(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            Ajouter un conducteur
          </button>
        )}

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
                Incidents
              </p>

              <p className="mt-2 text-xl font-bold text-white">
                {totalIncidents}
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="font-semibold text-white">
            Répartition
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Actifs</span>
              <span className="font-semibold text-emerald-400">{activeDrivers}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Disponibles</span>
              <span className="font-semibold text-blue-400">{availableDrivers}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Inactifs</span>
              <span className="font-semibold text-slate-300">
                {drivers.length - activeDrivers - availableDrivers}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 md:min-w-[320px]">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un conducteur..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "Tous" | DriverStatus)
          }
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
        >
          <option>Tous</option>
          <option>Actif</option>
          <option>Disponible</option>
          <option>Inactif</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">Conducteur</th>
                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">Véhicule</th>
                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">Statut</th>
                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">Score</th>
                <th className="px-5 py-4 text-right text-xs uppercase text-slate-500">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {filteredDrivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="transition hover:bg-slate-800/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-300">
                        {driver.initials}
                      </div>
                      <div>
                        <p className="font-medium text-white">{driver.name}</p>
                        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <Phone className="h-3.5 w-3.5" />
                          {driver.phone}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-200">{driver.vehicle}</p>
                    <p className="text-xs text-slate-500">{driver.registration}</p>
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={driver.status} />
                  </td>

                  <td className="px-5 py-4">
                    <Score value={driver.score} />
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedDriver(driver)}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      Voir
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDriver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDriver(null);
            }
          }}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedDriver.name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Fiche conducteur
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDriver(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              <DetailCard icon={<UserRound className="h-4 w-4" />} label="Conducteur" value={selectedDriver.name} />
              <DetailCard icon={<Phone className="h-4 w-4" />} label="Téléphone" value={selectedDriver.phone} />
              <DetailCard icon={<Car className="h-4 w-4" />} label="Véhicule" value={`${selectedDriver.vehicle} • ${selectedDriver.registration}`} />
              <DetailCard icon={<MapPin className="h-4 w-4" />} label="Position" value={selectedDriver.location} />
              <DetailCard icon={<Clock3 className="h-4 w-4" />} label="Dernière activité" value={selectedDriver.lastActivity} />
              <DetailCard icon={<Route className="h-4 w-4" />} label="Trajets" value={`${selectedDriver.trips} aujourd'hui`} />
              <DetailCard icon={<Gauge className="h-4 w-4" />} label="Distance" value={`${selectedDriver.distance} km`} />
              <DetailCard icon={<ShieldCheck className="h-4 w-4" />} label="Score" value={`${selectedDriver.score}/100`} />
              <DetailCard icon={<AlertTriangle className="h-4 w-4" />} label="Incidents" value={String(selectedDriver.incidents)} />
            </div>
          </div>
        </div>
      )}

      {showAddDriver && canCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAddDriverModal();
            }
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Ajouter un conducteur
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Ajoutez un conducteur à votre flotte.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddDriverModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {formError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Nom *</span>
                  <input
                    value={newDriver.name}
                    onChange={(event) =>
                      setNewDriver((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Téléphone *</span>
                  <input
                    value={newDriver.phone}
                    onChange={(event) =>
                      setNewDriver((current) => ({ ...current, phone: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Véhicule *</span>
                  <input
                    value={newDriver.vehicle}
                    onChange={(event) =>
                      setNewDriver((current) => ({ ...current, vehicle: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Immatriculation *</span>
                  <input
                    value={newDriver.registration}
                    onChange={(event) =>
                      setNewDriver((current) => ({ ...current, registration: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Statut</span>
                  <select
                    value={newDriver.status}
                    onChange={(event) =>
                      setNewDriver((current) => ({
                        ...current,
                        status: event.target.value as DriverStatus,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option>Disponible</option>
                    <option>Actif</option>
                    <option>Inactif</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">Localisation</span>
                  <input
                    value={newDriver.location}
                    onChange={(event) =>
                      setNewDriver((current) => ({ ...current, location: event.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 p-5">
              <button
                type="button"
                onClick={closeAddDriverModal}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleAddDriver}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
