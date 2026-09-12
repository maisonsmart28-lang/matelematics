"use client";

import Link from "next/link";
import {
  Activity,
  BatteryCharging,
  Clock,
  Fuel,
  Gauge,
  MapPin,
  Power,
  RefreshCw,
  Route,
  Satellite,
  Truck,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { supabase } from "../../../components/supabase";
import VehicleAlertSettingsPanel from "./VehicleAlertSettingsPanel";

type JsonMap = Record<string, unknown>;

type HardwareCapability =
  | "gps_position"
  | "gps_speed"
  | "gps_heading"
  | "gps_satellites"
  | "ignition"
  | "movement"
  | "external_voltage"
  | "internal_battery"
  | "gsm_signal"
  | "io"
  | "can_rpm"
  | "can_speed"
  | "can_coolant"
  | "can_throttle"
  | "can_odometer"
  | "fuel_level"
  | "fuel_used"
  | "adblue"
  | "j1939_fms"
  | "dtc"
  | "camera"
  | "video";

type VehicleLive = {
  vehicle: {
    id: string;
    company_id: string;
    company_name: string | null;
    name: string;
    registration: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    device_id: string | null;
    status: string;
  };
  device: {
    id: string;
    imei: string;
    manufacturer: string | null;
    model: string | null;
    status: string;
    last_seen_at: string | null;
  } | null;
  hardware: {
    family: string;
    source_profile: string | null;
    camera_configured: boolean;
    capabilities: HardwareCapability[];
  };
  position: {
    latitude: number | null;
    longitude: number | null;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    recorded_at: string;
  } | null;
  telemetry: {
    recorded_at: string;
    codec: string | null;
    io_values: JsonMap | null;
    can_payload: JsonMap | null;
    metadata: JsonMap | null;
    signal_strength: number | null;
    battery_voltage: number | null;
    ignition: boolean | null;
  } | null;
  stats: {
    average_speed_24h: number | null;
    max_speed_24h: number | null;
    gps_points_24h: number;
  };
};

function numeric(object: JsonMap | null | undefined, key: string) {
  const value = object?.[key];
  return typeof value === "number" ? value : null;
}

function booleanValue(object: JsonMap | null | undefined, key: string) {
  const value = object?.[key];
  return typeof value === "boolean" ? value : null;
}

function objectValue(object: JsonMap | null | undefined, key: string) {
  const value = object?.[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonMap;
  }
  return null;
}

function formatNumber(value: number | null, decimals = 0) {
  return value === null
    ? "—"
    : value.toLocaleString("fr-FR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    timeZone: "Africa/Casablanca",
  });
}

