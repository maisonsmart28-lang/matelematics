"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Gauge,
  MapPin,
  Navigation,
  Radio,
  Route,
  Truck,
  Wifi,
} from "lucide-react";

import { supabase } from "../../components/supabase";

type VehicleStatus = "En mouvement" | "À l&apos;arrêt" | "Hors ligne";
type HistoryWindowHours = 1 | 6 | 24 | 168 | 720 | 2160 | 4320 | 8760;
type PeriodMode = HistoryWindowHours | "custom";

type FleetVehicle = {
  id: string;
  companyId: string;
  name: string;
  registration: string;
  driver: string;
  status: string;
  motionStatus: VehicleStatus;
  trackerId: string | null;
  trackerStatus: string | null;
  lastSeenAt: string | null;
  position: {
    lat: number | null;
    lng: number | null;
    speed: number | null;
    heading: number | null;
    recordedAt: string;
  } | null;
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

type RoutePoint = { lat: number; lng: number };

type LeafletVehicle = {
  lat: number;
  lng: number;
  status: "online" | "en route" | "offline";
  vehicleId: string;
};

type AppliedRange = {
  from: string;
  to: string;
  startDate: string;
  endDate: string;
};

const HISTORY_WINDOWS: Array<{ value: HistoryWindowHours; label: string }> = [
  { value: 1, label: "1 h" },
  { value: 6, label: "6 h" },
  { value: 24, label: "24 h" },
  { value: 168, label: "7 jours" },
  { value: 720, label: "30 jours" },
  { value: 2160, label: "3 mois" },
  { value: 4320, label: "6 mois" },
  { value: 8760, label: "1 an" },
];

const TRIPS_PAGE_SIZE = 25;

const LeafletMap = dynamic(() => import("../LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[600px] items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
        <p className="text-sm text-slate-400">Chargement de la carte...</p>
      </div>
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
  return { today: dateInputValue(now), earliest: dateInputValue(earliest) };
}

function formatDateOnly(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatLastSeen(value: string | null) {
  if (!value) return "Jamais";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Date inconnue";
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return `Il y a ${diffSeconds} s`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  return `Il y a ${Math.round(diffHours / 24)} j`;
}

function formatTripDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  const styles = {
    "En mouvement": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "À l'arrêt": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Hors ligne": "bg-slate-800 text-slate-400 border-slate-700",
  };
  const dots = {
    "En mouvement": "bg-emerald-400",
    "À l'arrêt": "bg-amber-400",
    "Hors ligne": "bg-slate-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

export default function MapPage() {
  const limits = useMemo(() => getDateLimits(), []);
  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 7);
    return dateInputValue(date);
  }, []);

  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>(24);
  const [customStart, setCustomStart] = useState(defaultStart);
  const [customEnd, setCustomEnd] = useState(limits.today);
  const [appliedRange, setAppliedRange] = useState<AppliedRange | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripsPage, setTripsPage] = useState(1);
  const [tripsTotal, setTripsTotal] = useState(0);
  const [tripsTotalPages, setTripsTotalPages] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripPoints, setTripPoints] = useState<TripPoint[]>([]);
  const [tripSampling, setTripSampling] = useState<TripSampling | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [tripError, setTripError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Session expirée.");
        const response = await fetch("/api/dashboard/fleet", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = (await response.json()) as { vehicles?: FleetVehicle[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Impossible de charger la flotte.");
        if (cancelled) return;
        const nextVehicles = payload.vehicles ?? [];
        setVehicles(nextVehicles);
        setError(null);
        setSelectedVehicleId((current) => current && nextVehicles.some((vehicle) => vehicle.id === current) ? current : nextVehicles[0]?.id ?? null);
      } catch (cause) {
        if (cancelled) return;
        console.error("[Dashboard map]", cause);
        setError(cause instanceof Error ? cause.message : "Impossible de charger les positions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setTripsPage(1);
      setSelectedTripId(null);
      setTripPoints([]);
      setTripSampling(null);
      setTripError(null);
      });
  }, [selectedVehicleId, periodMode, appliedRange?.from, appliedRange?.to]);

  useEffect(() => {
    let cancelled = false;
    const vehicleId = selectedVehicleId;
    if (!vehicleId || (periodMode === "custom" && !appliedRange)) {
      queueMicrotask(() => {
        setTrips([]);
        setTripsTotal(0);
        setTripsTotalPages(0);
        setTripsError(null);
        });
      return () => { cancelled = true; };
    }

    async function loadTrips(currentVehicleId: string) {
      try {
        setTripsLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Session expirée.");
        const query = new URLSearchParams({ page: String(tripsPage), pageSize: String(TRIPS_PAGE_SIZE) });
        if (periodMode === "custom" && appliedRange) {
          query.set("from", appliedRange.from);
          query.set("to", appliedRange.to);
        } else {
          query.set("hours", String(periodMode));
        }
        const response = await fetch(`/api/dashboard/vehicles/${encodeURIComponent(currentVehicleId)}/trips?${query.toString()}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = (await response.json()) as {
          trips?: TripSummary[];
          pagination?: { page: number; pageSize: number; total: number; totalPages: number };
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Impossible de charger les trajets.");
        if (cancelled) return;
        setTrips(payload.trips ?? []);
        setTripsTotal(payload.pagination?.total ?? 0);
        setTripsTotalPages(payload.pagination?.totalPages ?? 0);
        setTripsError(null);
      } catch (cause) {
        if (cancelled) return;
        console.error("[Dashboard map trips]", cause);
        setTrips([]);
        setTripsTotal(0);
        setTripsTotalPages(0);
        setTripsError(cause instanceof Error ? cause.message : "Impossible de charger les trajets.");
      } finally {
        if (!cancelled) setTripsLoading(false);
      }
    }
    void loadTrips(vehicleId);
    return () => { cancelled = true; };
  }, [selectedVehicleId, periodMode, appliedRange, tripsPage]);

  const selectedTrip = useMemo(() => trips.find((trip) => trip.id === selectedTripId) ?? null, [trips, selectedTripId]);

  useEffect(() => {
    let cancelled = false;
    const vehicleId = selectedVehicleId;
    const trip = selectedTrip;
    if (!vehicleId || !trip) {
      queueMicrotask(() => {
        setTripPoints([]);
        setTripSampling(null);
        setTripError(null);
        });
      return () => { cancelled = true; };
    }
    async function loadSelectedTrip(currentVehicleId: string, currentTrip: TripSummary) {
      try {
        setTripLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Session expirée.");
        const params = new URLSearchParams({ from: currentTrip.startedAt, to: currentTrip.endedAt });
        const response = await fetch(`/api/dashboard/vehicles/${encodeURIComponent(currentVehicleId)}/trips/points?${params.toString()}`, {
          cache: "no-store",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = (await response.json()) as { points?: TripPoint[]; sampling?: TripSampling; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Impossible de charger le tracé du trajet.");
        if (cancelled) return;
        setTripPoints(payload.points ?? []);
        setTripSampling(payload.sampling ?? null);
        setTripError(null);
      } catch (cause) {
        if (cancelled) return;
        console.error("[Dashboard selected trip]", cause);
        setTripPoints([]);
        setTripSampling(null);
        setTripError(cause instanceof Error ? cause.message : "Impossible de charger le tracé du trajet.");
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    }
    void loadSelectedTrip(vehicleId, trip);
    return () => { cancelled = true; };
  }, [selectedVehicleId, selectedTrip]);

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
    setAppliedRange({ from: from.toISOString(), to: to.toISOString(), startDate: customStart, endDate: customEnd });
  }

  function openDatePicker(input: HTMLInputElement) {
    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  }

  const selectedVehicle = useMemo(() => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0] ?? null, [vehicles, selectedVehicleId]);
  const liveVehicles = useMemo(() => vehicles.filter((vehicle) => vehicle.motionStatus !== "Hors ligne" && vehicle.position?.lat != null && vehicle.position?.lng != null), [vehicles]);
  const leafletVehicles: LeafletVehicle[] = liveVehicles.map((vehicle) => ({
    lat: vehicle.position!.lat as number,
    lng: vehicle.position!.lng as number,
    vehicleId: vehicle.id,
    status: vehicle.motionStatus === "En mouvement" ? "en route" : vehicle.motionStatus === "À l'arrêt" ? "online" : "offline",
  }));
  const route: RoutePoint[] = tripPoints.map((point) => ({ lat: point.lat, lng: point.lng }));
  const moving = vehicles.filter((vehicle) => vehicle.motionStatus === "En mouvement").length;
  const stopped = vehicles.filter((vehicle) => vehicle.motionStatus === "À l'arrêt").length;
  const offline = vehicles.filter((vehicle) => vehicle.motionStatus === "Hors ligne").length;
  const selectedIsLive = selectedVehicle?.motionStatus !== "Hors ligne";
  const selectedSpeed = selectedIsLive ? selectedVehicle?.position?.speed : null;
  const selectedHeading = selectedIsLive ? selectedVehicle?.position?.heading : null;
  const selectedHistoryLabel = periodMode === "custom"
    ? appliedRange
      ? `${formatDateOnly(appliedRange.startDate)} → ${formatDateOnly(appliedRange.endDate)}`
      : "Période personnalisée à appliquer"
    : HISTORY_WINDOWS.find((window) => window.value === periodMode)?.label ?? `${periodMode} h`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"><MapPin className="h-5 w-5 text-blue-400" /></div>
        <div><h1 className="text-2xl font-semibold text-white">Carte en direct</h1><p className="mt-1 text-sm text-slate-400">Flotte visible selon votre périmètre Matelematics.</p></div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">Véhicules suivis</p><p className="mt-2 text-2xl font-bold text-white">{vehicles.length}</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">En mouvement</p><p className="mt-2 text-2xl font-bold text-emerald-400">{moving}</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">À l&apos;arrêt</p><p className="mt-2 text-2xl font-bold text-amber-400">{stopped}</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><p className="text-sm text-slate-400">Hors ligne</p><p className="mt-2 text-2xl font-bold text-slate-300">{offline}</p></div>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800 p-4">
            <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Véhicules</h2><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">{vehicles.length}</span></div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Radio className="h-3.5 w-3.5 text-emerald-400" />API flotte Matelematics · données réelles</div>
          </div>
          <div className="max-h-[590px] overflow-y-auto">
            {loading && <div className="p-5 text-sm text-slate-400">Chargement des véhicules...</div>}
            {!loading && vehicles.length === 0 && <div className="p-5 text-sm text-slate-400">Aucun véhicule accessible dans votre périmètre.</div>}
            {vehicles.map((vehicle) => (
              <button key={vehicle.id} type="button" onClick={() => setSelectedVehicleId(vehicle.id)} className={`w-full border-b border-slate-800 p-4 text-left transition ${selectedVehicle?.id === vehicle.id ? "bg-blue-500/10" : "hover:bg-slate-800/50"}`}>
                <div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10"><Truck className="h-4 w-4 text-blue-400" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{vehicle.name}</p><p className="mt-0.5 text-xs text-slate-500">{vehicle.registration}</p><div className="mt-2"><StatusBadge status={vehicle.motionStatus} /></div><p className="mt-2 text-[11px] text-slate-500">{formatLastSeen(vehicle.lastSeenAt)}</p></div></div>
              </button>
            ))}
          </div>
        </aside>

        <div className="relative min-h-[600px] bg-slate-950">
          <LeafletMap vehicles={leafletVehicles} route={route} />

          <div
            className="absolute right-5 top-5 z-[1000] w-[min(92vw,390px)] rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl backdrop-blur"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Période des trajets</p>
            <div className="grid grid-cols-3 gap-2">
              {HISTORY_WINDOWS.map((window) => (
                <button key={window.value} type="button" onClick={() => choosePreset(window.value)} className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${periodMode === window.value ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"}`}>{window.label}</button>
              ))}
              <button type="button" onClick={chooseCustom} className={`col-span-2 whitespace-nowrap rounded-lg border px-2 py-2 text-xs font-medium transition ${periodMode === "custom" ? "border-blue-500 bg-blue-500/10 text-blue-400" : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"}`}>Personnalisée</button>
            </div>
            {periodMode === "custom" && (
              <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-slate-400">
                    Début
                    <input
                      type="date"
                      min={limits.earliest}
                      max={limits.today}
                      value={customStart}
                      onChange={(event) => setCustomStart(event.target.value)}
                      onClick={(event) => {
                        event.stopPropagation();
                        openDatePicker(event.currentTarget);
                      }}
                      className="mt-1 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="text-[11px] text-slate-400">
                    Fin
                    <input
                      type="date"
                      min={limits.earliest}
                      max={limits.today}
                      value={customEnd}
                      onChange={(event) => setCustomEnd(event.target.value)}
                      onClick={(event) => {
                        event.stopPropagation();
                        openDatePicker(event.currentTarget);
                      }}
                      className="mt-1 w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    applyCustomRange();
                  }}
                  className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                >
                  Appliquer
                </button>
                <p className="text-[10px] text-slate-500">Plage autorisée : du {formatDateOnly(limits.earliest)} au {formatDateOnly(limits.today)}.</p>
                {rangeError && <p className="text-xs text-red-300">{rangeError}</p>}
              </div>
            )}
          </div>

          {selectedVehicle && (
            <div className="absolute bottom-5 left-5 right-5 z-[500]">
              <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div><p className="font-semibold text-white">{selectedVehicle.name}</p><p className="mt-1 text-xs text-slate-500">{selectedVehicle.registration}{selectedVehicle.trackerId ? ` · Tracker ${selectedVehicle.trackerId}` : " · Aucun tracker associé"}</p></div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <StatusBadge status={selectedVehicle.motionStatus} />
                    <div className="flex items-center gap-2 text-sm text-slate-300"><Gauge className="h-4 w-4 text-blue-400" />{selectedSpeed == null ? "—" : `${selectedSpeed} km/h`}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-300"><Navigation className="h-4 w-4 text-blue-400" />{selectedHeading == null ? "—" : `${selectedHeading}°`}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-300"><Clock3 className="h-4 w-4 text-slate-400" />{formatLastSeen(selectedVehicle.lastSeenAt)}</div>
                    <div className="flex items-center gap-2 text-sm text-slate-300"><Route className="h-4 w-4 text-cyan-400" />{tripLoading ? "Chargement du trajet..." : selectedTrip ? `${tripPoints.length} points affichés` : "Choisissez un trajet dans le tableau"}</div>
                  </div>
                </div>
                {selectedTrip && <p className="mt-3 text-xs text-cyan-300/80">Trajet sélectionné : {formatTripDate(selectedTrip.startedAt)} → {formatTripDate(selectedTrip.endedAt)} · {selectedTrip.distanceKm.toFixed(1)} km · {formatDuration(selectedTrip.durationSeconds)}.</p>}
                {tripSampling?.sampled && <p className="mt-2 text-xs text-amber-300/90">Ce trajet contient {tripSampling.rawPointCount} points GPS. La carte utilise un échantillonnage réparti sur tout le trajet ({tripSampling.returnedPointCount} points) pour rester lisible et rapide.</p>}
                {tripError && <p className="mt-2 text-xs text-red-300">{tripError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-white">Trajets du véhicule</h2><p className="mt-1 text-xs text-slate-400">{selectedVehicle ? `${selectedVehicle.name} · ${selectedHistoryLabel} · ${tripsTotal} trajet${tripsTotal > 1 ? "s" : ""}` : "Sélectionnez un véhicule."}</p></div>
          <p className="text-xs text-slate-500">Cliquez sur un trajet pour afficher uniquement son tracé sur la carte.</p>
        </div>

        {tripsError && <div className="border-b border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{tripsError}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Départ</th><th className="px-4 py-3">Arrivée</th><th className="px-4 py-3">Durée</th><th className="px-4 py-3">Distance</th><th className="px-4 py-3">Départ GPS</th><th className="px-4 py-3">Arrivée GPS</th><th className="px-4 py-3">Vitesse moy.</th><th className="px-4 py-3">Vitesse max.</th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {tripsLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Chargement des trajets...</td></tr>}
              {!tripsLoading && periodMode === "custom" && !appliedRange && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Choisissez puis appliquez une période personnalisée.</td></tr>}
              {!tripsLoading && !(periodMode === "custom" && !appliedRange) && trips.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Aucun trajet détecté sur cette période.</td></tr>}
              {!tripsLoading && trips.map((trip) => (
                <tr key={trip.id} onClick={() => setSelectedTripId(trip.id)} className={`cursor-pointer transition ${selectedTripId === trip.id ? "bg-blue-500/10" : "hover:bg-slate-800/50"}`}>
                  <td className="whitespace-nowrap px-4 py-3 text-white">{formatTripDate(trip.startedAt)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatTripDate(trip.endedAt)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatDuration(trip.durationSeconds)}</td><td className="whitespace-nowrap px-4 py-3 font-medium text-cyan-300">{trip.distanceKm.toFixed(1)} km</td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{formatCoordinates(trip.start.lat, trip.start.lng)}</td><td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{formatCoordinates(trip.end.lat, trip.end.lng)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-300">{trip.avgSpeed.toFixed(1)} km/h</td><td className="whitespace-nowrap px-4 py-3 text-slate-300">{trip.maxSpeed.toFixed(1)} km/h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
          <p className="text-xs text-slate-500">Page {tripsTotalPages === 0 ? 0 : tripsPage} sur {tripsTotalPages}</p>
          <div className="flex gap-2"><button type="button" disabled={tripsPage <= 1 || tripsLoading} onClick={() => { setSelectedTripId(null); setTripsPage((page) => Math.max(1, page - 1)); }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Précédent</button><button type="button" disabled={tripsPage >= tripsTotalPages || tripsTotalPages === 0 || tripsLoading} onClick={() => { setSelectedTripId(null); setTripsPage((page) => page + 1); }} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Suivant</button></div>
        </div>
      </section>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex gap-3"><Wifi className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" /><div><p className="text-sm font-medium text-white">Historique organisé par trajets réels</p><p className="mt-1 text-xs leading-5 text-slate-400">La période choisie, prédéfinie ou personnalisée dans les 12 derniers mois, sert à lister les trajets du véhicule. La carte ne charge ensuite que le trajet sélectionné. Les longs trajets sont échantillonnés sur toute leur durée afin d&apos;éviter de charger des milliers de points GPS en même temps.</p></div></div>
      </div>
    </div>
  );
}
