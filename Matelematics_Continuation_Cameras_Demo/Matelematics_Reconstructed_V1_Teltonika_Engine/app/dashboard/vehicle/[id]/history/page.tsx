"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Gauge,
  MapPin,
  Navigation,
  Route,
} from "lucide-react";

import { supabase } from "../../../components/supabase";

type HistoryWindowHours = 1 | 6 | 24 | 168 | 720 | 2160 | 4320 | 8760;

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

type VehicleInfo = {
  id: string;
  name: string;
  registration: string;
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

const LeafletMap = dynamic(() => import("../../../LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-950">
      <p className="text-sm text-slate-400">Chargement de la carte...</p>
    </div>
  ),
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

export default function VehicleHistoryPage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;

  const [period, setPeriod] = useState<HistoryWindowHours>(24);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripPoints, setTripPoints] = useState<TripPoint[]>([]);
  const [sampling, setSampling] = useState<TripSampling | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripLoading, setTripLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tripError, setTripError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
    setSelectedTripId(null);
    setTripPoints([]);
    setSampling(null);
    setTripError(null);
  }, [period, vehicleId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTrips() {
      try {
        setLoading(true);
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) throw new Error("Session expirée.");

        const response = await fetch(
          `/api/dashboard/vehicles/${encodeURIComponent(vehicleId)}/trips?hours=${period}&page=${page}&pageSize=${PAGE_SIZE}`,
          {
            cache: "no-store",
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );

        const payload = (await response.json()) as {
          vehicle?: VehicleInfo;
          trips?: TripSummary[];
          pagination?: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
          };
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger l'historique.");
        }

        if (cancelled) return;
        setVehicle(payload.vehicle ?? null);
        setTrips(payload.trips ?? []);
        setTotal(payload.pagination?.total ?? 0);
        setTotalPages(payload.pagination?.totalPages ?? 0);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setTrips([]);
        setTotal(0);
        setTotalPages(0);
        setError(
          cause instanceof Error ? cause.message : "Impossible de charger l'historique.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTrips();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, period, page]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  useEffect(() => {
    let cancelled = false;

    if (!selectedTrip) {
      setTripPoints([]);
      setSampling(null);
      setTripError(null);
      return () => {
        cancelled = true;
      };
    }

    async function loadTrip() {
      try {
        setTripLoading(true);
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) throw new Error("Session expirée.");

        const query = new URLSearchParams({
          from: selectedTrip.startedAt,
          to: selectedTrip.endedAt,
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
        setTripError(
          cause instanceof Error ? cause.message : "Impossible de charger le trajet.",
        );
      } finally {
        if (!cancelled) setTripLoading(false);
      }
    }

    void loadTrip();
    return () => {
      cancelled = true;
    };
  }, [vehicleId, selectedTrip]);

  const route = tripPoints.map((point) => ({ lat: point.lat, lng: point.lng }));
  const periodLabel = PERIODS.find((item) => item.value === period)?.label ?? `${period} h`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/vehicle/${vehicleId}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            title="Retour au véhicule"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-white">Historique du véhicule</h1>
            <p className="mt-1 text-sm text-slate-400">
              {vehicle
                ? `${vehicle.name} · ${vehicle.registration}`
                : "Trajets enregistrés et détail cartographique."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <CalendarDays className="h-5 w-5 text-blue-400" />
          <div>
            <p className="text-xs text-slate-500">Période sélectionnée</p>
            <p className="text-sm font-medium text-white">{periodLabel}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Choisir une période</h2>
            <p className="mt-1 text-sm text-slate-400">
              La période filtre la liste. La carte reste vide tant qu'un trajet n'est pas choisi.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPeriod(item.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  period === item.value
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Trajets trouvés"
          value={loading ? "…" : String(total)}
          icon={<Navigation className="h-5 w-5 text-blue-400" />}
        />
        <SummaryCard
          label="Distance du trajet sélectionné"
          value={selectedTrip ? `${selectedTrip.distanceKm.toFixed(1)} km` : "—"}
          icon={<Route className="h-5 w-5 text-emerald-400" />}
        />
        <SummaryCard
          label="Durée du trajet sélectionné"
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

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(520px,0.85fr)]">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Trajets</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Sélectionnez une ligne pour afficher uniquement ce trajet sur la carte.
                </p>
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
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Chargement des trajets...
                    </td>
                  </tr>
                ) : trips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Aucun trajet enregistré sur cette période.
                    </td>
                  </tr>
                ) : (
                  trips.map((trip) => {
                    const active = trip.id === selectedTripId;
                    return (
                      <tr
                        key={trip.id}
                        onClick={() => setSelectedTripId(trip.id)}
                        className={`cursor-pointer transition ${
                          active ? "bg-blue-500/10" : "hover:bg-slate-800/60"
                        }`}
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
            <p className="text-xs text-slate-500">
              Page {totalPages === 0 ? 0 : page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
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
                disabled={page >= totalPages || totalPages === 0 || loading}
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
                  {selectedTrip
                    ? `${formatDate(selectedTrip.startedAt)} → ${formatDate(selectedTrip.endedAt)}`
                    : "Choisissez un trajet dans le tableau."}
                </p>
              </div>
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>
          </div>

          <div className="h-[460px] bg-slate-950">
            {selectedTrip ? (
              tripLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Chargement du tracé...
                </div>
              ) : tripError ? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-red-400">
                  {tripError}
                </div>
              ) : route.length > 1 ? (
                <LeafletMap vehicles={[]} route={route} />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
                  Aucun tracé GPS exploitable pour ce trajet.
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-500">
                La carte n'affiche aucun historique tant qu'un trajet n'est pas sélectionné.
              </div>
            )}
          </div>

          {selectedTrip && (
            <div className="space-y-3 border-t border-slate-800 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Départ GPS" value={formatCoordinates(selectedTrip.start.lat, selectedTrip.start.lng)} />
                <Info label="Arrivée GPS" value={formatCoordinates(selectedTrip.end.lat, selectedTrip.end.lng)} />
              </div>
              {sampling?.sampled && (
                <p className="text-xs leading-5 text-amber-300">
                  Tracé optimisé : {sampling.returnedPointCount} points affichés sur {sampling.rawPointCount} points GPS, répartis sur l'ensemble du trajet.
                </p>
              )}
              {!sampling?.sampled && sampling && (
                <p className="text-xs text-slate-500">
                  {sampling.returnedPointCount} points GPS affichés.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
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
