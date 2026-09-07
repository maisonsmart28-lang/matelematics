"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Fuel,
  MapPin,
  Search,
  ShieldAlert,
  Truck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";

type AlertLevel = "critical" | "warning" | "info" | "success";

type AlertItem = {
  id: number;
  level: AlertLevel;
  title: string;
  vehicle: string;
  location: string;
  time: string;
  date: string;
  speed: string;
  icon: typeof ShieldAlert;
};

const alerts: AlertItem[] = [
  {
    id: 1,
    level: "critical",
    title: "Excès de vitesse",
    vehicle: "Renault Express",
    location: "Casablanca",
    time: "Il y a 5 min",
    date: "2026-08-26",
    speed: "118 km/h",
    icon: ShieldAlert,
  },
  {
    id: 2,
    level: "warning",
    title: "Niveau de carburant faible",
    vehicle: "Ford Transit",
    location: "Rabat",
    time: "Il y a 12 min",
    date: "2026-08-26",
    speed: "18 % restant",
    icon: Fuel,
  },
  {
    id: 3,
    level: "info",
    title: "Entrée en géozone",
    vehicle: "Dacia Dokker",
    location: "Tanger",
    time: "Il y a 18 min",
    date: "2026-08-26",
    speed: "Zone commerciale",
    icon: MapPin,
  },
  {
    id: 4,
    level: "warning",
    title: "Arrêt prolongé",
    vehicle: "Peugeot Partner",
    location: "Casablanca",
    time: "Il y a 24 min",
    date: "2026-08-26",
    speed: "42 min à l'arrêt",
    icon: Clock,
  },
  {
    id: 5,
    level: "success",
    title: "Trajet terminé",
    vehicle: "Ford Transit",
    location: "Casablanca",
    time: "Il y a 26 min",
    date: "2026-08-26",
    speed: "32,4 km parcourus",
    icon: CheckCircle2,
  },
  {
    id: 6,
    level: "critical",
    title: "Déconnexion GPS",
    vehicle: "Renault Kangoo",
    location: "Marrakech",
    time: "Il y a 31 min",
    date: "2026-08-26",
    speed: "Hors ligne",
    icon: XCircle,
  },
  {
    id: 7,
    level: "warning",
    title: "Entretien nécessaire",
    vehicle: "Citroën Berlingo",
    location: "Fès",
    time: "25 août 2026",
    date: "2026-08-25",
    speed: "Maintenance à prévoir",
    icon: AlertTriangle,
  },
  {
    id: 8,
    level: "critical",
    title: "Excès de vitesse",
    vehicle: "Peugeot Partner",
    location: "Marrakech",
    time: "24 août 2026",
    date: "2026-08-24",
    speed: "121 km/h",
    icon: ShieldAlert,
  },
  {
    id: 9,
    level: "success",
    title: "Alerte résolue",
    vehicle: "Dacia Dokker",
    location: "Tanger",
    time: "22 août 2026",
    date: "2026-08-22",
    speed: "Situation normale",
    icon: CheckCircle2,
  },
  {
    id: 10,
    level: "warning",
    title: "Niveau de carburant faible",
    vehicle: "Renault Kangoo",
    location: "Casablanca",
    time: "18 août 2026",
    date: "2026-08-18",
    speed: "22 % restant",
    icon: Fuel,
  },
  {
    id: 11,
    level: "critical",
    title: "Déconnexion GPS",
    vehicle: "Ford Transit",
    location: "Rabat",
    time: "12 août 2026",
    date: "2026-08-12",
    speed: "Hors ligne",
    icon: XCircle,
  },
  {
    id: 12,
    level: "success",
    title: "Trajet terminé",
    vehicle: "Renault Express",
    location: "Casablanca",
    time: "05 août 2026",
    date: "2026-08-05",
    speed: "47,8 km parcourus",
    icon: CheckCircle2,
  },
  {
    id: 13,
    level: "warning",
    title: "Arrêt prolongé",
    vehicle: "Citroën Berlingo",
    location: "Fès",
    time: "28 juillet 2026",
    date: "2026-07-28",
    speed: "1 h 12 à l'arrêt",
    icon: Clock,
  },
  {
    id: 14,
    level: "critical",
    title: "Excès de vitesse",
    vehicle: "Dacia Dokker",
    location: "Tanger",
    time: "15 juillet 2026",
    date: "2026-07-15",
    speed: "127 km/h",
    icon: ShieldAlert,
  },
  {
    id: 15,
    level: "success",
    title: "Alerte résolue",
    vehicle: "Peugeot Partner",
    location: "Casablanca",
    time: "30 juin 2026",
    date: "2026-06-30",
    speed: "Situation normale",
    icon: CheckCircle2,
  },
];

