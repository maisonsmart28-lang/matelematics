"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Droplets,
  Fuel,
  Gauge,
  RefreshCw,
  Route,
  Search,
  Truck,
} from "lucide-react";

import { supabase } from "../../components/supabase";

type JsonMap = Record<string, unknown>;
type FuelStatus = "Normal" | "Faible" | "Critique" | "Indisponible";
type HistoryWindowHours = 1 | 6 | 24 | 168 | 720 | 2160 | 4320 | 8760;
type HistoryMode = HistoryWindowHours | "custom";

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

type FuelHistoryPoint = {
  recordedAt: string;
  fuelLevelPercent: number | null;
  fuelUsedLitres: number | null;
  odometerKm: number | null;
};

type FuelHistoryPayload = {
  vehicle: {
    id: string;
    name: string;
    registration: string;
  };
  window: {
    mode: "preset" | "custom";
    hours: HistoryWindowHours | null;
    from: string;
    to: string;
  };
  summary: {
    rawCount: number;
    firstFuelLevelPercent: number | null;
    lastFuelLevelPercent: number | null;
    fuelConsumedLitres: number;
    distanceKm: number;
    averageConsumptionL100km: number | null;
    counterResetCount: number;
  };
  points: FuelHistoryPoint[];
  sampling: {
    returnedPoints: number;
    rawCount: number;
    maxPoints: number;
  };
  error?: string;
};

const PERIODS: Array<{ value: HistoryWindowHours; label: string }> = [
  { value: 1, label: "1 h" },
  { value: 6, label: "6 h" },
  { value: 24, label: "24 h" },
  { value: 168, label: "7 j" },
  { value: 720, label: "30 j" },
  { value: 2160, label: "3 mois" },
  { value: 4320, label: "6 mois" },
  { value: 8760, label: "1 an" },
];

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

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function customBounds() {
  const today = new Date();
  const earliest = new Date(today);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 1);
  return {
    min: toDateInput(earliest),
    max: toDateInput(today),
  };
}

function dayRange(fromInput: string, toInput: string) {
  const from = new Date(`${fromInput}T00:00:00.000Z`);
  const today = toDateInput(new Date());
  const to =
    toInput === today
      ? new Date()
      : new Date(`${toInput}T23:59:59.999Z`);
  return { from, to };
}

