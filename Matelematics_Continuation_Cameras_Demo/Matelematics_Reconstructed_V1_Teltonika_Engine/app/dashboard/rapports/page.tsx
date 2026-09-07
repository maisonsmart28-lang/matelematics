"use client";

import {
  Activity,
  BarChart3,
  CalendarDays,
  Car,
  ChevronRight,
  Clock3,
  Download,
  Fuel,
  Gauge,
  FileText,
  MapPin,
  Route,
  Search,
  TrendingUp,
  Wrench,
  X,
  Eye,
} from "lucide-react";
import { useMemo, useState } from "react";

type Report = {
  id: string;
  name: string;
  description: string;
  type: string;
  vehicle: string;
  period: string;
  generated: string;
};

const reports: Report[] = [
  {
    id: "1",
    name: "Rapport de trajets",
    description: "Résumé des trajets et déplacements de la flotte",
    type: "Trajets",
    vehicle: "Toute la flotte",
    period: "24 août 2026",
    generated: "Aujourd'hui, 10:45",
  },
  {
    id: "2",
    name: "Rapport de consommation",
    description: "Analyse de la consommation et du carburant",
    type: "Carburant",
    vehicle: "Toute la flotte",
    period: "01 - 24 août 2026",
    generated: "Aujourd'hui, 09:30",
  },
  {
    id: "3",
    name: "Rapport de performance",
    description: "Analyse des performances et comportements de conduite",
    type: "Performance",
    vehicle: "Ford Transit Custom",
    period: "01 - 24 août 2026",
    generated: "Hier, 18:20",
  },
  {
    id: "4",
    name: "Rapport de maintenance",
    description: "État des véhicules et interventions de maintenance",
    type: "Maintenance",
    vehicle: "Toute la flotte",
    period: "01 - 24 août 2026",
    generated: "Hier, 16:42",
  },
];

