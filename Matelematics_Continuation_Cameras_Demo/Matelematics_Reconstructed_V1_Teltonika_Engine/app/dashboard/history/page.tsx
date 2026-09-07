"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Car,
  Clock3,
  Gauge,
  MapPin,
  Navigation,
  Route,
  Search,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { buildDemoHistoryEvents } from "../../../lib/demo-fleet";

type HistoryEvent = {
  id: string;
  vehicle: string;
  registration: string;
  type: "Départ" | "Arrivée" | "Arrêt" | "Trajet";
  date: string;
  time: string;
  location: string;
  destination: string;
  distance: string;
  duration: string;
  speed: string;
  dateValue: string;
};

type Period =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "3months"
  | "year"
  | "custom";

const historyEvents: HistoryEvent[] = buildDemoHistoryEvents() as HistoryEvent[];

function EventIcon({
  type,
}: {
  type: HistoryEvent["type"];
}) {
  if (type === "Départ") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
      </div>
    );
  }

  if (type === "Arrivée") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
        <ArrowDownRight className="h-4 w-4 text-blue-400" />
      </div>
    );
  }

  if (type === "Arrêt") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
        <Clock3 className="h-4 w-4 text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
      <Route className="h-4 w-4 text-purple-400" />
    </div>
  );
}

