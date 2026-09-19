"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Clock3,
  Gauge,
  MapPin,
  Navigation,
  Route,
  Search,
} from "lucide-react";

import { supabase } from "../../components/supabase";

type HistoryWindowHours = 1 | 6 | 24 | 168 | 720 | 2160 | 4320 | 8760;
type PeriodMode = HistoryWindowHours | "custom";

type FleetVehicle = {
  id: string;
  name: string;
  registration: string;
};

type TripSummary = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  distanceKm: number;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  pointCount: number;
  avgSpeed: number;
  maxSpeed: number;
};

type TripPoint = {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
};

type TripSampling = {
  rawPointCount: number;
  returnedPointCount: number;
  sampled: boolean;
  maxMapPoints: number;
};

type AppliedRange = {
  from: string;
  to: string;
  startDate: string;
  endDate: string;
};

const PERIODS: Array<{ value: HistoryWindowHours; label: string }> = [
  { value: 1, label: "1 h" },
  { value: 6, label: "6 h" },
  { value: 24, label: "24 h" },
  { value: 168, label: "7 jours" },
  { value: 720, label: "30 jours" },
  { value: 2160, label: "3 mois" },
  { value: 4320, label: "6 mois" },
  { value: 8760, label: "1 an" },
];

const PAGE_SIZE = 25;

