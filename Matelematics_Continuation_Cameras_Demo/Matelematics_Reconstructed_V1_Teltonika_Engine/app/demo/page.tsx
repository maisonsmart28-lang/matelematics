"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  Droplets,
  Fuel,
  MapPin,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  Route,
  Server,
  ShieldCheck,
  Truck,
  Users,
  Video,
  Wifi,
  Volume2,
  Gauge,
  Thermometer,
  Zap,
} from "lucide-react";

import CustomMap from "../dashboard/MapComponent";
import VehicleTable from "../dashboard/VehicleTable";
import VehicleStatusChart from "../dashboard/VehicleStatusChart";
import FuelConsumptionChart from "../dashboard/FuelConsumptionChart";
import DriverActivity from "../dashboard/DriverActivity";

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

type CameraType = "front" | "cabin";

export default function DemoDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    online: 128,
    total: 156,
    fuel: 2450,
    alerts: 12,
    distance: 24560,
    drivers: 87,
    trips: 324,
  });

  const [lastSync, setLastSync] = useState(15);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedCamera, setSelectedCamera] =
    useState<CameraType>("front");

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const [cameraTime, setCameraTime] = useState("14:32:18");

  useEffect(() => {
    const timer = setInterval(() => {
      setStats((previous) => ({
        ...previous,
        distance: previous.distance + 6,
        fuel: previous.fuel + 2,
      }));

      setLastSync(0);
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncTimer = setInterval(() => {
      setLastSync((previous) => Math.min(previous + 1, 59));
    }, 1000);

    return () => clearInterval(syncTimer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCameraTime((previous) => {
        const parts = previous.split(":").map(Number);

        let hours = parts[0];
        let minutes = parts[1];
        let seconds = parts[2] + 1;

        if (seconds >= 60) {
          seconds = 0;
          minutes++;
        }

        if (minutes >= 60) {
          minutes = 0;
          hours++;
        }

        if (hours >= 24) {
          hours = 0;
        }

        return [hours, minutes, seconds]
          .map((value) => value.toString().padStart(2, "0"))
          .join(":");
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const refreshDashboard = () => {
    setIsRefreshing(true);
    setLastSync(0);

    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
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
    <div className="min-h-screen space-y-6 bg-slate-950 px-4 pb-10 pt-6 text-white sm:px-6 lg:px-8">

      {/* ========================================================= */}
      {/* BANDEAU DEMONSTRATION                                     */}
      {/* ========================================================= */}

      <div className="flex flex-col gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>

          <div>
            <p className="text-sm font-semibold text-cyan-300">
              Mode démonstration
            </p>

            <p className="text-xs text-slate-400">
              Données fictives utilisées pour présenter la plateforme.
            </p>
          </div>

        </div>

        <Link
          href="/"
          className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          Retour au site
        </Link>

      </div>

      {/* ========================================================= */}
      {/* HEADER                                                     */}
      {/* ========================================================= */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />

              <span className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                Centre de contrôle — Démonstration
              </span>

            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Bonjour 👋
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Découvrez un aperçu de l'intelligence de gestion de flotte Matelematics.
            </p>

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

                <p className="text-xs text-zinc-500">
                  Dernière actualisation
                </p>

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

                <p className="text-xs text-zinc-500">
                  Plateforme
                </p>

                <p className="text-sm font-semibold text-emerald-400">
                  Opérationnelle
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
      {/* CARTE + ACTIVITE                                           */}
      {/* ========================================================= */}

      <section className="grid gap-6 xl:grid-cols-3">

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
                  Visualisation de la flotte
                </p>

              </div>

            </div>

            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {stats.online} en ligne
              </div>

              <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs font-medium text-cyan-400">
                Démonstration
              </span>

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

                <h2 className="font-semibold text-white">
                  Activité en temps réel
                </h2>

                <p className="text-xs text-zinc-500">
                  Exemple d'activité
                </p>

              </div>

            </div>

            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live démo
            </span>

          </div>

          <DriverActivity />

        </div>

      </section>

      {/* ========================================================= */}
      {/* CAMERAS INTELLIGENTES — DEMONSTRATION                     */}
      {/* ========================================================= */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <Camera className="h-5 w-5 text-red-400" />
            </div>

            <div>

              <div className="flex items-center gap-2">

                <h2 className="font-semibold text-white">
                  Caméra embarquée
                </h2>

                <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                  Live
                </span>

              </div>

              <p className="text-xs text-zinc-500">
                Surveillance vidéo intelligente du véhicule
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => setSelectedCamera("front")}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                selectedCamera === "front"
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              Caméra avant
            </button>

            <button
              type="button"
              onClick={() => setSelectedCamera("cabin")}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                selectedCamera === "cabin"
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              }`}
            >
              Habitacle
            </button>

          </div>

        </div>

        <div className="grid gap-0 xl:grid-cols-3">

          {/* VIDEO */}

          <div className="relative min-h-[360px] overflow-hidden bg-black xl:col-span-2">

            {/* Simulation visuelle du flux caméra */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />

            {/* Route simulée */}

            <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-slate-950 via-slate-800/80 to-transparent" />

            <div className="absolute bottom-[15%] left-1/2 h-1 w-40 -translate-x-1/2 rotate-[-2deg] bg-white/30 blur-[1px]" />

            <div className="absolute bottom-[23%] left-[15%] h-24 w-20 rounded-t-3xl bg-slate-700/80" />

            <div className="absolute bottom-[20%] right-[12%] h-32 w-28 rounded-t-3xl bg-slate-700/60" />

            {/* Overlay caméra */}

            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 backdrop-blur">

              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

              <span className="text-xs font-semibold text-white">
                REC
              </span>

              <span className="text-xs text-zinc-300">
                {cameraTime}
              </span>

            </div>

            <div className="absolute right-5 top-5 rounded-lg bg-black/60 px-3 py-2 backdrop-blur">

              <p className="text-xs font-medium text-white">
                {selectedCamera === "front"
                  ? "CAMÉRA AVANT"
                  : "CAMÉRA HABITACLE"}
              </p>

            </div>

            <div className="absolute bottom-5 left-5 right-5">

              <div className="mb-3 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-zinc-300 backdrop-blur">
                    1080p
                  </span>

                  <span className="rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 backdrop-blur">
                    Connectée
                  </span>

                </div>

                <span className="text-xs text-zinc-300">
                  Caméra de démonstration
                </span>

              </div>

              <div className="rounded-xl border border-white/10 bg-black/70 p-3 backdrop-blur">

                <div className="flex items-center gap-3">

                  <button
                    type="button"
                    onClick={() => setIsPlaying((value) => !value)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
                    aria-label={isPlaying ? "Pause" : "Lecture"}
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>

                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">

                    <div
                      className={`h-full rounded-full bg-cyan-400 ${
                        isPlaying ? "animate-pulse" : ""
                      }`}
                      style={{ width: "64%" }}
                    />

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsMuted(
                        (value) => !value
                      )
                    }
                    className="text-zinc-400 transition hover:text-white"
                    aria-label={
                      isMuted
                        ? "Activer le volume"
                        : "Couper le volume"
                    }
                    title={
                      isMuted
                        ? "Volume coupe"
                        : "Volume actif"
                    }
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        document.fullscreenElement
                      ) {
                        await document.exitFullscreen();
                      } else {
                        await document.documentElement.requestFullscreen();
                      }
                    }}
                    className="text-zinc-400 transition hover:text-white"
                    aria-label="Plein ecran"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>

                </div>

              </div>

            </div>

          </div>

          {/* INFORMATIONS */}

          <div className="border-t border-zinc-800 p-5 xl:border-l xl:border-t-0">

            <div className="mb-5">

              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Véhicule surveillé
              </p>

              <div className="mt-2 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                  <Truck className="h-5 w-5 text-cyan-400" />
                </div>

                <div>

                  <p className="font-semibold text-white">
                    Renault Express
                  </p>

                  <p className="text-xs text-zinc-500">
                    Casablanca • DEMO-001
                  </p>

                </div>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">

                <div className="flex items-center gap-2 text-zinc-500">

                  <Gauge className="h-4 w-4" />

                  <span className="text-[11px]">
                    Vitesse
                  </span>

                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  72
                  <span className="ml-1 text-xs font-normal text-zinc-500">
                    km/h
                  </span>
                </p>

              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">

                <div className="flex items-center gap-2 text-zinc-500">

                  <Fuel className="h-4 w-4" />

                  <span className="text-[11px]">
                    Carburant
                  </span>

                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  64
                  <span className="ml-1 text-xs font-normal text-zinc-500">
                    %
                  </span>
                </p>

              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">

                <div className="flex items-center gap-2 text-zinc-500">

                  <Thermometer className="h-4 w-4" />

                  <span className="text-[11px]">
                    Moteur
                  </span>

                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  87
                  <span className="ml-1 text-xs font-normal text-zinc-500">
                    °C
                  </span>
                </p>

              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">

                <div className="flex items-center gap-2 text-zinc-500">

                  <Zap className="h-4 w-4" />

                  <span className="text-[11px]">
                    Batterie
                  </span>

                </div>

                <p className="mt-2 text-xl font-bold text-white">
                  13,9
                  <span className="ml-1 text-xs font-normal text-zinc-500">
                    V
                  </span>
                </p>

              </div>

            </div>

            <div className="mt-5 border-t border-zinc-800 pt-5">

              <div className="mb-3 flex items-center justify-between">

                <div>

                  <p className="text-sm font-semibold text-white">
                    Événements vidéo
                  </p>

                  <p className="text-xs text-zinc-500">
                    Activité récente de la caméra
                  </p>

                </div>

                <Video className="h-4 w-4 text-zinc-600" />

              </div>

              <div className="space-y-2">

                <button
                  type="button"
                  onClick={() =>
                    window.alert(
                      "Freinage brusque\n78 km/h\nEvenement video de demonstration."
                    )
                  }
                  className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left transition hover:bg-red-500/10"
                >

                  <div className="flex items-start gap-3">

                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />

                    <div className="min-w-0">

                      <p className="text-xs font-semibold text-red-300">
                        Freinage brusque
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        Il y a 2 min • 78 km/h
                      </p>

                    </div>

                  </div>

                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.alert(
                      "Exces de vitesse\n96 km/h\nEvenement video de demonstration."
                    )
                  }
                  className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left transition hover:bg-amber-500/10"
                >

                  <div className="flex items-start gap-3">

                    <Gauge className="mt-0.5 h-4 w-4 text-amber-400" />

                    <div className="min-w-0">

                      <p className="text-xs font-semibold text-amber-300">
                        Excès de vitesse
                      </p>

                      <p className="mt-1 text-[11px] text-zinc-500">
                        Il y a 16 min • 96 km/h
                      </p>

                    </div>

                  </div>

                </button>

              </div>

            </div>

            <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">

              <CheckCircle2 className="h-4 w-4 text-emerald-400" />

              <div>

                <p className="text-xs font-medium text-emerald-300">
                  Caméra opérationnelle
                </p>

                <p className="text-[11px] text-zinc-500">
                  Flux vidéo disponible
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>

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
      {/* VEHICULES                                                   */}
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
                Vue rapide de la flotte de démonstration
              </p>

            </div>

          </div>

          <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm font-medium text-cyan-400">
            Données de démonstration
          </span>

        </div>

        <div className="p-4">
          <VehicleTable />
        </div>

      </section>

      {/* ========================================================= */}
      {/* ALERTES + ACTIVITE + SYSTEME                              */}
      {/* ========================================================= */}

      <section className="grid gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <Bell className="h-5 w-5 text-red-400" />
            </div>

            <div>

              <h3 className="font-semibold text-white">
                Alertes prioritaires
              </h3>

              <p className="text-xs text-zinc-500">
                {stats.alerts} alertes de démonstration
              </p>

            </div>

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
                Exemples d'opérations
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

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="mb-5 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Server className="h-5 w-5 text-emerald-400" />
            </div>

            <div>

              <h3 className="font-semibold text-white">
                État de la plateforme
              </h3>

              <p className="text-xs text-zinc-500">
                Environnement de démonstration
              </p>

            </div>

          </div>

          <div className="space-y-4">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <Wifi className="h-4 w-4 text-zinc-500" />

                <span className="text-sm text-zinc-400">
                  Connectivité
                </span>

              </div>

              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Opérationnelle
              </span>

            </div>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <Activity className="h-4 w-4 text-zinc-500" />

                <span className="text-sm text-zinc-400">
                  Services Matelematics
                </span>

              </div>

              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                Actifs
              </span>

            </div>

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <Server className="h-4 w-4 text-zinc-500" />

                <span className="text-sm text-zinc-400">
                  Données démo
                </span>

              </div>

              <span className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400">
                Chargées
              </span>

            </div>

            <div className="border-t border-zinc-800 pt-4">

              <div className="flex items-center justify-between">

                <span className="text-xs text-zinc-500">
                  Actualisation
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
      {/* FOOTER                                                     */}
      {/* ========================================================= */}

      <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-800 pt-6 text-xs text-zinc-600 sm:flex-row">

        <p>
          Matelematics Fleet Intelligence — Démonstration
        </p>

        <div className="flex items-center gap-4">

          <Link
            href="/"
            className="transition hover:text-zinc-400"
          >
            Site principal
          </Link>

          <Link
            href="/login"
            className="transition hover:text-zinc-400"
          >
            Connexion client
          </Link>

        </div>

      </div>

    </div>
  );
}