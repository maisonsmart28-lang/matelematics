"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
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

import CustomMap from "./MapComponent";
import VehicleTable from "./VehicleTable";
import VehicleStatusChart from "./VehicleStatusChart";
import FuelConsumptionChart from "./FuelConsumptionChart";
import DriverActivity from "./DriverActivity";
import CameraOverview from "./CameraOverview";

interface Stats {
  online: number;
  total: number;
  fuel: number;
  alerts: number;
  distance: number;
  drivers: number;
  trips: number;
}

interface KPI {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconClass: string;
  trend?: string;
  trendPositive?: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    online: 7,
    total: 8,
    fuel: 386,
    alerts: 4,
    distance: 1240,
    drivers: 4,
    trips: 18,
  });

  const [lastSync, setLastSync] = useState(15);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDemoStats = async () => {
      try {
        const response = await fetch("/api/demo/fleet", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { stats: Stats };
        if (!cancelled) {
          setStats(payload.stats);
          setLastSync(0);
        }
      } catch {
        // Le dashboard conserve ses valeurs de démonstration si l'API locale est indisponible.
      }
    };

    void loadDemoStats();
    const timer = window.setInterval(() => void loadDemoStats(), 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const syncTimer = setInterval(() => {
      setLastSync((prev) => Math.min(prev + 1, 59));
    }, 1000);

    return () => clearInterval(syncTimer);
  }, []);

  const refreshDashboard = async () => {
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/demo/fleet", { cache: "no-store" });
      if (response.ok) {
        const payload = (await response.json()) as { stats: Stats };
        setStats(payload.stats);
        setLastSync(0);
      }
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  const onlinePercentage = useMemo(() => {
    return Math.round((stats.online / stats.total) * 100);
  }, [stats.online, stats.total]);

  const cards: KPI[] = [
    {
      title: "Véhicules en ligne",
      value: `${stats.online}/${stats.total}`,
      subtitle: `${onlinePercentage}% de la flotte connectée`,
      icon: Truck,
      iconClass: "text-emerald-400 bg-emerald-500/10",
      trend: "+4,2%",
      trendPositive: true,
    },
    {
      title: "Distance parcourue",
      value: `${stats.distance.toLocaleString("fr-FR")} km`,
      subtitle: "Aujourd'hui",
      icon: Route,
      iconClass: "text-cyan-400 bg-cyan-500/10",
      trend: "+8,6%",
      trendPositive: true,
    },
    {
      title: "Consommation",
      value: `${stats.fuel.toLocaleString("fr-FR")} L`,
      subtitle: "Carburant consommé",
      icon: Fuel,
      iconClass: "text-amber-400 bg-amber-500/10",
      trend: "-3,1%",
      trendPositive: true,
    },
    {
      title: "Alertes actives",
      value: stats.alerts.toString(),
      subtitle: "Nécessitent votre attention",
      icon: AlertTriangle,
      iconClass: "text-red-400 bg-red-500/10",
      trend: "+2",
      trendPositive: false,
    },
    {
      title: "Conducteurs actifs",
      value: stats.drivers.toString(),
      subtitle: "Conducteurs connectés",
      icon: Users,
      iconClass: "text-blue-400 bg-blue-500/10",
      trend: "+5,4%",
      trendPositive: true,
    },
    {
      title: "Trajets aujourd'hui",
      value: stats.trips.toString(),
      subtitle: "Trajets enregistrés",
      icon: Clock,
      iconClass: "text-purple-400 bg-purple-500/10",
      trend: "+12,8%",
      trendPositive: true,
    },
  ];

  return (
    <div className="space-y-6 pb-10">

      {/* ========================================================= */}
      {/* HEADER                                                     */}
      {/* ========================================================= */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                Centre de contrôle · Simulation
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Bonjour Ali 👋
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Voici l&apos;état actuel de votre flotte et de vos opérations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            {/* Synchronisation */}
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
                <p className="text-xs text-zinc-500">
                  Dernière synchronisation
                </p>

                <p className="text-sm font-medium text-zinc-200">
                  Il y a {lastSync} sec
                </p>
              </div>
            </button>

            {/* État système */}
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  État du système
                </p>

                <p className="text-sm font-semibold text-emerald-400">
                  Opérationnel
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* ========================================================= */}
      {/* KPI                                                         */}
      {/* ========================================================= */}

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
                  <p className="text-sm font-medium text-zinc-400">
                    {card.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                    {card.value}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    {card.subtitle}
                  </p>
                </div>

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.iconClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>

              </div>

              {card.trend && (
                <div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-3">

                  {card.trendPositive ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                  )}

                  <span
                    className={`text-xs font-medium ${
                      card.trendPositive
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {card.trend}
                  </span>

                  <span className="text-xs text-zinc-600">
                    vs. période précédente
                  </span>
                </div>
              )}

            </div>
          );
        })}

      </section>


      {/* ========================================================= */}
      {/* CARTE + ACTIVITÉ                                           */}
      {/* ========================================================= */}

      <section className="grid gap-6 xl:grid-cols-3">

        {/* Carte */}
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 xl:col-span-2">

          <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <MapPin className="h-5 w-5 text-cyan-400" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Carte en direct
                </h2>

                <p className="text-xs text-zinc-500">
                  Position des véhicules en temps réel
                </p>
              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {stats.online} en ligne
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


        {/* Activité */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="mb-5 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Activité en temps réel
                </h2>

                <p className="text-xs text-zinc-500">
                  Derniers événements
                </p>
              </div>

            </div>

            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live
            </span>

          </div>

          <DriverActivity />

        </div>

      </section>


      <CameraOverview />

      {/* ========================================================= */}
      {/* GRAPHIQUES                                                 */}
      {/* ========================================================= */}

      <section className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="mb-5 flex items-center justify-between">

            <div>
              <h2 className="font-semibold text-white">
                État de la flotte
              </h2>

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


      {/* ========================================================= */}
      {/* VÉHICULES                                                  */}
      {/* ========================================================= */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <Truck className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Véhicules
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Vue rapide de votre flotte
              </p>
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


      {/* ========================================================= */}
      {/* ALERTES + ACTIVITÉ + SYSTÈME                              */}
      {/* ========================================================= */}

      <section className="grid gap-6 lg:grid-cols-3">

        {/* Alertes */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="mb-5 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <Bell className="h-5 w-5 text-red-400" />
              </div>

              <div>
                <h3 className="font-semibold text-white">
                  Alertes prioritaires
                </h3>

                <p className="text-xs text-zinc-500">
                  {stats.alerts} alertes actives
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

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />

                <div>
                  <p className="text-sm font-medium text-red-300">
                    Excès de vitesse
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Renault Express • Casablanca
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-start gap-3">
                <Fuel className="mt-0.5 h-4 w-4 text-amber-400" />

                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Niveau de carburant faible
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Ford Transit • Rabat
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-cyan-400" />

                <div>
                  <p className="text-sm font-medium text-cyan-300">
                    Entrée en géozone
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    Dacia Dokker • Tanger
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>


        {/* Activité récente */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Activité récente
              </h3>

              <p className="text-xs text-zinc-500">
                Dernières opérations
              </p>
            </div>

          </div>

          <div className="space-y-4">

            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />

              <div>
                <p className="text-sm font-medium text-white">
                  Ahmed Benali
                </p>

                <p className="text-xs text-zinc-500">
                  Départ de Casablanca
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  Il y a 4 min
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-blue-400" />

              <div>
                <p className="text-sm font-medium text-white">
                  Youssef Karim
                </p>

                <p className="text-xs text-zinc-500">
                  Arrivée à Rabat
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  Il y a 9 min
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-amber-400" />

              <div>
                <p className="text-sm font-medium text-white">
                  Samir El Idrissi
                </p>

                <p className="text-xs text-zinc-500">
                  Véhicule arrêté
                </p>

                <p className="mt-1 text-[11px] text-zinc-600">
                  Il y a 13 min
                </p>
              </div>
            </div>

          </div>

        </div>


        {/* Système */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Server className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                État du système
              </h3>

              <p className="text-xs text-zinc-500">
                Services Matelematics
              </p>
            </div>

          </div>

          <div className="space-y-4">

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-zinc-500" />

                <span className="text-sm text-zinc-400">
                  Serveur Traccar
                </span>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                En ligne
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-zinc-500" />

                <span className="text-sm text-zinc-400">
                  API Matelematics
                </span>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Active
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Server className="h-4 w-4 text-zinc-500" />

                <span className="text-sm text-zinc-400">
                  Base de données
                </span>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Connectée
              </span>
            </div>

            <div className="border-t border-zinc-800 pt-4">

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  Synchronisation
                </span>

                <span className="text-xs font-medium text-zinc-300">
                  Il y a {lastSync} sec
                </span>
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ========================================================= */}
      {/* FOOTER DASHBOARD                                           */}
      {/* ========================================================= */}

      <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-800 pt-6 text-xs text-zinc-600 sm:flex-row">

        <p>
          Matelematics Fleet Intelligence
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/rapports"
            className="transition hover:text-zinc-400"
          >
            Rapports
          </Link>

          <Link
            href="/dashboard/alerts"
            className="transition hover:text-zinc-400"
          >
            Alertes
          </Link>

          <Link
            href="/dashboard/Support"
            className="transition hover:text-zinc-400"
          >
            Support
          </Link>
        </div>

      </div>

    </div>
  );
}