function getLevelStyle(level: AlertLevel) {
  switch (level) {
    case "critical":
      return {
        container: "border-red-500/20 bg-red-500/5",
        icon: "bg-red-500/10 text-red-400",
        badge: "bg-red-500/10 text-red-400",
        label: "Critique",
      };

    case "warning":
      return {
        container: "border-amber-500/20 bg-amber-500/5",
        icon: "bg-amber-500/10 text-amber-400",
        badge: "bg-amber-500/10 text-amber-400",
        label: "Attention",
      };

    case "success":
      return {
        container: "border-emerald-500/20 bg-emerald-500/5",
        icon: "bg-emerald-500/10 text-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-400",
        label: "Résolue",
      };

    default:
      return {
        container: "border-cyan-500/20 bg-cyan-500/5",
        icon: "bg-cyan-500/10 text-cyan-400",
        badge: "bg-cyan-500/10 text-cyan-400",
        label: "Information",
      };
  }
}

export default function DemoAlertsPage() {
  const [filter, setFilter] = useState<"all" | AlertLevel>("all");
  const [period, setPeriod] = useState("today");
  const [search, setSearch] = useState("");
  const [customStart, setCustomStart] = useState("2025-08-26");
  const [customEnd, setCustomEnd] = useState("2026-08-26");
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);

  const criticalCount = alerts.filter(
    (alert) => alert.level === "critical"
  ).length;

  const warningCount = alerts.filter(
    (alert) => alert.level === "warning"
  ).length;

  const resolvedCount = alerts.filter(
    (alert) => alert.level === "success"
  ).length;

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    if (filter !== "all") {
      result = result.filter((alert) => alert.level === filter);
    }

    if (search.trim()) {
      const searchValue = search.toLowerCase();

      result = result.filter(
        (alert) =>
          alert.title.toLowerCase().includes(searchValue) ||
          alert.vehicle.toLowerCase().includes(searchValue) ||
          alert.location.toLowerCase().includes(searchValue)
      );
    }

    if (period === "today") {
      result = result.filter((alert) => alert.date === "2026-08-26");
    }

    if (period === "7days") {
      result = result.filter(
        (alert) =>
          alert.date >= "2026-08-20" &&
          alert.date <= "2026-08-26"
      );
    }

    if (period === "30days") {
      result = result.filter(
        (alert) =>
          alert.date >= "2026-07-28" &&
          alert.date <= "2026-08-26"
      );
    }

    if (period === "3months") {
      result = result.filter(
        (alert) =>
          alert.date >= "2026-05-26" &&
          alert.date <= "2026-08-26"
      );
    }

    if (period === "6months") {
      result = result.filter(
        (alert) =>
          alert.date >= "2026-02-26" &&
          alert.date <= "2026-08-26"
      );
    }

    if (period === "1year") {
      result = result.filter(
        (alert) =>
          alert.date >= "2025-08-26" &&
          alert.date <= "2026-08-26"
      );
    }

    if (period === "custom") {
      result = result.filter(
        (alert) =>
          alert.date >= customStart &&
          alert.date <= customEnd
      );
    }

    return result;
  }, [
    filter,
    period,
    search,
    customStart,
    customEnd,
  ]);

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />

              <span className="text-xs font-medium uppercase tracking-wider text-red-400">
                Centre des alertes — Démonstration
              </span>

            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Alertes
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Surveillez les événements importants de votre flotte
              et consultez l'historique des alertes.
            </p>

          </div>

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <Bell className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <p className="text-xs text-zinc-500">
                Alertes actives
              </p>

              <p className="text-xl font-bold text-white">
                {criticalCount + warningCount}
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* STATISTIQUES */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-400">
                Total alertes
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {alerts.length}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <Bell className="h-5 w-5 text-blue-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-red-300">
                Critiques
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {criticalCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-amber-300">
                Attention
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {warningCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-emerald-300">
                Résolues
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {resolvedCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

          </div>

        </div>

      </section>


      {/* HISTORIQUE ET FILTRES */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

        <div className="mb-5">

          <h2 className="font-semibold text-white">
            Historique des alertes
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Consultez les alertes sur une période pouvant aller
            jusqu'à un an.
          </p>

        </div>


        <div className="grid gap-4 lg:grid-cols-4">

          {/* Période */}

          <div>

            <label className="mb-2 block text-xs font-medium text-zinc-400">
              Période
            </label>

            <div className="relative">

              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

              <select
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-300 outline-none focus:border-cyan-500"
              >

                <option value="today">
                  Aujourd'hui
                </option>

                <option value="7days">
                  7 derniers jours
                </option>

                <option value="30days">
                  30 derniers jours
                </option>

                <option value="3months">
                  3 derniers mois
                </option>

                <option value="6months">
                  6 derniers mois
                </option>

                <option value="1year">
                  1 an
                </option>

                <option value="custom">
                  Période personnalisée
                </option>

              </select>

            </div>

          </div>


          {/* Recherche */}

          <div>

            <label className="mb-2 block text-xs font-medium text-zinc-400">
              Recherche
            </label>

            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-3">

              <Search className="h-4 w-4 shrink-0 text-zinc-500" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Véhicule, alerte..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />

            </div>

          </div>


          {/* Date début */}

          {period === "custom" && (
            <div>

              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Date de début
              </label>

              <input
                type="date"
                value={customStart}
                onChange={(event) =>
                  setCustomStart(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500"
              />

            </div>
          )}


          {/* Date fin */}

          {period === "custom" && (
            <div>

              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Date de fin
              </label>

              <input
                type="date"
                value={customEnd}
                onChange={(event) =>
                  setCustomEnd(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500"
              />

            </div>
          )}

        </div>


        {/* FILTRES NIVEAU */}

        <div className="mt-5 flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "all"
                ? "bg-cyan-500 text-white"
                : "border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            Toutes
          </button>

          <button
            type="button"
            onClick={() => setFilter("critical")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "critical"
                ? "bg-red-500 text-white"
                : "border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            Critiques
          </button>

          <button
            type="button"
            onClick={() => setFilter("warning")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "warning"
                ? "bg-amber-500 text-white"
                : "border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            Attention
          </button>

          <button
            type="button"
            onClick={() => setFilter("success")}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
              filter === "success"
                ? "bg-emerald-500 text-white"
                : "border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            Résolues
          </button>

        </div>

      </section>


      {/* RESULTAT */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

        <div className="mb-5 flex items-center justify-between">

          <div>

            <h2 className="font-semibold text-white">
              Résultats
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {filteredAlerts.length} alerte
              {filteredAlerts.length > 1 ? "s" : ""} trouvée
              {filteredAlerts.length > 1 ? "s" : ""}
            </p>

          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">

            <Clock className="h-4 w-4" />

            Historique

          </div>

        </div>


        {/* LISTE */}

        <div className="space-y-3">

          {filteredAlerts.map((alert) => {

            const style = getLevelStyle(alert.level);
            const Icon = alert.icon;

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 transition hover:border-zinc-700 ${style.container}`}
              >

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div className="flex items-start gap-4">

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-semibold text-white">
                          {alert.title}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${style.badge}`}
                        >
                          {style.label}
                        </span>

                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">

                        <span className="flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5" />
                          {alert.vehicle}
                        </span>

                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {alert.location}
                        </span>

                      </div>

                      <p className="mt-2 text-xs text-zinc-500">
                        {alert.speed}
                      </p>

                    </div>

                  </div>


                  <div className="flex items-center justify-between gap-4 lg:justify-end">

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3.5 w-3.5" />
                      {alert.time}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAlert(alert)
                      }
                      className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                    >
                      Détails
                    </button>

                  </div>

                </div>

              </div>
            );
          })}


          {filteredAlerts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">

              <Bell className="mx-auto h-10 w-10 text-zinc-700" />

              <p className="mt-3 text-sm text-zinc-400">
                Aucune alerte trouvée.
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Modifiez la période, le filtre ou la recherche.
              </p>

            </div>
          )}

        </div>

      </section>


      {/* MODAL DETAILS */}

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs uppercase tracking-wider text-cyan-400">
                  Détails de l'alerte
                </p>

                <h2 className="mt-2 text-xl font-bold text-white">
                  {selectedAlert.title}
                </h2>

              </div>

              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Fermer
              </button>

            </div>


            <div className="mt-6 space-y-4">

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                <p className="text-xs text-zinc-500">
                  Véhicule
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {selectedAlert.vehicle}
                </p>

              </div>


              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                <p className="text-xs text-zinc-500">
                  Localisation
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {selectedAlert.location}
                </p>

              </div>


              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                  <p className="text-xs text-zinc-500">
                    Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {selectedAlert.date}
                  </p>

                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">

                  <p className="text-xs text-zinc-500">
                    Information
                  </p>

                  <p className="mt-1 text-sm font-medium text-white">
                    {selectedAlert.speed}
                  </p>

                </div>

              </div>

            </div>


            <div className="mt-6 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-4">

              <p className="text-xs text-zinc-500">
                Mode démonstration
              </p>

              <p className="mt-1 text-xs leading-5 text-zinc-400">
                Ces données sont actuellement fictives. Dans la
                version connectée, les alertes seront récupérées
                depuis votre système télématique.
              </p>

            </div>

          </div>

        </div>
      )}


      {/* BAS DE PAGE */}

      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <Truck className="h-5 w-5 text-cyan-400" />
            </div>

            <div>

              <p className="text-sm font-medium text-white">
                Besoin d'une vue complète de votre flotte ?
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Explorez le dashboard de démonstration.
              </p>

            </div>

          </div>

          <Link
            href="/demo"
            className="rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400"
          >
            Retour au dashboard
          </Link>

        </div>

      </section>


      {/* NOTE */}

      <div className="flex items-center justify-center gap-2 border-t border-zinc-800 pt-6 text-xs text-zinc-600">

        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />

        Mode démonstration — les données affichées sont fictives.

      </div>

    </div>
  );
}