const LeafletMap = dynamic(() => import("../LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-950">
      <p className="text-sm text-slate-400">Chargement de la carte...</p>
    </div>
  ),
});

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDateLimits() {
  const now = new Date();
  const earliest = new Date(now);
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 1);
  return {
    today: dateInputValue(now),
    earliest: dateInputValue(earliest),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function HistoryPage() {
  const limits = useMemo(() => getDateLimits(), []);
  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 7);
    return dateInputValue(date);
  }, []);

  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState("");
  const [search, setSearch] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodMode>(24);
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(limits.today);
  const [appliedRange, setAppliedRange] = useState<AppliedRange | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripPoints, setTripPoints] = useState<TripPoint[]>([]);
  const [sampling, setSampling] = useState<TripSampling | null>(null);
  const [fleetLoading, setFleetLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripError, setTripError] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFleet() {
      try {
        setFleetLoading(true);
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) throw new Error("Session expirée.");

        const response = await fetch("/api/dashboard/fleet", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = (await response.json()) as {
          vehicles?: FleetVehicle[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger la flotte.");
        }

        if (cancelled) return;
        const accessibleVehicles = payload.vehicles ?? [];
        setVehicles(accessibleVehicles);
        setVehicleId((current) => current || accessibleVehicles[0]?.id || "");
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setVehicles([]);
        setVehicleId("");
        setError(cause instanceof Error ? cause.message : "Impossible de charger la flotte.");
      } finally {
        if (!cancelled) setFleetLoading(false);
      }
    }

    void loadFleet();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setPage(1);
      setSelectedTripId(null);
      setTripPoints([]);
      setSampling(null);
      setTripError(null);
      });
  }, [vehicleId, periodMode, appliedRange?.from, appliedRange?.to]);

  useEffect(() => {
    let cancelled = false;

    if (!vehicleId || (periodMode === "custom" && !appliedRange)) {
      queueMicrotask(() => {
        setTrips([]);
        setTotal(0);
        setTotalPages(0);
        });
      return () => {
        cancelled = true;
      };
    }

    async function loadTrips() {
      try {
        setTripsLoading(true);
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) throw new Error("Session expirée.");

        const query = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        if (periodMode === "custom" && appliedRange) {
          query.set("from", appliedRange.from);
          query.set("to", appliedRange.to);
        } else {
          query.set("hours", String(periodMode));
        }

        const response = await fetch(
          `/api/dashboard/vehicles/${encodeURIComponent(vehicleId)}/trips?${query.toString()}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        const payload = (await response.json()) as {
          trips?: TripSummary[];
          pagination?: { page: number; pageSize: number; total: number; totalPages: number };
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger l'historique.");
        }

        if (cancelled) return;
        setTrips(payload.trips ?? []);
        setTotal(payload.pagination?.total ?? 0);
        setTotalPages(payload.pagination?.totalPages ?? 0);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setTrips([]);
        setTotal(0);
        setTotalPages(0);
        setError(cause instanceof Error ? cause.message : "Impossible de charger l'historique.");
      } finally {
        if (!cancelled) setTripsLoading(false);
      }
    }

    void loadTrips();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, periodMode, appliedRange, page]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  useEffect(() => {
    let cancelled = false;

    if (!selectedTrip || !vehicleId) {
      queueMicrotask(() => {
        setTripPoints([]);
        setSampling(null);
        setTripError(null);
        });
      return () => {
        cancelled = true;
      };
    }

    const trip = selectedTrip;

    async function loadTrip(currentTrip: TripSummary) {
      try {
        setTripLoading(true);
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) throw new Error("Session expirée.");

        const query = new URLSearchParams({
          from: currentTrip.startedAt,
          to: currentTrip.endedAt,
        });
        const response = await fetch(
          `/api/dashboard/vehicles/${encodeURIComponent(vehicleId)}/trips/points?${query.toString()}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        const payload = (await response.json()) as {
          points?: TripPoint[];
          sampling?: TripSampling;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger le trajet.");
        }

        if (cancelled) return;
        setTripPoints(payload.points ?? []);
        setSampling(payload.sampling ?? null);
        setTripError(null);
      } catch (cause) {
        if (cancelled) return;
        setTripPoints([]);
        setSampling(null);
        setTripError(cause instanceof Error ? cause.message : "Impossible de charger le trajet.");
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    }

    void loadTrip(trip);
    return () => {
      cancelled = true;
    };
  }, [vehicleId, selectedTrip]);

  const filteredVehicles = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return vehicles;
    return vehicles.filter(
      (vehicle) =>
        vehicle.name.toLowerCase().includes(needle) ||
        vehicle.registration.toLowerCase().includes(needle),
    );
  }, [vehicles, search]);

  function choosePreset(value: HistoryWindowHours) {
    setRangeError(null);
    setAppliedRange(null);
    setPeriodMode(value);
  }

  function chooseCustom() {
    setRangeError(null);
    setAppliedRange(null);
    setPeriodMode("custom");
  }

  function applyCustomRange() {
    if (!customStart || !customEnd) {
      setRangeError("Les dates de début et de fin sont obligatoires.");
      return;
    }
    if (customStart > customEnd) {
      setRangeError("La date de début doit être antérieure ou égale à la date de fin.");
      return;
    }
    if (customStart < limits.earliest || customEnd > limits.today) {
      setRangeError("La période personnalisée doit rester dans les 12 derniers mois et ne peut pas être future.");
      return;
    }

    const now = new Date();
    const from = new Date(`${customStart}T00:00:00.000Z`);
    const endOfDay = new Date(`${customEnd}T23:59:59.999Z`);
    const to = customEnd === limits.today ? now : endOfDay;

    setRangeError(null);
    setAppliedRange({
      from: from.toISOString(),
      to: to.toISOString(),
      startDate: customStart,
      endDate: customEnd,
    });
  }

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
  const route = tripPoints.map((point) => ({ lat: point.lat, lng: point.lng }));
  const periodLabel =
    periodMode === "custom"
      ? appliedRange
        ? `${formatDateOnly(appliedRange.startDate)} → ${formatDateOnly(appliedRange.endDate)}`
        : "Période personnalisée à appliquer"
      : PERIODS.find((item) => item.value === periodMode)?.label ?? `${periodMode} h`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Clock3 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Historique</h1>
            <p className="mt-1 text-sm text-slate-400">
              Consultez les trajets réels de la flotte accessible à votre compte.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500">Véhicule sélectionné</p>
          <p className="mt-1 text-sm font-medium text-white">
            {selectedVehicle
              ? `${selectedVehicle.name} · ${selectedVehicle.registration}`
              : fleetLoading
                ? "Chargement..."
                : "Aucun véhicule"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.9fr)_minmax(240px,1fr)_minmax(0,2.2fr)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un véhicule..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          <select
            value={vehicleId}
            onChange={(event) => setVehicleId(event.target.value)}
            disabled={fleetLoading || filteredVehicles.length === 0}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 outline-none focus:border-blue-500 disabled:opacity-50"
          >
            {filteredVehicles.length === 0 ? (
              <option value="">Aucun véhicule accessible</option>
            ) : (
              filteredVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} · {vehicle.registration}
                </option>
              ))
            )}
          </select>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-10">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => choosePreset(item.value)}
                className={`rounded-xl border px-2 py-3 text-sm font-medium transition ${
                  periodMode === item.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={chooseCustom}
              className={`col-span-2 whitespace-nowrap rounded-xl border px-3 py-3 text-sm font-medium transition ${
                periodMode === "custom"
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
              }`}
            >
              Personnalisée
            </button>
          </div>
        </div>

        {periodMode === "custom" && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="space-y-2 text-xs text-slate-400">
                <span>Date de début</span>
                <input
                  type="date"
                  min={limits.earliest}
                  max={limits.today}
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="space-y-2 text-xs text-slate-400">
                <span>Date de fin</span>
                <input
                  type="date"
                  min={limits.earliest}
                  max={limits.today}
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </label>
              <button
                type="button"
                onClick={applyCustomRange}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Appliquer
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Plage autorisée : du {formatDateOnly(limits.earliest)} au {formatDateOnly(limits.today)}.
            </p>
            {rangeError && <p className="mt-2 text-sm text-red-400">{rangeError}</p>}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Trajets trouvés"
          value={tripsLoading ? "…" : String(total)}
          icon={<Navigation className="h-5 w-5 text-blue-400" />}
        />
        <SummaryCard
          label="Distance sélectionnée"
          value={selectedTrip ? `${selectedTrip.distanceKm.toFixed(1)} km` : "—"}
          icon={<Route className="h-5 w-5 text-emerald-400" />}
        />
        <SummaryCard
          label="Durée sélectionnée"
          value={selectedTrip ? formatDuration(selectedTrip.durationSeconds) : "—"}
          icon={<Clock3 className="h-5 w-5 text-violet-400" />}
        />
        <SummaryCard
          label="Vitesse max. sélectionnée"
          value={selectedTrip ? `${Math.round(selectedTrip.maxSpeed)} km/h` : "—"}
          icon={<Gauge className="h-5 w-5 text-amber-400" />}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
        <CalendarDays className="mr-2 inline h-4 w-4 text-blue-400" />
        Période : <span className="font-medium text-slate-200">{periodLabel}</span>. La liste affiche les trajets du véhicule choisi ; la carte reste vide jusqu&apos;à la sélection d&apos;un trajet.
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(520px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Trajets</h2>
                <p className="mt-1 text-sm text-slate-400">Sélectionnez un trajet pour l&apos;afficher sur la carte.</p>
              </div>
              <span className="rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-400">
                {total} trajet{total > 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Départ</th>
                  <th className="px-4 py-3 font-medium">Arrivée</th>
                  <th className="px-4 py-3 font-medium">Durée</th>
                  <th className="px-4 py-3 font-medium">Distance</th>
                  <th className="px-4 py-3 font-medium">Vitesse moy.</th>
                  <th className="px-4 py-3 font-medium">Vitesse max.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {tripsLoading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Chargement des trajets...</td></tr>
                ) : periodMode === "custom" && !appliedRange ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Choisissez puis appliquez une période personnalisée.</td></tr>
                ) : trips.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Aucun trajet enregistré sur cette période.</td></tr>
                ) : (
                  trips.map((trip) => {
                    const active = trip.id === selectedTripId;
                    return (
                      <tr
                        key={trip.id}
                        onClick={() => setSelectedTripId(trip.id)}
                        className={`cursor-pointer transition ${active ? "bg-blue-500/10" : "hover:bg-slate-800/60"}`}
                      >
                        <td className="px-4 py-3 text-white">{formatDate(trip.startedAt)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDate(trip.endedAt)}</td>
                        <td className="px-4 py-3 text-slate-300">{formatDuration(trip.durationSeconds)}</td>
                        <td className="px-4 py-3 font-medium text-white">{trip.distanceKm.toFixed(1)} km</td>
                        <td className="px-4 py-3 text-slate-300">{Math.round(trip.avgSpeed)} km/h</td>
                        <td className="px-4 py-3 text-slate-300">{Math.round(trip.maxSpeed)} km/h</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Page {totalPages === 0 ? 0 : page} sur {totalPages}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || tripsLoading}
                onClick={() => {
                  setSelectedTripId(null);
                  setPage((current) => Math.max(1, current - 1));
                }}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={page >= totalPages || totalPages === 0 || tripsLoading}
                onClick={() => {
                  setSelectedTripId(null);
                  setPage((current) => current + 1);
                }}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Détail cartographique</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedTrip ? `${formatDate(selectedTrip.startedAt)} → ${formatDate(selectedTrip.endedAt)}` : "Choisissez un trajet dans le tableau."}
                </p>
              </div>
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
          </div>

          <div className="h-[460px] bg-slate-950">
            {selectedTrip ? (
              tripLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Chargement du tracé...</div>
              ) : tripError ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-400">{tripError}</div>
              ) : route.length > 1 ? (
                <LeafletMap vehicles={[]} route={route} />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">Aucun tracé GPS exploitable pour ce trajet.</div>
              )
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">La carte n&apos;affiche aucun historique tant qu&apos;un trajet n&apos;est pas sélectionné.</div>
            )}
          </div>

          {selectedTrip && (
            <div className="space-y-3 border-t border-slate-800 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Départ GPS" value={formatCoordinates(selectedTrip.start.lat, selectedTrip.start.lng)} />
                <Info label="Arrivée GPS" value={formatCoordinates(selectedTrip.end.lat, selectedTrip.end.lng)} />
              </div>
              {sampling?.sampled && (
                <p className="text-xs leading-5 text-amber-300">Tracé optimisé : {sampling.returnedPointCount} points affichés sur {sampling.rawPointCount} points GPS, répartis sur l&apos;ensemble du trajet.</p>
              )}
              {!sampling?.sampled && sampling && (
                <p className="text-xs text-slate-500">{sampling.returnedPointCount} points GPS affichés.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}
