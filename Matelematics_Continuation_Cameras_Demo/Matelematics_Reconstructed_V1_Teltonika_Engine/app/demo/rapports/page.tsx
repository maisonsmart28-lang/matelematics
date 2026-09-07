"use client";

import {
  BarChart3,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Fuel,
  Gauge,
  MapPin,
  Route,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";

const reportTypes = [
  {
    title: "Rapport de flotte",
    description: "Vue globale des véhicules et de leur activité.",
    icon: Truck,
    category: "Flotte",
  },
  {
    title: "Rapport de trajets",
    description: "Analyse des trajets, distances et temps de conduite.",
    icon: Route,
    category: "Trajets",
  },
  {
    title: "Rapport carburant",
    description: "Suivi de la consommation et des performances.",
    icon: Fuel,
    category: "Carburant",
  },
  {
    title: "Rapport conducteurs",
    description: "Activité et performances des conducteurs.",
    icon: Gauge,
    category: "Conducteurs",
  },
];

const recentReports = [
  {
    name: "Rapport de flotte quotidien",
    type: "Flotte",
    period: "26 août 2026",
    vehicles: 156,
    status: "Disponible",
  },
  {
    name: "Analyse des trajets",
    type: "Trajets",
    period: "25 août 2026",
    vehicles: 142,
    status: "Disponible",
  },
  {
    name: "Consommation carburant",
    type: "Carburant",
    period: "Semaine du 20 août",
    vehicles: 156,
    status: "Disponible",
  },
  {
    name: "Performance conducteurs",
    type: "Conducteurs",
    period: "Semaine du 20 août",
    vehicles: 87,
    status: "Disponible",
  },
];

type PeriodPreset =
  | "Aujourd'hui"
  | "Cette semaine"
  | "Ce mois"
  | "Les 30 derniers jours"
  | "Les 3 derniers mois"
  | "Les 6 derniers mois"
  | "Les 12 derniers mois"
  | "Personnalisée";

export default function DemoReportsPage() {
  const [period, setPeriod] = useState<PeriodPreset>("Aujourd'hui");
  const [selectedType, setSelectedType] = useState("Tous");

  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");

  const filteredReports =
    selectedType === "Tous"
      ? recentReports
      : recentReports.filter(
          (report) => report.type === selectedType
        );

  const maxDate = useMemo(() => {
    const date = new Date();
    return date.toISOString().split("T")[0];
  }, []);

  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 365);
    return date.toISOString().split("T")[0];
  }, []);

  const handlePeriodChange = (value: PeriodPreset) => {
    setPeriod(value);

    if (value !== "Personnalisée") {
      setAppliedStartDate("");
      setAppliedEndDate("");
    }
  };

  const handleApplyCustomPeriod = () => {
    if (!customStartDate || !customEndDate) {
      alert("Veuillez sélectionner une date de début et une date de fin.");
      return;
    }

    if (customStartDate > customEndDate) {
      alert(
        "La date de début doit être antérieure ou égale à la date de fin."
      );
      return;
    }

    setAppliedStartDate(customStartDate);
    setAppliedEndDate(customEndDate);
  };

  const formatDate = (date: string) => {
    if (!date) return "";

    return new Date(`${date}T00:00:00`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const selectedPeriodLabel =
    period === "Personnalisée" && appliedStartDate && appliedEndDate
      ? `${formatDate(appliedStartDate)} → ${formatDate(appliedEndDate)}`
      : period;

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-400" />

              <span className="text-xs font-medium uppercase tracking-wider text-purple-400">
                Analyse & statistiques
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Rapports
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Analysez les performances de votre flotte grâce aux
              rapports Matelematics.
            </p>

          </div>

          <div className="flex items-center gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3">

            <BarChart3 className="h-5 w-5 text-purple-400" />

            <div>
              <p className="text-xs text-zinc-500">
                Rapports disponibles
              </p>

              <p className="text-lg font-bold text-white">
                24
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
                Distance parcourue
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                24 560 km
              </p>

              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                +8,6%
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <Route className="h-6 w-6 text-cyan-400" />
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-zinc-400">
                Carburant consommé
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                2 450 L
              </p>

              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                -3,1%
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <Fuel className="h-6 w-6 text-amber-400" />
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-zinc-400">
                Trajets enregistrés
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                324
              </p>

              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                +12,8%
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <MapPin className="h-6 w-6 text-blue-400" />
            </div>

          </div>

        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-zinc-400">
                Véhicules analysés
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                156
              </p>

              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Flotte connectée
              </div>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <Car className="h-6 w-6 text-emerald-400" />
            </div>

          </div>

        </div>

      </section>

      {/* GÉNÉRATION */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

        <div className="mb-5">

          <h2 className="font-semibold text-white">
            Générer un rapport
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Sélectionnez les paramètres du rapport à consulter.
          </p>

        </div>

        <div className="grid gap-4 lg:grid-cols-3">

          {/* TYPE */}

          <div>

            <label className="mb-2 block text-xs font-medium text-zinc-400">
              Type de rapport
            </label>

            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value)
              }
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-purple-500"
            >

              <option value="Tous">
                Tous les rapports
              </option>

              <option value="Flotte">
                Flotte
              </option>

              <option value="Trajets">
                Trajets
              </option>

              <option value="Carburant">
                Carburant
              </option>

              <option value="Conducteurs">
                Conducteurs
              </option>

            </select>

          </div>

          {/* PÉRIODE */}

          <div>

            <label className="mb-2 block text-xs font-medium text-zinc-400">
              Période
            </label>

            <div className="relative">

              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

              <select
                value={period}
                onChange={(event) =>
                  handlePeriodChange(
                    event.target.value as PeriodPreset
                  )
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-zinc-300 outline-none focus:border-purple-500"
              >

                <option>
                  Aujourd'hui
                </option>

                <option>
                  Cette semaine
                </option>

                <option>
                  Ce mois
                </option>

                <option>
                  Les 30 derniers jours
                </option>

                <option>
                  Les 3 derniers mois
                </option>

                <option>
                  Les 6 derniers mois
                </option>

                <option>
                  Les 12 derniers mois
                </option>

                <option>
                  Personnalisée
                </option>

              </select>

            </div>

          </div>

          {/* BOUTON */}

          <div className="flex items-end">

            <button
              type="button"
              onClick={() =>
                alert(
                  `Rapport de démonstration généré pour la période : ${selectedPeriodLabel}`
                )
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
            >

              <FileText className="h-4 w-4" />

              Générer le rapport

            </button>

          </div>

        </div>

        {/* PÉRIODE PERSONNALISÉE */}

        {period === "Personnalisée" && (

          <div className="mt-5 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">

            <div className="mb-4">

              <p className="text-sm font-semibold text-white">
                Période personnalisée
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Vous pouvez consulter une période allant jusqu'à
                12 mois dans l'historique de démonstration.
              </p>

            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Date de début
                </label>

                <input
                  type="date"
                  value={customStartDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) =>
                    setCustomStartDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-purple-500"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Date de fin
                </label>

                <input
                  type="date"
                  value={customEndDate}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) =>
                    setCustomEndDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-purple-500"
                />

              </div>

              <div className="flex items-end">

                <button
                  type="button"
                  onClick={handleApplyCustomPeriod}
                  className="w-full rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20"
                >
                  Appliquer la période
                </button>

              </div>

            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">

              <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-zinc-500">
                Historique maximum : 365 jours
              </span>

              {appliedStartDate && appliedEndDate && (

                <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-400">
                  Période appliquée :{" "}
                  {formatDate(appliedStartDate)} →{" "}
                  {formatDate(appliedEndDate)}
                </span>

              )}

            </div>

          </div>

        )}

      </section>

      {/* PÉRIODE ACTIVE */}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-purple-500/10 bg-purple-500/5 px-4 py-3">

        <Calendar className="h-4 w-4 text-purple-400" />

        <span className="text-xs text-zinc-500">
          Période sélectionnée :
        </span>

        <span className="text-xs font-semibold text-purple-300">
          {selectedPeriodLabel}
        </span>

      </div>

      {/* TYPES DE RAPPORTS */}

      <section>

        <div className="mb-4">

          <h2 className="font-semibold text-white">
            Types de rapports
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Accédez rapidement aux principales analyses.
          </p>

        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          {reportTypes.map((report) => {

            const Icon = report.icon;

            return (
              <button
                key={report.title}
                type="button"
                onClick={() =>
                  alert(
                    `${report.title} — période : ${selectedPeriodLabel}`
                  )
                }
                className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-left transition hover:-translate-y-0.5 hover:border-purple-500/40 hover:bg-zinc-900"
              >

                <div className="flex items-start justify-between">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
                    <Icon className="h-5 w-5 text-purple-400" />
                  </div>

                  <Download className="h-4 w-4 text-zinc-700 transition group-hover:text-zinc-400" />

                </div>

                <h3 className="mt-4 font-semibold text-white">
                  {report.title}
                </h3>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  {report.description}
                </p>

                <span className="mt-4 inline-flex rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-medium text-zinc-500">
                  {report.category}
                </span>

              </button>
            );
          })}

        </div>

      </section>

      {/* RAPPORTS RÉCENTS */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="flex flex-col gap-3 border-b border-zinc-800 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="font-semibold text-white">
              Rapports récents
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Derniers rapports disponibles.
            </p>

          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-500">

            <Clock className="h-4 w-4" />

            Mise à jour automatique

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="w-full min-w-[750px]">

            <thead>

              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500">

                <th className="px-5 py-4 font-medium">
                  Rapport
                </th>

                <th className="px-5 py-4 font-medium">
                  Type
                </th>

                <th className="px-5 py-4 font-medium">
                  Période
                </th>

                <th className="px-5 py-4 font-medium">
                  Véhicules
                </th>

                <th className="px-5 py-4 font-medium">
                  Statut
                </th>

                <th className="px-5 py-4 font-medium">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredReports.map((report) => (

                <tr
                  key={report.name}
                  className="border-b border-zinc-800/70 transition hover:bg-zinc-900/60"
                >

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                        <FileText className="h-4 w-4 text-purple-400" />
                      </div>

                      <span className="text-sm font-medium text-white">
                        {report.name}
                      </span>

                    </div>

                  </td>

                  <td className="px-5 py-4">

                    <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400">
                      {report.type}
                    </span>

                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-400">
                    {report.period}
                  </td>

                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {report.vehicles}
                  </td>

                  <td className="px-5 py-4">

                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">

                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                      {report.status}

                    </span>

                  </td>

                  <td className="px-5 py-4">

                    <button
                      type="button"
                      onClick={() =>
                        alert(
                          `Téléchargement du rapport "${report.name}" — période : ${selectedPeriodLabel}`
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                    >

                      <Download className="h-3.5 w-3.5" />

                      Télécharger

                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {filteredReports.length === 0 && (
            <div className="px-6 py-12 text-center">

              <FileText className="mx-auto h-10 w-10 text-zinc-700" />

              <p className="mt-3 text-sm text-zinc-400">
                Aucun rapport trouvé.
              </p>

            </div>
          )}

        </div>

      </section>

      {/* BANDEAU DEMO */}

      <div className="flex items-center gap-3 rounded-xl border border-purple-500/10 bg-purple-500/5 px-4 py-3">

        <BarChart3 className="h-4 w-4 shrink-0 text-purple-400" />

        <p className="text-xs text-zinc-500">

          Cette page fonctionne en{" "}

          <span className="font-medium text-purple-400">
            mode démonstration
          </span>

          . Les statistiques et rapports affichés sont fictifs et
          ne sont pas connectés à votre flotte réelle.

        </p>

      </div>

    </div>
  );
}