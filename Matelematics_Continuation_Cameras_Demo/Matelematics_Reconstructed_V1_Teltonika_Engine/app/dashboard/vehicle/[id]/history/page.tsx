"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Gauge,
  MapPin,
  Route,
  CircleAlert,
  CircleStop,
  Play,
  Flag,
  Navigation,
  Search,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { buildVehicleTelemetryHistory } from "../../../../../lib/demo-fleet";

type HistoryEvent = {
  id: string;
  date: string;
  time: string;
  event: string;
  location: string;
  description: string;
  detail: string;
  type: "start" | "movement" | "stop" | "alert" | "end";
};

type PeriodPreset =
  | "today"
  | "7days"
  | "30days"
  | "3months"
  | "6months"
  | "1year"
  | "custom";

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateLong(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function subtractDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function subtractMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

function getOneYearAgo(date: Date) {
  return subtractMonths(date, 12);
}

export default function VehicleHistoryPage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;

  const today = useMemo(() => getToday(), []);

  const [period, setPeriod] = useState<PeriodPreset>("today");

  const [startDate, setStartDate] = useState(toInputDate(today));
  const [endDate, setEndDate] = useState(toInputDate(today));

  const [appliedStartDate, setAppliedStartDate] = useState(
    toInputDate(today)
  );

  const [appliedEndDate, setAppliedEndDate] = useState(
    toInputDate(today)
  );

  const [error, setError] = useState("");

  const history: HistoryEvent[] = useMemo(
    () => buildVehicleTelemetryHistory(vehicleId) as HistoryEvent[],
    [vehicleId]
  );

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      return (
        item.date >= appliedStartDate &&
        item.date <= appliedEndDate
      );
    });
  }, [history, appliedStartDate, appliedEndDate]);

  const selectedStart = new Date(`${appliedStartDate}T00:00:00`);
  const selectedEnd = new Date(`${appliedEndDate}T00:00:00`);

  const periodLabel =
    appliedStartDate === appliedEndDate
      ? formatDateLong(selectedStart)
      : `${formatDate(selectedStart)} → ${formatDate(selectedEnd)}`;

  const getEventIcon = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "start":
        return <Play className="h-4 w-4" />;

      case "movement":
        return <Navigation className="h-4 w-4" />;

      case "stop":
        return <CircleStop className="h-4 w-4" />;

      case "alert":
        return <CircleAlert className="h-4 w-4" />;

      case "end":
        return <Flag className="h-4 w-4" />;
    }
  };

  const getEventStyle = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "start":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

      case "movement":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";

      case "stop":
        return "bg-slate-700/50 text-slate-300 border-slate-600";

      case "alert":
        return "bg-red-500/10 text-red-400 border-red-500/20";

      case "end":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  const applyPreset = (preset: PeriodPreset) => {
    setError("");
    setPeriod(preset);

    const end = new Date(today);
    let start = new Date(today);

    switch (preset) {
      case "today":
        start = new Date(today);
        break;

      case "7days":
        start = subtractDays(today, 6);
        break;

      case "30days":
        start = subtractDays(today, 29);
        break;

      case "3months":
        start = subtractMonths(today, 3);
        break;

      case "6months":
        start = subtractMonths(today, 6);
        break;

      case "1year":
        start = getOneYearAgo(today);
        break;

      case "custom":
        return;
    }

    const startValue = toInputDate(start);
    const endValue = toInputDate(end);

    setStartDate(startValue);
    setEndDate(endValue);

    setAppliedStartDate(startValue);
    setAppliedEndDate(endValue);
  };

  const applyCustomPeriod = () => {
    setError("");

    if (!startDate || !endDate) {
      setError("Veuillez sélectionner une date de début et une date de fin.");
      return;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    if (start > end) {
      setError(
        "La date de début doit être antérieure ou égale à la date de fin."
      );
      return;
    }

    if (end > today) {
      setError("La date de fin ne peut pas être dans le futur.");
      return;
    }

    const minimumDate = getOneYearAgo(today);

    if (start < minimumDate) {
      setError(
        "L&apos;historique disponible dans cette interface est limité à 1 an."
      );
      return;
    }

    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setPeriod("custom");
  };

  const stats = useMemo(() => {
    const alerts = filteredHistory.filter(
      (item) => item.type === "alert"
    ).length;

    const stops = filteredHistory.filter(
      (item) => item.type === "stop"
    ).length;

    const hasTrip = filteredHistory.length > 0;

    return {
      distance: hasTrip ? "86,4 km" : "0 km",
      drivingTime: hasTrip ? "2 h 42" : "0 h",
      maxSpeed: hasTrip ? "87 km/h" : "0 km/h",
      alerts,
      stops,
    };
  }, [filteredHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/vehicle/${vehicleId}`}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            title="Retour au véhicule"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-white">
              Historique du véhicule
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Consultez les déplacements et événements du véhicule.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <CalendarDays className="h-5 w-5 text-cyan-400" />

          <div>
            <p className="text-xs text-slate-500">
              Période sélectionnée
            </p>

            <p className="text-sm font-medium text-white">
              {periodLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Sélection de période */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Période de l&apos;historique
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Sélectionnez la période à analyser, jusqu&apos;à 1 an d&apos;historique.
            </p>
          </div>

          {/* Presets */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
            {[
              ["today", "Aujourd'hui"],
              ["7days", "7 jours"],
              ["30days", "30 jours"],
              ["3months", "3 mois"],
              ["6months", "6 mois"],
              ["1year", "1 an"],
              ["custom", "Personnalisée"],
            ].map(([value, label]) => {
              const active = period === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    applyPreset(value as PeriodPreset)
                  }
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "border-blue-500 bg-blue-500/10 text-blue-400"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Custom dates */}
          {period === "custom" && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <label
                    htmlFor="start-date"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Date de début
                  </label>

                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    min={toInputDate(getOneYearAgo(today))}
                    max={toInputDate(today)}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="end-date"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Date de fin
                  </label>

                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    min={toInputDate(getOneYearAgo(today))}
                    max={toInputDate(today)}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={applyCustomPeriod}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <Search className="h-4 w-4" />
                  Appliquer
                </button>
              </div>

              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <p className="mt-3 text-xs text-slate-500">
                La période personnalisée ne peut pas dépasser 1 an et ne peut
                pas inclure de date future.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Résumé */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Distance parcourue"
          value={stats.distance}
          icon={<Route className="h-5 w-5 text-cyan-400" />}
          bg="bg-cyan-500/10"
        />

        <Stat
          label="Temps de conduite"
          value={stats.drivingTime}
          icon={<Clock3 className="h-5 w-5 text-blue-400" />}
          bg="bg-blue-500/10"
        />

        <Stat
          label="Vitesse maximale"
          value={stats.maxSpeed}
          icon={<Gauge className="h-5 w-5 text-yellow-400" />}
          bg="bg-yellow-500/10"
        />

        <Stat
          label="Alertes"
          value={String(stats.alerts)}
          valueClass="text-red-400"
          icon={<CircleAlert className="h-5 w-5 text-red-400" />}
          bg="bg-red-500/10"
        />

        <Stat
          label="Arrêts"
          value={String(stats.stops)}
          icon={<CircleStop className="h-5 w-5 text-slate-300" />}
          bg="bg-slate-700/50"
        />
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Navigation className="h-5 w-5 text-blue-400" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-white">
                  Activité du véhicule
                </h2>

                <p className="text-sm text-slate-400">
                  Chronologie des déplacements et événements
                </p>
              </div>
            </div>

            <div className="hidden rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-400 sm:block">
              {filteredHistory.length} événement
              {filteredHistory.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
                <CalendarDays className="h-6 w-6 text-slate-500" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-white">
                Aucun événement
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-400">
                Aucun déplacement ou événement n&apos;est disponible pour la
                période sélectionnée.
              </p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute bottom-5 left-[19px] top-5 w-px bg-slate-800" />

              <div className="space-y-8">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex gap-5"
                  >
                    {/* Icône */}
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${getEventStyle(
                        item.type
                      )}`}
                    >
                      {getEventIcon(item.type)}
                    </div>

                    {/* Contenu */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-semibold text-white">
                              {item.event}
                            </h3>

                            <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300">
                              {item.time}
                            </span>

                            <span className="rounded-md bg-slate-950 px-2 py-1 text-xs text-slate-500">
                              {formatDate(
                                new Date(
                                  `${item.date}T00:00:00`
                                )
                              )}
                            </span>
                          </div>

                          <div className="mt-2 flex items-start gap-2 text-sm text-slate-400">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                            <span>{item.location}</span>
                          </div>

                          <p className="mt-2 text-sm text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        <div className="w-fit rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                          {item.detail}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Informations supplémentaires */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoPanel title="Informations du trajet">
          <InfoRow
            label="Point de départ"
            value={filteredHistory.length > 0 ? "Casablanca" : "—"}
          />

          <InfoRow
            label="Destination"
            value={filteredHistory.length > 0 ? "Rabat" : "—"}
          />

          <InfoRow
            label="Distance"
            value={stats.distance}
          />

          <InfoRow
            label="Durée totale"
            value={stats.drivingTime}
          />
        </InfoPanel>

        <InfoPanel title="Résumé de conduite">
          <InfoRow
            label="Vitesse moyenne"
            value={filteredHistory.length > 0 ? "51 km/h" : "—"}
          />

          <InfoRow
            label="Vitesse maximale"
            value={stats.maxSpeed}
          />

          <InfoRow
            label="Arrêts"
            value={String(stats.stops)}
          />

          <InfoRow
            label="Alertes détectées"
            value={String(stats.alerts)}
            valueClass="text-red-400"
          />
        </InfoPanel>
      </div>

      {/* Retour */}
      <div className="pt-2">
        <Link
          href={`/dashboard/vehicle/${vehicleId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au véhicule
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composants                                                                  */
/* -------------------------------------------------------------------------- */

function Stat({
  label,
  value,
  icon,
  bg,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-bold ${valueClass}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-3 last:border-0">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span
        className={`text-sm font-medium ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}