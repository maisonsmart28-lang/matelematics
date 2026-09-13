"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Droplets,
  Fuel,
  Gauge,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";

import { supabase } from "../../components/supabase";

type JsonMap = Record<string, unknown>;
type FuelStatus = "Normal" | "Faible" | "Critique" | "Indisponible";

type FleetVehicle = {
  id: string;
  name: string;
  registration: string;
};

type VehicleLive = {
  vehicle: {
    id: string;
    name: string;
    registration: string;
    status: string;
  };
  hardware: {
    capabilities: string[];
  };
  telemetry: {
    recorded_at: string;
    can_payload: JsonMap | null;
  } | null;
};

type FuelRow = {
  id: string;
  vehicle: string;
  registration: string;
  fuelLevel: number | null;
  fuelUsed: number | null;
  odometer: number | null;
  recordedAt: string | null;
  status: FuelStatus;
  supportsFuel: boolean;
};

function numeric(object: JsonMap | null | undefined, key: string) {
  const value = object?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function fuelStatus(level: number | null, supportsFuel: boolean): FuelStatus {
  if (!supportsFuel || level === null) return "Indisponible";
  if (level <= 15) return "Critique";
  if (level <= 30) return "Faible";
  return "Normal";
}

function statusClasses(status: FuelStatus) {
  if (status === "Critique") return "border-red-500/20 bg-red-500/10 text-red-300";
  if (status === "Faible") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  if (status === "Normal") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  return "border-slate-700 bg-slate-800 text-slate-400";
}

function formatNumber(value: number | null, decimals = 0) {
  if (value === null) return "—";
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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

export default function CarburantPage() {
  const [rows, setRows] = useState<FuelRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Tous" | FuelStatus>("Tous");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) throw new Error("Session expirée.");

      const fleetResponse = await fetch("/api/dashboard/fleet", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const fleetPayload = (await fleetResponse.json()) as {
        vehicles?: FleetVehicle[];
        error?: string;
      };

      if (!fleetResponse.ok) {
        throw new Error(fleetPayload.error ?? "Impossible de charger la flotte.");
      }

      const vehicles = fleetPayload.vehicles ?? [];
      const results = await Promise.all(
        vehicles.map(async (vehicle): Promise<FuelRow> => {
          try {
            const response = await fetch(`/api/vehicles/${encodeURIComponent(vehicle.id)}/live`, {
              cache: "no-store",
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const payload = (await response.json()) as VehicleLive & { error?: string };
            if (!response.ok) throw new Error(payload.error ?? "Données indisponibles.");

            const capabilities = new Set(payload.hardware?.capabilities ?? []);
            const supportsFuel = capabilities.has("fuel_level") || capabilities.has("fuel_used");
            const can = payload.telemetry?.can_payload ?? null;
            const fuelLevel = capabilities.has("fuel_level")
              ? numeric(can, "fuel_level_percent")
              : null;
            const fuelUsed = capabilities.has("fuel_used")
              ? numeric(can, "fuel_used_litres")
              : null;
            const odometer = capabilities.has("can_odometer")
              ? numeric(can, "odometer_km")
              : null;

            return {
              id: vehicle.id,
              vehicle: payload.vehicle?.name ?? vehicle.name,
              registration: payload.vehicle?.registration ?? vehicle.registration,
              fuelLevel,
              fuelUsed,
              odometer,
              recordedAt: payload.telemetry?.recorded_at ?? null,
              status: fuelStatus(fuelLevel, supportsFuel),
              supportsFuel,
            };
          } catch {
            return {
              id: vehicle.id,
              vehicle: vehicle.name,
              registration: vehicle.registration,
              fuelLevel: null,
              fuelUsed: null,
              odometer: null,
              recordedAt: null,
              status: "Indisponible",
              supportsFuel: false,
            };
          }
        }),
      );

      setRows(results);
      setError(null);
    } catch (cause) {
      setRows([]);
      setError(cause instanceof Error ? cause.message : "Impossible de charger les données carburant.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !needle ||
        row.vehicle.toLowerCase().includes(needle) ||
        row.registration.toLowerCase().includes(needle);
      const matchesFilter = filter === "Tous" || row.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [rows, search, filter]);

  const measurable = rows.filter((row) => row.fuelLevel !== null);
  const averageFuel = measurable.length
    ? measurable.reduce((sum, row) => sum + (row.fuelLevel ?? 0), 0) / measurable.length
    : null;
  const lowCount = rows.filter((row) => row.status === "Faible").length;
  const criticalCount = rows.filter((row) => row.status === "Critique").length;
  const unavailableCount = rows.filter((row) => row.status === "Indisponible").length;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
            <Fuel className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Gestion du carburant</h1>
            <p className="mt-1 text-sm text-slate-400">
              Niveaux carburant réels issus de la télémétrie des véhicules compatibles.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Niveau moyen mesuré" value={averageFuel === null ? "—" : `${formatNumber(averageFuel, 1)} %`} icon={<Droplets className="h-5 w-5 text-cyan-400" />} />
        <Metric label="Véhicules mesurables" value={`${measurable.length} / ${rows.length}`} icon={<Gauge className="h-5 w-5 text-blue-400" />} />
        <Metric label="Niveau faible" value={String(lowCount)} icon={<AlertTriangle className="h-5 w-5 text-amber-400" />} />
        <Metric label="Niveau critique" value={String(criticalCount)} icon={<AlertTriangle className="h-5 w-5 text-red-400" />} />
      </div>

      {unavailableCount > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-400">
          {unavailableCount} véhicule{unavailableCount > 1 ? "s" : ""} sans mesure carburant exploitable actuellement. Aucune valeur n&apos;est inventée pour ces véhicules.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-white">État carburant de la flotte</h2>
            <p className="mt-1 text-xs text-slate-500">
              Dernière télémétrie disponible par véhicule accessible à votre compte.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher..."
                className="rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as "Tous" | FuelStatus)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500"
            >
              <option value="Tous">Tous</option>
              <option value="Normal">Normal</option>
              <option value="Faible">Faible</option>
              <option value="Critique">Critique</option>
              <option value="Indisponible">Indisponible</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Véhicule</th>
                <th className="px-4 py-3">Niveau</th>
                <th className="px-4 py-3">Carburant utilisé</th>
                <th className="px-4 py-3">Odomètre CAN</th>
                <th className="px-4 py-3">Dernière mesure</th>
                <th className="px-4 py-3">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Chargement des données carburant...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Aucun véhicule ne correspond aux filtres.</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10"><Truck className="h-4 w-4 text-blue-400" /></div>
                        <div><p className="font-medium text-white">{row.vehicle}</p><p className="mt-0.5 text-xs text-slate-500">{row.registration}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-white">{row.fuelLevel === null ? "—" : `${formatNumber(row.fuelLevel, 1)} %`}</td>
                    <td className="px-4 py-4 text-slate-300">{row.fuelUsed === null ? "—" : `${formatNumber(row.fuelUsed, 1)} L`}</td>
                    <td className="px-4 py-4 text-slate-300">{row.odometer === null ? "—" : `${formatNumber(row.odometer, 1)} km`}</td>
                    <td className="px-4 py-4 text-slate-400">{formatDate(row.recordedAt)}</td>
                    <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(row.status)}`}>{row.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-400">
        Les consommations L/100 km, distances par période et historiques carburant ne sont pas encore calculés ici. Ils seront ajoutés à partir des relevés télématiques réels, sans données simulées.
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between"><span className="text-sm text-slate-400">{label}</span>{icon}</div>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
