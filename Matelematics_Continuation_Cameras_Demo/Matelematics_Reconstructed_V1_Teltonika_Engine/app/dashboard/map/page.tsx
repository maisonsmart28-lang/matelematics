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

type VehicleStatus = "En mouvement" | "À l'arrêt" | "Hors ligne";

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

type HistoryPoint = {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recordedAt: string;
};

type RoutePoint = {
  lat: number;
  lng: number;
};

type LeafletVehicle = {
  lat: number;
  lng: number;
  status: "online" | "en route" | "offline";
  vehicleId: string;
};

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

function formatLastSeen(value: string | null) {
  if (!value) {
    return "Jamais";
  }

  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Date inconnue";
  }

  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) {
    return `Il y a ${diffSeconds} s`;
  }

  const diffMinutes = Math.round(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Il y a ${diffDays} j`;
}

function StatusBadge({ status }: { status: VehicleStatus }) {
  const styles = {
    "En mouvement":
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "À l'arrêt": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Hors ligne": "bg-slate-800 text-slate-400 border-slate-700",
  };

  const dots = {
    "En mouvement": "bg-emerald-400",
    "À l'arrêt": "bg-amber-400",
    "Hors ligne": "bg-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {status}
    </span>
  );
}

export default function MapPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Session expirée.");
        }

        const response = await fetch("/api/dashboard/fleet", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await response.json()) as {
          vehicles?: FleetVehicle[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger la flotte.");
        }

        if (cancelled) {
          return;
        }

        const nextVehicles = payload.vehicles ?? [];
        setVehicles(nextVehicles);
        setError(null);

        setSelectedVehicleId((current) => {
          if (current && nextVehicles.some((vehicle) => vehicle.id === current)) {
            return current;
          }

          return nextVehicles[0]?.id ?? null;
        });
      } catch (cause) {
        if (cancelled) {
          return;
        }

        console.error("[Dashboard map]", cause);
        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger les positions.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const vehicleId = selectedVehicleId;

    if (!vehicleId) {
      setHistoryPoints([]);
      setHistoryError(null);
      return () => {
        cancelled = true;
      };
    }

    async function loadHistory(currentVehicleId: string) {
      try {
        setHistoryLoading(true);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          throw new Error("Session expirée.");
        }

        const response = await fetch(
          `/api/dashboard/vehicles/${encodeURIComponent(currentVehicleId)}/history`,
          {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          },
        );

        const payload = (await response.json()) as {
          points?: HistoryPoint[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger l'historique GPS.");
        }

        if (cancelled) {
          return;
        }

        setHistoryPoints(payload.points ?? []);
        setHistoryError(null);
      } catch (cause) {
        if (cancelled) {
          return;
        }

        console.error("[Dashboard map history]", cause);
        setHistoryPoints([]);
        setHistoryError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger l'historique GPS.",
        );
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    void loadHistory(vehicleId);
    const timer = window.setInterval(() => void loadHistory(vehicleId), 10000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedVehicleId]);

  const selectedVehicle = useMemo(
    () =>
      vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
      vehicles[0] ??
      null,
    [vehicles, selectedVehicleId],
  );

  const liveVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.motionStatus !== "Hors ligne" &&
          vehicle.position?.lat !== null &&
          vehicle.position?.lat !== undefined &&
          vehicle.position?.lng !== null &&
          vehicle.position?.lng !== undefined,
      ),
    [vehicles],
  );

  const leafletVehicles: LeafletVehicle[] = liveVehicles.map((vehicle) => ({
    lat: vehicle.position!.lat as number,
    lng: vehicle.position!.lng as number,
    vehicleId: vehicle.id,
    status:
      vehicle.motionStatus === "En mouvement"
        ? "en route"
        : vehicle.motionStatus === "À l'arrêt"
          ? "online"
          : "offline",
  }));

  const route: RoutePoint[] = historyPoints.map((point) => ({
    lat: point.lat,
    lng: point.lng,
  }));

  const moving = vehicles.filter(
    (vehicle) => vehicle.motionStatus === "En mouvement",
  ).length;
  const stopped = vehicles.filter(
    (vehicle) => vehicle.motionStatus === "À l'arrêt",
  ).length;
  const offline = vehicles.filter(
    (vehicle) => vehicle.motionStatus === "Hors ligne",
  ).length;

  const selectedIsLive = selectedVehicle?.motionStatus !== "Hors ligne";
  const selectedSpeed = selectedIsLive ? selectedVehicle?.position?.speed : null;
  const selectedHeading = selectedIsLive ? selectedVehicle?.position?.heading : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <MapPin className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">Carte en direct</h1>
            <p className="mt-1 text-sm text-slate-400">
              Flotte visible selon votre périmètre Matelematics.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Véhicules suivis</p>
          <p className="mt-2 text-2xl font-bold text-white">{vehicles.length}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">En mouvement</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{moving}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">À l'arrêt</p>
          <p className="mt-2 text-2xl font-bold text-amber-400">{stopped}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">Hors ligne</p>
          <p className="mt-2 text-2xl font-bold text-slate-300">{offline}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-300">
            Impossible de charger les données de flotte
          </p>
          <p className="mt-1 text-xs text-red-200/70">{error}</p>
        </div>
      )}

      {historyError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm font-medium text-amber-300">
            Historique GPS indisponible
          </p>
          <p className="mt-1 text-xs text-amber-200/70">{historyError}</p>
        </div>
      )}

      <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Véhicules</h2>
              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                {vehicles.length}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              API flotte Matelematics · données réelles
            </div>
          </div>

          <div className="max-h-[590px] overflow-y-auto">
            {loading && (
              <div className="p-5 text-sm text-slate-400">
                Chargement des véhicules...
              </div>
            )}

            {!loading && vehicles.length === 0 && (
              <div className="p-5 text-sm text-slate-400">
                Aucun véhicule accessible dans votre périmètre.
              </div>
            )}

            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setSelectedVehicleId(vehicle.id)}
                className={`w-full border-b border-slate-800 p-4 text-left transition ${
                  selectedVehicle?.id === vehicle.id
                    ? "bg-blue-500/10"
                    : "hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <Truck className="h-4 w-4 text-blue-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {vehicle.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {vehicle.registration}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={vehicle.motionStatus} />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">
                      {formatLastSeen(vehicle.lastSeenAt)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="relative min-h-[600px] bg-slate-950">
          <LeafletMap vehicles={leafletVehicles} route={route} />

          {selectedVehicle && (
            <div className="absolute bottom-5 left-5 right-5 z-[500]">
              <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-semibold text-white">{selectedVehicle.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedVehicle.registration}
                      {selectedVehicle.trackerId
                        ? ` · Tracker ${selectedVehicle.trackerId}`
                        : " · Aucun tracker associé"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <StatusBadge status={selectedVehicle.motionStatus} />

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Gauge className="h-4 w-4 text-blue-400" />
                      {selectedSpeed === null || selectedSpeed === undefined
                        ? "—"
                        : `${selectedSpeed} km/h`}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Navigation className="h-4 w-4 text-blue-400" />
                      {selectedHeading === null || selectedHeading === undefined
                        ? "—"
                        : `${selectedHeading}°`}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      {formatLastSeen(selectedVehicle.lastSeenAt)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Route className="h-4 w-4 text-cyan-400" />
                      {historyLoading
                        ? "Historique..."
                        : `${historyPoints.length} points GPS`}
                    </div>
                  </div>
                </div>

                {selectedVehicle.motionStatus === "Hors ligne" &&
                  selectedVehicle.position && (
                    <p className="mt-3 text-xs text-slate-500">
                      Une dernière position enregistrée existe, mais elle n'est pas affichée
                      comme position en direct tant que le tracker reste hors ligne.
                    </p>
                  )}

                {historyPoints.length > 1 && (
                  <p className="mt-3 text-xs text-cyan-300/80">
                    Le tracé affiché correspond aux derniers points GPS réellement enregistrés
                    pour ce véhicule ; il s'agit d'un historique, pas d'une position live.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex gap-3">
          <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

          <div>
            <p className="text-sm font-medium text-white">
              Carte et historique connectés aux données réelles
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Les positions en direct utilisent l'API flotte Matelematics. Le trajet du véhicule
              sélectionné provient d'une API serveur sécurisée qui vérifie votre périmètre avant
              de lire les derniers points GPS enregistrés. Aucun trajet de démonstration n'est
              utilisé sur cette page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
