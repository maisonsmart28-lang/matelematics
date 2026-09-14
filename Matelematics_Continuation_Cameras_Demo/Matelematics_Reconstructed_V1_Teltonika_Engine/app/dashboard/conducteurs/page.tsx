"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Car,
  CheckCircle2,
  RefreshCw,
  Search,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import { supabase } from "../../components/supabase";

type DriverRow = {
  id: string;
  companyId: string;
  companyName: string;
  fullName: string;
  licenseNumber: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  activeAssignment: {
    id: string;
    assignedAt: string;
    vehicle: {
      id: string;
      name: string;
      registration: string;
      status: string;
    } | null;
  } | null;
};

type DriverDisplayStatus = "En conduite" | "Disponible" | "Inactif";

function displayStatus(driver: DriverRow): DriverDisplayStatus {
  if (driver.status !== "active") return "Inactif";
  if (driver.activeAssignment?.vehicle) return "En conduite";
  return "Disponible";
}

function statusClasses(status: DriverDisplayStatus) {
  if (status === "En conduite") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "Disponible") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-300";
  }

  return "border-slate-700 bg-slate-800 text-slate-400";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ND";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  }).format(new Date(value));
}

export default function ConducteursPage() {
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "Tous" | DriverDisplayStatus
  >("Tous");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrivers = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Session expirée.");
      }

      const response = await fetch("/api/drivers", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await response.json()) as {
        drivers?: DriverRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de charger les conducteurs.");
      }

      setDrivers(payload.drivers ?? []);
    } catch (loadError) {
      setDrivers([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les conducteurs.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDrivers();
  }, [loadDrivers]);

  const filteredDrivers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return drivers.filter((driver) => {
      const status = displayStatus(driver);
      const matchesStatus = statusFilter === "Tous" || status === statusFilter;
      const vehicle = driver.activeAssignment?.vehicle;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        driver.fullName.toLowerCase().includes(normalizedSearch) ||
        (driver.phone ?? "").toLowerCase().includes(normalizedSearch) ||
        (driver.licenseNumber ?? "").toLowerCase().includes(normalizedSearch) ||
        driver.companyName.toLowerCase().includes(normalizedSearch) ||
        (vehicle?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (vehicle?.registration ?? "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [drivers, search, statusFilter]);

  const stats = useMemo(() => {
    let driving = 0;
    let available = 0;
    let inactive = 0;

    for (const driver of drivers) {
      const status = displayStatus(driver);
      if (status === "En conduite") driving += 1;
      else if (status === "Disponible") available += 1;
      else inactive += 1;
    }

    return { total: drivers.length, driving, available, inactive };
  }, [drivers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <Users className="h-6 w-6 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">Conducteurs</h1>
            <p className="mt-1 text-sm text-slate-400">
              Conducteurs et affectations réelles de votre périmètre.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDrivers(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total conducteurs</span>
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">{stats.total}</p>
          <p className="mt-1 text-xs text-slate-500">Enregistrements accessibles</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">En conduite</span>
            <Car className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-400">{stats.driving}</p>
          <p className="mt-1 text-xs text-slate-500">Affectation active à un véhicule</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Disponibles</span>
            <CheckCircle2 className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-400">{stats.available}</p>
          <p className="mt-1 text-xs text-slate-500">Actifs sans affectation</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Inactifs</span>
            <XCircle className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-300">{stats.inactive}</p>
          <p className="mt-1 text-xs text-slate-500">Conducteurs archivés ou désactivés</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-white">Liste des conducteurs</h2>
            <p className="mt-1 text-xs text-slate-500">
              Aucune donnée de démonstration n’est utilisée sur cette page.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, permis, véhicule…"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "Tous" | DriverDisplayStatus)
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500"
            >
              <option value="Tous">Tous les statuts</option>
              <option value="En conduite">En conduite</option>
              <option value="Disponible">Disponible</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-52 items-center justify-center text-sm text-slate-500">
            Chargement des conducteurs…
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
              <UserRound className="h-5 w-5 text-slate-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-300">
              {drivers.length === 0
                ? "Aucun conducteur enregistré"
                : "Aucun conducteur ne correspond aux filtres"}
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {drivers.length === 0
                ? "La base réelle ne contient actuellement aucun conducteur dans votre périmètre."
                : "Modifiez la recherche ou le filtre de statut."}
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-medium">Conducteur</th>
                  <th className="px-3 py-3 font-medium">Client</th>
                  <th className="px-3 py-3 font-medium">Permis</th>
                  <th className="px-3 py-3 font-medium">Téléphone</th>
                  <th className="px-3 py-3 font-medium">Véhicule affecté</th>
                  <th className="px-3 py-3 font-medium">Statut</th>
                  <th className="px-3 py-3 font-medium">Affecté depuis</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => {
                  const status = displayStatus(driver);
                  const vehicle = driver.activeAssignment?.vehicle;

                  return (
                    <tr
                      key={driver.id}
                      className="border-b border-slate-800/70 text-sm last:border-0"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-semibold text-blue-300">
                            {initials(driver.fullName)}
                          </div>
                          <div>
                            <p className="font-medium text-white">{driver.fullName}</p>
                            <p className="mt-0.5 text-xs text-slate-600">
                              Créé le {formatDate(driver.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-300">{driver.companyName}</td>
                      <td className="px-3 py-4 text-slate-300">
                        {driver.licenseNumber || "—"}
                      </td>
                      <td className="px-3 py-4 text-slate-300">{driver.phone || "—"}</td>
                      <td className="px-3 py-4">
                        {vehicle ? (
                          <div>
                            <p className="font-medium text-slate-200">{vehicle.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {vehicle.registration}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500">Non affecté</span>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(status)}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-slate-400">
                        {driver.activeAssignment
                          ? formatDate(driver.activeAssignment.assignedAt)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
