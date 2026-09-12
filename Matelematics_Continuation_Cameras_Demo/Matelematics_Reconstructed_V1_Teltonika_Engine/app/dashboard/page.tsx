"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Bell,
  Clock,
  Droplets,
  Fuel,
  MapPin,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  Truck,
  Users,
  Wifi,
} from "lucide-react";

import { supabase } from "../components/supabase";
import CustomMap from "./MapComponent";
import VehicleTable from "./VehicleTable";
import VehicleStatusChart from "./VehicleStatusChart";
import FuelConsumptionChart from "./FuelConsumptionChart";
import DriverActivity from "./DriverActivity";
import CameraOverview from "./CameraOverview";

interface Stats {
  online: number;
  total: number;
  alerts: number;
}

interface VehicleSummary {
  id: string;
  status: string;
}

interface AlertSummary {
  id: string;
  vehicleName: string;
  registration: string;
  label: string;
  message: string | null;
  severity: string;
  lifecycle: string;
  triggeredAt: string;
}

interface AlertsPayload {
  alerts?: AlertSummary[];
  metrics?: {
    active?: number;
  };
}

interface KPI {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconClass: string;
}

function alertClasses(severity: string) {
  if (severity === "critical") {
    return {
      card: "border-red-500/20 bg-red-500/5",
      icon: "text-red-400",
      title: "text-red-300",
    };
  }

  if (severity === "warning" || severity === "high") {
    return {
      card: "border-amber-500/20 bg-amber-500/5",
      icon: "text-amber-400",
      title: "text-amber-300",
    };
  }

  return {
    card: "border-cyan-500/20 bg-cyan-500/5",
    icon: "text-cyan-400",
    title: "text-cyan-300",
  };
}

function formatAlertTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Date inconnue";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));

  if (diffMinutes < 1) {
    return "À l'instant";
  }

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);

  if (hours < 24) {
    return `Il y a ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    online: 0,
    total: 0,
    alerts: 0,
  });
  const [priorityAlerts, setPriorityAlerts] = useState<AlertSummary[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardStats = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Session expirée.");
    }

    const headers = {
      Authorization: `Bearer ${session.access_token}`,
    };

    const [vehiclesResponse, alertsResponse] = await Promise.all([
      fetch("/api/vehicles", {
        cache: "no-store",
        headers,
      }),
      fetch("/api/alerts", {
        cache: "no-store",
        headers,
      }),
    ]);

    const vehiclesPayload = (await vehiclesResponse.json()) as {
      vehicles?: VehicleSummary[];
      error?: string;
    };
    const alertsPayload = (await alertsResponse.json()) as AlertsPayload & {
      error?: string;
    };

    if (!vehiclesResponse.ok) {
      throw new Error(
        vehiclesPayload.error ?? "Impossible de charger la flotte.",
      );
    }

    if (!alertsResponse.ok) {
      throw new Error(
        alertsPayload.error ?? "Impossible de charger les alertes.",
      );
    }

    const vehicles = vehiclesPayload.vehicles ?? [];
    const activeAlerts = (alertsPayload.alerts ?? []).filter(
      (alert) => alert.lifecycle === "active",
    );

    setStats({
      total: vehicles.length,
      online: vehicles.filter((vehicle) => vehicle.status === "En ligne").length,
      alerts: alertsPayload.metrics?.active ?? 0,
    });
    setPriorityAlerts(activeAlerts.slice(0, 3));
    setStatsError(null);
    setLastSync(0);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        await loadDashboardStats();
      } catch (error) {
        if (!cancelled) {
          setStatsError(
            error instanceof Error ? error.message : "Données indisponibles.",
          );
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      setLastSync((prev) => Math.min(prev + 1, 59));
    }, 1000);

    return () => window.clearInterval(syncTimer);
  }, []);

  const refreshDashboard = async () => {
    setIsRefreshing(true);

    try {
      await loadDashboardStats();
      setStatsLoading(false);
    } catch (error) {
      setStatsError(
        error instanceof Error ? error.message : "Données indisponibles.",
      );
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const onlinePercentage = useMemo(() => {
    if (stats.total === 0) {
      return 0;
    }

    return Math.round((stats.online / stats.total) * 100);
  }, [stats.online, stats.total]);

  const cards: KPI[] = [
    {
      title: "Véhicules en ligne",
      value: statsLoading ? "—" : `${stats.online}/${stats.total}`,
      subtitle: statsLoading
        ? "Chargement de la flotte..."
        : `${onlinePercentage}% de la flotte connectée`,
      icon: Truck,
      iconClass: "text-emerald-400 bg-emerald-500/10",
    },
    {
      title: "Distance parcourue",
      value: "—",
      subtitle: "Source réelle à connecter",
      icon: Route,
      iconClass: "text-cyan-400 bg-cyan-500/10",
    },
    {
      title: "Consommation",
      value: "—",
      subtitle: "Source réelle à connecter",
      icon: Fuel,
      iconClass: "text-amber-400 bg-amber-500/10",
    },
    {
      title: "Alertes actives",
      value: statsLoading ? "—" : stats.alerts.toString(),
      subtitle: statsLoading
        ? "Chargement des alertes..."
        : "Alertes réellement actives",
      icon: AlertTriangle,
      iconClass: "text-red-400 bg-red-500/10",
    },
    {
      title: "Conducteurs actifs",
      value: "—",
      subtitle: "Source réelle à connecter",
      icon: Users,
      iconClass: "text-blue-400 bg-blue-500/10",
    },
    {
      title: "Trajets aujourd'hui",
      value: "—",
      subtitle: "Source réelle à connecter",
      icon: Clock,
      iconClass: "text-purple-400 bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                Centre de contrôle · Transition données réelles
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Bonjour Ali 👋
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Voici l&apos;état actuel de votre flotte et de vos opérations.
            </p>
            {statsError && (
              <p className="mt-2 text-xs text-red-400">
                KPI temps réel indisponibles : {statsError}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={refreshDashboard}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 transition hover:border-zinc-700 hover:bg-zinc-800"
            >
              <RefreshCw
                className={`h-4 w-4 text-zinc-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <div className="text-left">
                <p className="text-xs text-zinc-500">Dernière synchronisation</p>
                <p className="text-sm font-medium text-zinc-200">
                  Il y a {lastSync} sec
                </p>
              </div>
            </button>

            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">État du système</p>
                <p className="text-sm font-semibold text-emerald-400">
                  Opérationnel
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                    {card.value}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">{card.subtitle}</p>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 xl:col-span-2">
          <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <MapPin className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Carte en direct</h2>
                <p className="text-xs text-zinc-500">
                  Position des véhicules en temps réel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {statsLoading ? "—" : stats.online} en ligne
              </div>
              <Link
                href="/dashboard/map"
                className="rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
              >
                Ouvrir la carte
              </Link>
            </div>
          </div>
          <div className="p-4">
            <CustomMap />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">Activité de la flotte</h2>
                <p className="text-xs text-zinc-500">
                  Dernier état connu des véhicules connectés
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Données réelles
            </span>
          </div>
          <DriverActivity />
        </div>
      </section>

      <CameraOverview />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">État de la flotte</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Répartition actuelle des véhicules
              </p>
            </div>
            <Truck className="h-5 w-5 text-zinc-600" />
          </div>
          <VehicleStatusChart />
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Consommation de carburant
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Évolution de la consommation
              </p>
            </div>
            <Droplets className="h-5 w-5 text-zinc-600" />
          </div>
          <FuelConsumptionChart />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <Truck className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Véhicules</h2>
              <p className="mt-1 text-xs text-zinc-500">Vue rapide de votre flotte</p>
            </div>
          </div>
          <Link
            href="/dashboard/vehicles"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400"
          >
            Voir tous les véhicules
          </Link>
        </div>
        <div className="p-4">
          <VehicleTable />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <Bell className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Alertes prioritaires</h3>
                <p className="text-xs text-zinc-500">
                  {statsLoading ? "—" : stats.alerts} alertes actives
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/alerts"
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              Tout voir
            </Link>
          </div>

          <div className="space-y-3">
            {statsLoading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
                Chargement des alertes réelles...
              </div>
            ) : priorityAlerts.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
                Aucune alerte active.
              </div>
            ) : (
              priorityAlerts.map((alert) => {
                const classes = alertClasses(alert.severity);

                return (
                  <Link
                    key={alert.id}
                    href="/dashboard/alerts"
                    className={`block rounded-xl border p-3 transition hover:border-zinc-600 ${classes.card}`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${classes.icon}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${classes.title}`}>
                          {alert.label}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {alert.vehicleName} • {alert.registration}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-600">
                          {formatAlertTime(alert.triggeredAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Activité récente</h3>
              <p className="text-xs text-zinc-500">Dernières opérations</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">Ahmed Benali</p>
                <p className="text-xs text-zinc-500">Départ de Casablanca</p>
                <p className="mt-1 text-[11px] text-zinc-600">Il y a 4 min</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
              <div>
                <p className="text-sm font-medium text-white">Youssef Karim</p>
                <p className="text-xs text-zinc-500">Arrivée à Rabat</p>
                <p className="mt-1 text-[11px] text-zinc-600">Il y a 9 min</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">Samir El Idrissi</p>
                <p className="text-xs text-zinc-500">Véhicule arrêté</p>
                <p className="mt-1 text-[11px] text-zinc-600">Il y a 13 min</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Server className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">État du système</h3>
              <p className="text-xs text-zinc-500">Services Matelematics</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Serveur Traccar</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                En ligne
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">API Matelematics</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Base de données</span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Connectée
              </span>
            </div>
            <div className="border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Synchronisation</span>
                <span className="text-xs font-medium text-zinc-300">
                  Il y a {lastSync} sec
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-800 pt-6 text-xs text-zinc-600 sm:flex-row">
        <p>Matelematics Fleet Intelligence</p>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/rapports" className="transition hover:text-zinc-400">
            Rapports
          </Link>
          <Link href="/dashboard/alerts" className="transition hover:text-zinc-400">
            Alertes
          </Link>
          <Link href="/dashboard/Support" className="transition hover:text-zinc-400">
            Support
          </Link>
        </div>
      </div>
    </div>
  );
}