function formatDateForDisplay(date: string) {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];

  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");

  const [period, setPeriod] = useState<Period>("today");

  const [customStart, setCustomStart] = useState("2026-08-24");
  const [customEnd, setCustomEnd] = useState("2026-08-24");

  const [appliedStart, setAppliedStart] = useState("2026-08-24");
  const [appliedEnd, setAppliedEnd] = useState("2026-08-24");

  const getPeriodDates = (selectedPeriod: Period) => {
    const today = new Date("2026-08-24T12:00:00");

    if (selectedPeriod === "today") {
      return {
        start: "2026-08-24",
        end: "2026-08-24",
      };
    }

    if (selectedPeriod === "yesterday") {
      return {
        start: "2026-08-23",
        end: "2026-08-23",
      };
    }

    if (selectedPeriod === "7days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);

      return {
        start: start.toISOString().slice(0, 10),
        end: "2026-08-24",
      };
    }

    if (selectedPeriod === "30days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);

      return {
        start: start.toISOString().slice(0, 10),
        end: "2026-08-24",
      };
    }

    if (selectedPeriod === "3months") {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 3);

      return {
        start: start.toISOString().slice(0, 10),
        end: "2026-08-24",
      };
    }

    if (selectedPeriod === "year") {
      return {
        start: "2026-01-01",
        end: "2026-08-24",
      };
    }

    return {
      start: appliedStart,
      end: appliedEnd,
    };
  };

  const handlePeriodChange = (value: Period) => {
    setPeriod(value);

    if (value !== "custom") {
      const dates = getPeriodDates(value);

      setAppliedStart(dates.start);
      setAppliedEnd(dates.end);
    }
  };

  const applyCustomPeriod = () => {
    if (!customStart || !customEnd) return;

    if (customStart > customEnd) {
      alert(
        "La date de début doit être antérieure ou égale à la date de fin."
      );
      return;
    }

    setAppliedStart(customStart);
    setAppliedEnd(customEnd);
  };

  const filteredEvents = useMemo(() => {
    return historyEvents.filter((event) => {
      const matchesSearch =
        event.vehicle.toLowerCase().includes(search.toLowerCase()) ||
        event.registration.toLowerCase().includes(search.toLowerCase());

      const matchesVehicle =
        vehicleFilter === "all" ||
        event.vehicle === vehicleFilter;

      const matchesEvent =
        eventFilter === "all" ||
        event.type === eventFilter;

      const matchesDate =
        event.dateValue >= appliedStart &&
        event.dateValue <= appliedEnd;

      return (
        matchesSearch &&
        matchesVehicle &&
        matchesEvent &&
        matchesDate
      );
    });
  }, [
    search,
    vehicleFilter,
    eventFilter,
    appliedStart,
    appliedEnd,
  ]);

  const periodLabel = useMemo(() => {
    if (period === "today") return "Aujourd'hui";
    if (period === "yesterday") return "Hier";
    if (period === "7days") return "7 derniers jours";
    if (period === "30days") return "30 derniers jours";
    if (period === "3months") return "3 derniers mois";
    if (period === "year") return "Cette année";

    if (appliedStart === appliedEnd) {
      return formatDateForDisplay(appliedStart);
    }

    return `${formatDateForDisplay(appliedStart)} → ${formatDateForDisplay(
      appliedEnd
    )}`;
  }, [period, appliedStart, appliedEnd]);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Clock3 className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Historique
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Consultez les trajets, arrêts et activités de votre flotte.
            </p>
          </div>

        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Trajets
            </p>
            <Navigation className="h-5 w-5 text-blue-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {filteredEvents.filter((e) => e.type === "Trajet").length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Pour la période sélectionnée
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Distance parcourue
            </p>

            <Route className="h-5 w-5 text-emerald-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            286 km
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Pour la période sélectionnée
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Temps de conduite
            </p>

            <Clock3 className="h-5 w-5 text-purple-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-purple-400">
            6 h 42
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Pour la période sélectionnée
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Vitesse moyenne
            </p>

            <Gauge className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-400">
            43 km/h
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Sur les trajets enregistrés
          </p>
        </div>

      </div>

      {/* FILTRES */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">

          {/* RECHERCHE */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un véhicule..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />
          </div>

          {/* VEHICULE */}
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="all">
              Tous les véhicules
            </option>

            <option value="Ford Transit Custom">
              Ford Transit Custom
            </option>

            <option value="Renault Express">
              Renault Express
            </option>

            <option value="Dacia Dokker">
              Dacia Dokker
            </option>

            <option value="Peugeot Partner">
              Peugeot Partner
            </option>

            <option value="Ford Ranger">
              Ford Ranger
            </option>
          </select>

          {/* EVENEMENT */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="all">
              Tous les événements
            </option>

            <option value="Trajet">
              Trajets
            </option>

            <option value="Départ">
              Départs
            </option>

            <option value="Arrivée">
              Arrivées
            </option>

            <option value="Arrêt">
              Arrêts
            </option>
          </select>

          {/* PERIODE */}
          <select
            value={period}
            onChange={(e) =>
              handlePeriodChange(e.target.value as Period)
            }
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="today">
              Aujourd&apos;hui
            </option>

            <option value="yesterday">
              Hier
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

            <option value="year">
              Cette année
            </option>

            <option value="custom">
              Période personnalisée
            </option>
          </select>

        </div>

        {/* PERIODE PERSONNALISEE */}
        {period === "custom" && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Date de début
                </label>

                <input
                  type="date"
                  value={customStart}
                  onChange={(e) =>
                    setCustomStart(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Date de fin
                </label>

                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) =>
                    setCustomEnd(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={applyCustomPeriod}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <CalendarDays className="h-4 w-4" />
                  Appliquer la période
                </button>
              </div>

            </div>

          </div>
        )}

        {/* PERIODE ACTIVE */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">

          <span className="text-slate-500">
            Période sélectionnée :
          </span>

          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 font-medium text-blue-400">
            {periodLabel}
          </span>

          <span className="text-slate-600">
            {appliedStart} → {appliedEnd}
          </span>

        </div>

      </div>

      {/* TABLEAU */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 px-5 py-4">

          <h2 className="font-semibold text-white">
            Activités récentes
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {filteredEvents.length} événement(s) correspondant aux filtres.
          </p>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Événement
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Véhicule
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Date
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Localisation
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Destination
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Distance
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Durée
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Vitesse
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">

              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (

                  <tr
                    key={event.id}
                    className="transition hover:bg-slate-800/40"
                  >

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-3">

                        <EventIcon type={event.type} />

                        <span className="text-sm font-medium text-white">
                          {event.type}
                        </span>

                      </div>

                    </td>

                    <td className="px-5 py-4">

                      <Link
                        href={`/dashboard/vehicle/${event.id}`}
                        className="flex items-center gap-2"
                      >

                        <Car className="h-4 w-4 text-blue-400" />

                        <div>

                          <p className="text-sm font-medium text-white hover:text-blue-400">
                            {event.vehicle}
                          </p>

                          <p className="text-xs text-slate-500">
                            {event.registration}
                          </p>

                        </div>

                      </Link>

                    </td>

                    <td className="px-5 py-4">

                      <p className="text-sm text-slate-300">
                        {event.date}
                      </p>

                      <p className="text-xs text-slate-500">
                        {event.time}
                      </p>

                    </td>

                    <td className="px-5 py-4">

                      <div className="flex items-center gap-2 text-sm text-slate-300">

                        <MapPin className="h-4 w-4 text-slate-500" />

                        {event.location}

                      </div>

                    </td>

                    <td className="px-5 py-4 text-sm text-slate-400">
                      {event.destination}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-300">
                      {event.distance}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-300">
                      {event.duration}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-300">
                      {event.speed}
                    </td>

                  </tr>

                ))
              ) : (

                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center"
                  >

                    <CalendarDays className="mx-auto h-8 w-8 text-slate-600" />

                    <p className="mt-3 text-sm font-medium text-slate-300">
                      Aucun événement trouvé
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Modifiez la période ou les filtres de recherche.
                    </p>

                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* INFORMATION */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">

        <div className="flex gap-3">

          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

          <div>

            <p className="text-sm font-medium text-white">
              Historique télématique
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Les événements affichés sont actuellement des données de
              démonstration. Ils pourront être remplacés par les trajets,
              positions et événements réels provenant de Traccar.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}