function ReportIcon({ type }: { type: string }) {
  if (type === "Trajets") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
        <Route className="h-5 w-5 text-blue-400" />
      </div>
    );
  }

  if (type === "Carburant") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
        <Fuel className="h-5 w-5 text-amber-400" />
      </div>
    );
  }

  if (type === "Performance") {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
        <TrendingUp className="h-5 w-5 text-purple-400" />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
      <Wrench className="h-5 w-5 text-emerald-400" />
    </div>
  );
}

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous les types");
  const [vehicleFilter, setVehicleFilter] = useState("Toute la flotte");

  const [period, setPeriod] = useState("Cette période");
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);

  const [generateType, setGenerateType] = useState("Trajets");
  const [generateVehicle, setGenerateVehicle] =
    useState("Toute la flotte");

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        report.name.toLowerCase().includes(search.toLowerCase()) ||
        report.description.toLowerCase().includes(search.toLowerCase());

      const matchesType =
        typeFilter === "Tous les types" ||
        report.type === typeFilter;

      const matchesVehicle =
        vehicleFilter === "Toute la flotte" ||
        report.vehicle === vehicleFilter;

      return matchesSearch && matchesType && matchesVehicle;
    });
  }, [search, typeFilter, vehicleFilter]);

  const handlePeriodChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;

    setPeriod(value);

    if (value === "Personnalisée") {
      setShowCustomPeriod(true);
    } else {
      setShowCustomPeriod(false);
    }
  };

  const formatCustomPeriod = () => {
    if (!startDate || !endDate) {
      return "Personnalisée";
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    return `${start.toLocaleDateString("fr-FR")} - ${end.toLocaleDateString(
      "fr-FR"
    )}`;
  };

  const downloadReport = (report: Report) => {
    const rows = [
      [
        "Rapport",
        "Type",
        "Véhicule",
        "Période",
        "Généré",
      ],
      [
        report.name,
        report.type,
        report.vehicle,
        report.period,
        report.generated,
      ],
      [],
      ["Données"],
      ["Distance parcourue", "1284 km"],
      ["Temps de conduite", "31 h 24"],
      ["Consommation", "184 L"],
      ["Vitesse moyenne", "43 km/h"],
      ["Véhicules suivis", "12"],
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${report.name
      .toLowerCase()
      .replace(/\s+/g, "-")}.csv`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateReport = () => {
    const generatedReport: Report = {
      id: `generated-${Date.now()}`,
      name: `Rapport ${generateType}`,
      description: `Rapport généré pour ${generateVehicle}`,
      type: generateType,
      vehicle: generateVehicle,
      period:
        period === "Personnalisée"
          ? formatCustomPeriod()
          : period,
      generated: "À l'instant",
    };

    setSelectedReport(generatedReport);
    setShowGenerate(false);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Rapports
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Analysez les performances et l'activité de votre flotte.
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={() => setShowGenerate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          <Download className="h-4 w-4" />
          Générer un rapport
        </button>

      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Distance parcourue
            </p>

            <Route className="h-5 w-5 text-blue-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            1 284 km
          </p>

          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
            <TrendingUp className="h-3.5 w-3.5" />
            +8,4 % cette semaine
          </div>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Temps de conduite
            </p>

            <Clock3 className="h-5 w-5 text-purple-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-purple-400">
            31 h 24
          </p>

          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Activity className="h-3.5 w-3.5" />
            Temps cumulé
          </div>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Consommation
            </p>

            <Fuel className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-400">
            184 L
          </p>

          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Gauge className="h-3.5 w-3.5" />
            Moyenne : 14,3 L/100 km
          </div>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Véhicules suivis
            </p>

            <Car className="h-5 w-5 text-emerald-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            12
          </p>

          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            <Activity className="h-3.5 w-3.5" />
            Véhicules actifs
          </div>

        </div>

      </div>

      {/* FILTRES */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">

          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un rapport..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />

          </div>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option>Tous les types</option>
            <option>Trajets</option>
            <option>Carburant</option>
            <option>Performance</option>
            <option>Maintenance</option>
          </select>

          <select
            value={vehicleFilter}
            onChange={(event) => setVehicleFilter(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option>Toute la flotte</option>
            <option>Ford Transit Custom</option>
            <option>Renault Express</option>
            <option>Dacia Dokker</option>
            <option>Peugeot Partner</option>
          </select>

          <select
            value={period}
            onChange={handlePeriodChange}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option>Cette période</option>
            <option>Aujourd'hui</option>
            <option>Hier</option>
            <option>7 derniers jours</option>
            <option>30 derniers jours</option>
            <option>Ce mois</option>
            <option>Mois précédent</option>
            <option>Personnalisée</option>
          </select>

        </div>

        {showCustomPeriod && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Date de début
                </label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 pl-10 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Date de fin
                </label>

                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 pl-10 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

            </div>

            <p className="mt-3 text-xs text-slate-500">
              Vous pouvez sélectionner une période allant jusqu'à
              1 an d'historique.
            </p>

          </div>
        )}

      </div>

      {/* RAPPORTS DISPONIBLES */}
      <div className="rounded-xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 px-5 py-4">

          <h2 className="font-semibold text-white">
            Rapports disponibles
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Consultez ou générez les rapports de votre flotte.
          </p>

        </div>

        <div className="divide-y divide-slate-800">

          {filteredReports.length === 0 ? (

            <div className="p-10 text-center">

              <FileText className="mx-auto h-10 w-10 text-slate-600" />

              <p className="mt-3 text-sm font-medium text-white">
                Aucun rapport trouvé
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Modifiez vos critères de recherche.
              </p>

            </div>

          ) : (

            filteredReports.map((report) => (

              <div
                key={report.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-slate-800/30 lg:flex-row lg:items-center lg:justify-between"
              >

                <div className="flex items-center gap-4">

                  <ReportIcon type={report.type} />

                  <div>

                    <h3 className="text-sm font-semibold text-white">
                      {report.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-400">
                      {report.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">

                      <span>
                        Type : {report.type}
                      </span>

                      <span>
                        Véhicule : {report.vehicle}
                      </span>

                      <span>
                        Période : {report.period}
                      </span>

                    </div>

                  </div>

                </div>

                <div className="flex items-center gap-3">

                  <div className="hidden text-right sm:block">

                    <p className="text-xs text-slate-500">
                      Dernière génération
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {report.generated}
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                    Consulter
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadReport(report)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                    title="Télécharger"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                </div>

              </div>

            ))

          )}

        </div>

      </div>

      {/* ANALYSE RAPIDE */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Performance de la flotte
              </h3>

              <p className="text-xs text-slate-500">
                Comparaison avec la période précédente
              </p>
            </div>

          </div>

          <div className="mt-5 space-y-4">

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">
                  Utilisation des véhicules
                </span>

                <span className="text-white">
                  82 %
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-[82%] rounded-full bg-blue-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">
                  Ponctualité
                </span>

                <span className="text-white">
                  91 %
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-[91%] rounded-full bg-emerald-500" />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-slate-400">
                  Conduite économique
                </span>

                <span className="text-white">
                  76 %
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-[76%] rounded-full bg-purple-500" />
              </div>
            </div>

          </div>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <MapPin className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Activité récente
              </h3>

              <p className="text-xs text-slate-500">
                Données de la journée
              </p>
            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Trajets
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                48
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Arrêts
              </p>

              <p className="mt-2 text-2xl font-bold text-white">
                76
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Alertes
              </p>

              <p className="mt-2 text-2xl font-bold text-red-400">
                5
              </p>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500">
                Kilométrage
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-400">
                286 km
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* INFORMATION */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">

        <div className="flex gap-3">

          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

          <div>

            <p className="text-sm font-medium text-white">
              Rapports télématiques
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Les données présentées sont actuellement des données de
              démonstration. Le module pourra ensuite être connecté aux
              données réelles de Traccar pour générer des rapports de
              kilométrage, trajets, consommation, conduite et maintenance.
            </p>

          </div>

        </div>

      </div>

      {/* MODAL CONSULTATION */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedReport(null);
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">

              <div className="flex items-center gap-3">

                <ReportIcon type={selectedReport.type} />

                <div>
                  <h2 className="font-semibold text-white">
                    {selectedReport.name}
                  </h2>

                  <p className="text-sm text-slate-400">
                    {selectedReport.description}
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Distance
                </p>

                <p className="mt-2 text-xl font-bold text-white">
                  1 284 km
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Conduite
                </p>

                <p className="mt-2 text-xl font-bold text-purple-400">
                  31 h 24
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Consommation
                </p>

                <p className="mt-2 text-xl font-bold text-amber-400">
                  184 L
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">
                  Véhicules
                </p>

                <p className="mt-2 text-xl font-bold text-emerald-400">
                  12
                </p>
              </div>

            </div>

            <div className="border-t border-slate-800 px-6 py-4">

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">

                <span>
                  Type : {selectedReport.type}
                </span>

                <span>
                  Véhicule : {selectedReport.vehicle}
                </span>

                <span>
                  Période : {selectedReport.period}
                </span>

              </div>

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950/50 px-6 py-4">

              <button
                type="button"
                onClick={() => downloadReport(selectedReport)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </button>

              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Fermer
              </button>

            </div>

          </div>
        </div>
      )}

      {/* MODAL GENERATION */}
      {showGenerate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowGenerate(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">

              <div>
                <h2 className="font-semibold text-white">
                  Générer un rapport
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Sélectionnez le type et le véhicule.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowGenerate(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="space-y-5 p-6">

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Type de rapport
                </label>

                <select
                  value={generateType}
                  onChange={(event) =>
                    setGenerateType(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option>Trajets</option>
                  <option>Carburant</option>
                  <option>Performance</option>
                  <option>Maintenance</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  Véhicule
                </label>

                <select
                  value={generateVehicle}
                  onChange={(event) =>
                    setGenerateVehicle(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option>Toute la flotte</option>
                  <option>Ford Transit Custom</option>
                  <option>Renault Express</option>
                  <option>Dacia Dokker</option>
                  <option>Peugeot Partner</option>
                </select>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                <div className="flex gap-3">

                  <CalendarDays className="h-5 w-5 shrink-0 text-blue-400" />

                  <div>
                    <p className="text-sm font-medium text-white">
                      Période sélectionnée
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {period === "Personnalisée"
                        ? formatCustomPeriod()
                        : period}
                    </p>
                  </div>

                </div>

              </div>

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950/50 px-6 py-4">

              <button
                type="button"
                onClick={() => setShowGenerate(false)}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleGenerateReport}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                <FileText className="h-4 w-4" />
                Générer
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}