export default function CarburantPage() {
  const [rows, setRows] = useState<FuelRow[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Tous" | FuelStatus>("Tous");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [historyMode, setHistoryMode] = useState<HistoryMode>(24);
  const bounds = useMemo(() => customBounds(), []);
  const [customFrom, setCustomFrom] = useState(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 7);
    return toDateInput(date);
  });
  const [customTo, setCustomTo] = useState(() => toDateInput(new Date()));
  const [appliedCustom, setAppliedCustom] = useState<{ from: string; to: string } | null>(null);
  const [history, setHistory] = useState<FuelHistoryPayload | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  const measurableRows = useMemo(
    () => rows.filter((row) => row.supportsFuel),
    [rows],
  );

  useEffect(() => {
    if (measurableRows.length === 0) {
      setSelectedVehicleId("");
      return;
    }

    if (!measurableRows.some((row) => row.id === selectedVehicleId)) {
      setSelectedVehicleId(measurableRows[0].id);
    }
  }, [measurableRows, selectedVehicleId]);

  const loadHistory = useCallback(async () => {
    if (!selectedVehicleId) {
      setHistory(null);
      return;
    }

    if (historyMode === "custom" && !appliedCustom) {
      setHistory(null);
      return;
    }

    setHistoryLoading(true);
    setHistoryError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée.");

      const params = new URLSearchParams();
      if (historyMode === "custom" && appliedCustom) {
        params.set("from", appliedCustom.from);
        params.set("to", appliedCustom.to);
      } else if (historyMode !== "custom") {
        params.set("hours", String(historyMode));
      }

      const response = await fetch(
        `/api/dashboard/vehicles/${encodeURIComponent(selectedVehicleId)}/fuel-history?${params.toString()}`,
        {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const payload = (await response.json()) as FuelHistoryPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Impossible de charger l'historique carburant.");
      }

      setHistory(payload);
    } catch (cause) {
      setHistory(null);
      setHistoryError(cause instanceof Error ? cause.message : "Erreur d'historique carburant.");
    } finally {
      setHistoryLoading(false);
    }
  }, [appliedCustom, historyMode, selectedVehicleId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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

  function selectPeriod(value: HistoryMode) {
    setHistoryMode(value);
    setAppliedCustom(null);
    setHistory(null);
    setHistoryError(null);
  }

  function applyCustomRange() {
    try {
      const { from, to } = dayRange(customFrom, customTo);
      const earliest = new Date();
      earliest.setUTCFullYear(earliest.getUTCFullYear() - 1);

      if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
        throw new Error("Dates invalides.");
      }
      if (from >= to) throw new Error("La date de début doit être antérieure à la date de fin.");
      if (from < earliest) throw new Error("La période doit rester dans les 12 derniers mois.");
      if (to > new Date()) throw new Error("La période ne peut pas se terminer dans le futur.");

      setAppliedCustom({ from: from.toISOString(), to: to.toISOString() });
      setHistoryError(null);
    } catch (cause) {
      setAppliedCustom(null);
      setHistory(null);
      setHistoryError(cause instanceof Error ? cause.message : "Période invalide.");
    }
  }

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
              Niveaux et historiques réels issus de la télémétrie des véhicules compatibles.
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
          <span>{unavailableCount} véhicule{unavailableCount > 1 ? "s" : ""}</span>{" "}
          <span>sans mesure carburant exploitable actuellement. Aucune valeur n&apos;est inventée pour ces véhicules.</span>
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
              <h2 className="font-semibold text-white">Historique carburant</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Historique télématique réel, consultable jusqu&apos;aux 12 derniers mois.
            </p>
          </div>

          <div className="min-w-[260px]">
            <label className="mb-1 block text-xs text-slate-500">Véhicule compatible</label>
            <select
              value={selectedVehicleId}
              onChange={(event) => {
                setSelectedVehicleId(event.target.value);
                setHistory(null);
              }}
              disabled={measurableRows.length === 0}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              {measurableRows.length === 0 ? (
                <option value="">Aucun véhicule compatible</option>
              ) : (
                measurableRows.map((row) => (
                  <option key={row.id} value={row.id}>{row.vehicle} · {row.registration}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {PERIODS.map((period) => (
            <button
              key={period.value}
              type="button"
              onClick={() => selectPeriod(period.value)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                historyMode === period.value
                  ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                  : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white"
              }`}
            >
              {period.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => selectPeriod("custom")}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition ${
              historyMode === "custom"
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300"
                : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white"
            }`}
          >
            Personnalisée
          </button>
        </div>

        {historyMode === "custom" && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 lg:flex-row lg:items-end">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Du</label>
              <input
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={customFrom}
                onChange={(event) => {
                  setCustomFrom(event.target.value);
                  setAppliedCustom(null);
                  setHistory(null);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Au</label>
              <input
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={customTo}
                onChange={(event) => {
                  setCustomTo(event.target.value);
                  setAppliedCustom(null);
                  setHistory(null);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="button"
              onClick={applyCustomRange}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Appliquer
            </button>
            <p className="text-xs text-slate-500 lg:ml-2 lg:pb-2">
              Plage autorisée : {bounds.min.split("-").reverse().join("/")} → {bounds.max.split("-").reverse().join("/")}.
            </p>
          </div>
        )}

        {historyError && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {historyError}
          </div>
        )}

        {historyLoading ? (
          <div className="mt-6 flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Chargement de l&apos;historique carburant...
          </div>
        ) : history ? (
          <div className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Carburant consommé"
                value={history.summary.rawCount > 1 ? `${formatNumber(history.summary.fuelConsumedLitres, 1)} L` : "—"}
                icon={<Fuel className="h-5 w-5 text-orange-400" />}
              />
              <Metric
                label="Distance mesurée"
                value={history.summary.rawCount > 1 ? `${formatNumber(history.summary.distanceKm, 1)} km` : "—"}
                icon={<Route className="h-5 w-5 text-violet-400" />}
              />
              <Metric
                label="Consommation moyenne"
                value={history.summary.averageConsumptionL100km === null ? "—" : `${formatNumber(history.summary.averageConsumptionL100km, 1)} L/100 km`}
                icon={<Gauge className="h-5 w-5 text-blue-400" />}
              />
              <Metric
                label="Niveau début → fin"
                value={`${formatNumber(history.summary.firstFuelLevelPercent, 0)} % → ${formatNumber(history.summary.lastFuelLevelPercent, 0)} %`}
                icon={<Droplets className="h-5 w-5 text-cyan-400" />}
              />
            </div>

            {history.summary.counterResetCount > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
                {history.summary.counterResetCount} remise{history.summary.counterResetCount > 1 ? "s" : ""} à zéro ou recul de compteur détecté{history.summary.counterResetCount > 1 ? "s" : ""} sur la période. Les agrégats additionnent uniquement les variations positives pour éviter les valeurs négatives artificielles.
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Évolution du niveau carburant</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(history.window.from)} → {formatDate(history.window.to)}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {history.sampling.returnedPoints} points affichés sur {history.sampling.rawCount.toLocaleString("fr-FR")} relevés.
                </p>
              </div>

              <FuelLevelChart points={history.points} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Niveau</th>
                    <th className="px-4 py-3">Compteur carburant</th>
                    <th className="px-4 py-3">Odomètre CAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.points.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Aucun relevé carburant sur cette période.</td></tr>
                  ) : (
                    history.points.slice(-25).reverse().map((point) => (
                      <tr key={`${point.recordedAt}-${point.odometerKm ?? "x"}`}>
                        <td className="px-4 py-3 text-slate-400">{formatDate(point.recordedAt)}</td>
                        <td className="px-4 py-3 text-white">{point.fuelLevelPercent === null ? "—" : `${formatNumber(point.fuelLevelPercent, 1)} %`}</td>
                        <td className="px-4 py-3 text-slate-300">{point.fuelUsedLitres === null ? "—" : `${formatNumber(point.fuelUsedLitres, 1)} L`}</td>
                        <td className="px-4 py-3 text-slate-300">{point.odometerKm === null ? "—" : `${formatNumber(point.odometerKm, 1)} km`}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {history.points.length > 25 && (
              <p className="text-xs text-slate-500">
                Le tableau affiche les 25 derniers points échantillonnés ; la courbe couvre toute la période sélectionnée.
              </p>
            )}
          </div>
        ) : historyMode === "custom" && !appliedCustom ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-500">
            Choisissez les deux dates puis cliquez sur « Appliquer ».
          </div>
        ) : null}
      </section>
    </div>
  );
}

function FuelLevelChart({ points }: { points: FuelHistoryPoint[] }) {
  const usable = points.filter((point) => point.fuelLevelPercent !== null);

  if (usable.length < 2) {
    return (
      <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-slate-800 text-sm text-slate-600">
        Pas assez de mesures de niveau pour tracer une courbe.
      </div>
    );
  }

  const coordinates = usable
    .map((point, index) => {
      const x = usable.length === 1 ? 0 : (index / (usable.length - 1)) * 1000;
      const level = Math.max(0, Math.min(100, point.fuelLevelPercent ?? 0));
      const y = 200 - level * 1.8;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 p-3">
      <svg viewBox="0 0 1000 220" className="h-52 w-full" role="img" aria-label="Évolution du niveau carburant">
        <line x1="0" y1="20" x2="1000" y2="20" className="stroke-slate-800" strokeWidth="1" />
        <line x1="0" y1="110" x2="1000" y2="110" className="stroke-slate-800" strokeWidth="1" />
        <line x1="0" y1="200" x2="1000" y2="200" className="stroke-slate-800" strokeWidth="1" />
        <polyline points={coordinates} fill="none" className="stroke-cyan-400" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-600">
        <span>{formatDate(usable[0].recordedAt)}</span>
        <span>{formatDate(usable[usable.length - 1].recordedAt)}</span>
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