function freshness(value: string | null | undefined) {
  if (!value) return "Jamais";
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 1000),
  );
  if (seconds < 10) return "À l'instant";
  if (seconds < 60) return `Il y a ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  return `Il y a ${Math.floor(minutes / 60)} h`;
}

export default function VehiclePage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;
  const [data, setData] = useState<VehicleLive | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expirée. Reconnectez-vous.");

        const response = await fetch(
          `/api/vehicles/${encodeURIComponent(vehicleId)}/live`,
          {
            method: "GET",
            cache: "no-store",
            headers: { Authorization: `Bearer ${session.access_token}` },
          },
        );
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Impossible de charger le véhicule.");
        }
        setData(payload as VehicleLive);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vehicleId],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const can = data?.telemetry?.can_payload ?? null;
  const metadata = data?.telemetry?.metadata ?? null;
  const ioNormalized = objectValue(metadata, "io_normalized");

  const rpm = numeric(can, "rpm");
  const canSpeed = numeric(can, "speed_kph");
  const fuelLevel = numeric(can, "fuel_level_percent");
  const fuelUsed = numeric(can, "fuel_used_litres");
  const coolant = numeric(can, "coolant_temperature_c");
  const throttle = numeric(can, "throttle_percent");
  const odometer = numeric(can, "odometer_km");
  const movement = booleanValue(ioNormalized, "movement");
  const internalBattery = numeric(ioNormalized, "internal_battery_voltage");
  const satellites = numeric(metadata, "satellites");
  const simulator = can?.simulator === true;

  const capabilitySet = useMemo(
    () => new Set<HardwareCapability>(data?.hardware?.capabilities ?? []),
    [data?.hardware?.capabilities],
  );
  const has = useCallback(
    (capability: HardwareCapability) => capabilitySet.has(capability),
    [capabilitySet],
  );

  const liveAge = useMemo(
    () =>
      freshness(
        data?.telemetry?.recorded_at ??
          data?.position?.recorded_at ??
          data?.device?.last_seen_at,
      ),
    [data],
  );

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-blue-400" />
          <p className="mt-4 text-sm text-slate-400">
            Chargement des données télématiques...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/vehicles" className="text-sm text-blue-400 hover:text-blue-300">
          ← Retour aux véhicules
        </Link>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { vehicle, device, hardware, position, telemetry, stats } = data;
  const online = device?.status === "online" && telemetry !== null;

  const gpsCards = [
    has("gps_position") && (
      <InfoCard
        key="position"
        icon={<MapPin className="h-5 w-5 text-blue-400" />}
        label="Coordonnées GPS"
        value={
          position?.latitude != null && position?.longitude != null
            ? `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`
            : "—"
        }
      />
    ),
    has("gps_speed") && (
      <InfoCard
        key="gps_speed"
        icon={<Gauge className="h-5 w-5 text-cyan-400" />}
        label="Vitesse GPS"
        value={position?.speed == null ? "—" : `${formatNumber(position.speed)} km/h`}
      />
    ),
    has("gps_heading") && (
      <InfoCard
        key="heading"
        icon={<Route className="h-5 w-5 text-purple-400" />}
        label="Cap"
        value={position?.heading == null ? "—" : `${formatNumber(position.heading)}°`}
      />
    ),
    has("gps_satellites") && (
      <InfoCard
        key="satellites"
        icon={<Satellite className="h-5 w-5 text-emerald-400" />}
        label="Satellites"
        value={satellites === null ? "—" : formatNumber(satellites)}
      />
    ),
  ].filter(Boolean);

  const canCards = [
    has("can_rpm") && (
      <InfoCard
        key="rpm"
        icon={<Activity className="h-5 w-5 text-blue-400" />}
        label="Régime moteur"
        value={rpm === null ? "—" : `${formatNumber(rpm)} tr/min`}
      />
    ),
    has("can_speed") && (
      <InfoCard
        key="can_speed"
        icon={<Gauge className="h-5 w-5 text-cyan-400" />}
        label="Vitesse CAN"
        value={canSpeed === null ? "—" : `${formatNumber(canSpeed)} km/h`}
      />
    ),
    has("can_coolant") && (
      <InfoCard
        key="coolant"
        icon={<Activity className="h-5 w-5 text-orange-400" />}
        label="Température moteur"
        value={coolant === null ? "—" : `${formatNumber(coolant)} °C`}
      />
    ),
    has("can_throttle") && (
      <InfoCard
        key="throttle"
        icon={<Zap className="h-5 w-5 text-yellow-400" />}
        label="Accélérateur"
        value={throttle === null ? "—" : `${formatNumber(throttle)} %`}
      />
    ),
  ].filter(Boolean);

  const trackerCards = [
    has("can_odometer") && (
      <InfoCard
        key="odometer"
        icon={<Route className="h-5 w-5 text-cyan-400" />}
        label="Odomètre CAN"
        value={odometer === null ? "—" : `${formatNumber(odometer, 1)} km`}
      />
    ),
    has("ignition") && (
      <InfoCard
        key="ignition"
        icon={<Power className="h-5 w-5 text-emerald-400" />}
        label="Contact moteur"
        value={telemetry?.ignition == null ? "—" : telemetry.ignition ? "ON" : "OFF"}
      />
    ),
    has("movement") && (
      <InfoCard
        key="movement"
        icon={<Activity className="h-5 w-5 text-purple-400" />}
        label="Mouvement"
        value={movement === null ? "—" : movement ? "Oui" : "Non"}
      />
    ),
    has("external_voltage") && (
      <InfoCard
        key="external_voltage"
        icon={<BatteryCharging className="h-5 w-5 text-blue-400" />}
        label="Alimentation externe"
        value={
          telemetry?.battery_voltage == null
            ? "—"
            : `${formatNumber(telemetry.battery_voltage, 2)} V`
        }
      />
    ),
    has("internal_battery") && (
      <InfoCard
        key="internal_battery"
        icon={<BatteryCharging className="h-5 w-5 text-indigo-400" />}
        label="Batterie tracker"
        value={internalBattery === null ? "—" : `${formatNumber(internalBattery, 2)} V`}
      />
    ),
    has("gsm_signal") && (
      <InfoCard
        key="gsm"
        icon={<Activity className="h-5 w-5 text-green-400" />}
        label="Signal GSM"
        value={telemetry?.signal_strength == null ? "—" : `${telemetry.signal_strength} / 5`}
      />
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard/vehicles" className="text-sm text-slate-400 transition hover:text-white">
              ← Retour à la flotte
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <Truck className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{vehicle.name}</h1>
                <p className="mt-1 text-sm text-slate-400">
                  {vehicle.registration} · {vehicle.brand ?? "Marque —"} {vehicle.model ?? ""}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  online
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {online ? "En ligne" : "Hors ligne"}
              </span>
              {simulator && (
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
                  Simulation CAN
                </span>
              )}
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {vehicle.company_name ?? "Entreprise non renseignée"} · Dernière télémétrie:{" "}
              <span className="text-slate-300">{liveAge}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Matériel: <span className="text-slate-300">{hardware.family}</span>
              {hardware.source_profile ? ` · Profil: ${hardware.source_profile}` : ""}
            </p>
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
      </section>

      {error && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Dernière actualisation impossible : {error}
        </div>
      )}

      {gpsCards.length > 0 && (
        <section>
          <SectionHeader
            title="Position actuelle"
            subtitle="Dernière position reçue du tracker selon ses capacités GPS"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {gpsCards}
            {has("gps_position") && (
              <InfoCard
                icon={<Clock className="h-5 w-5 text-slate-300" />}
                label="Dernière position"
                value={formatDateTime(position?.recorded_at)}
              />
            )}
          </div>
        </section>
      )}

      {canCards.length > 0 && (
        <section>
          <SectionHeader
            title="Moteur / CAN"
            subtitle="Uniquement les données supportées par le matériel et le profil installés"
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{canCards}</div>
        </section>
      )}

      {(has("fuel_level") || has("fuel_used")) && (
        <section>
          <SectionHeader
            title="Carburant"
            subtitle="Fonctions carburant disponibles pour ce véhicule"
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {has("fuel_level") && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Fuel className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Niveau carburant</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {fuelLevel === null ? "—" : `${formatNumber(fuelLevel)} %`}
                    </p>
                  </div>
                </div>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width:
                        fuelLevel === null
                          ? "0%"
                          : `${Math.max(0, Math.min(100, fuelLevel))}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {has("fuel_used") && (
              <InfoCard
                icon={<Fuel className="h-5 w-5 text-yellow-400" />}
                label="Carburant consommé"
                value={fuelUsed === null ? "—" : `${formatNumber(fuelUsed, 2)} L`}
              />
            )}
          </div>
        </section>
      )}

      <section>
        <SectionHeader
          title="Véhicule et tracker"
          subtitle="État opérationnel, alimentation et connectivité réellement supportés"
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trackerCards}
          <InfoCard
            icon={<Zap className="h-5 w-5 text-amber-400" />}
            label="Codec / protocole tracker"
            value={telemetry?.codec ?? "—"}
          />
          <InfoCard
            icon={<Clock className="h-5 w-5 text-slate-300" />}
            label="Dernière télémétrie"
            value={formatDateTime(telemetry?.recorded_at)}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Activité des dernières 24 heures"
          subtitle="Calculée à partir des positions réellement enregistrées"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard
            icon={<Gauge className="h-5 w-5 text-blue-400" />}
            label="Vitesse moyenne"
            value={
              stats.average_speed_24h === null
                ? "—"
                : `${formatNumber(stats.average_speed_24h, 1)} km/h`
            }
          />
          <InfoCard
            icon={<Gauge className="h-5 w-5 text-yellow-400" />}
            label="Vitesse maximale"
            value={
              stats.max_speed_24h === null
                ? "—"
                : `${formatNumber(stats.max_speed_24h)} km/h`
            }
          />
          <InfoCard
            icon={<MapPin className="h-5 w-5 text-cyan-400" />}
            label="Points GPS"
            value={stats.gps_points_24h.toLocaleString("fr-FR")}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="font-semibold text-white">Tracker Teltonika</h2>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="IMEI" value={device?.imei ?? "—"} />
          <Detail label="Fabricant" value={device?.manufacturer ?? "—"} />
          <Detail label="Modèle" value={device?.model ?? "—"} />
          <Detail label="Dernier contact" value={formatDateTime(device?.last_seen_at)} />
        </div>
      </section>

      <VehicleAlertSettingsPanel vehicleId={vehicle.id} />

      <div className="flex justify-end">
        <Link
          href={`/dashboard/vehicle/${vehicle.id}/history`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          <Route className="h-4 w-4" />
          Voir l'historique
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words font-medium text-slate-200">{value}</p>
    </div>
  );
}
