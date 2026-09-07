"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Car,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  Plus,
  Search,
  Wrench,
  XCircle,
  X,
  Save,
} from "lucide-react";

import { useMemo, useState } from "react";

type MaintenanceStatus =
  | "À prévoir"
  | "Planifiée"
  | "Terminée"
  | "En retard";

type Priority = "Basse" | "Moyenne" | "Élevée";

type MaintenanceItem = {
  id: string;
  vehicle: string;
  registration: string;
  type: string;
  description: string;
  date: string;
  dateISO: string;
  mileage: string;
  status: MaintenanceStatus;
  priority: Priority;
};

type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "3months"
  | "6months"
  | "1year"
  | "custom";

const initialMaintenanceItems: MaintenanceItem[] = [
  {
    id: "1",
    vehicle: "Ford Transit Custom",
    registration: "12345-A-6",
    type: "Vidange",
    description: "Vidange moteur et remplacement du filtre à huile",
    date: "28 août 2026",
    dateISO: "2026-08-28",
    mileage: "45 000 km",
    status: "À prévoir",
    priority: "Moyenne",
  },
  {
    id: "2",
    vehicle: "Renault Express",
    registration: "45678-B-7",
    type: "Freins",
    description: "Contrôle et remplacement des plaquettes de frein",
    date: "26 août 2026",
    dateISO: "2026-08-26",
    mileage: "62 400 km",
    status: "Planifiée",
    priority: "Élevée",
  },
  {
    id: "3",
    vehicle: "Dacia Dokker",
    registration: "78912-C-8",
    type: "Pneus",
    description: "Contrôle de l'usure des quatre pneumatiques",
    date: "22 août 2026",
    dateISO: "2026-08-22",
    mileage: "38 200 km",
    status: "En retard",
    priority: "Élevée",
  },
  {
    id: "4",
    vehicle: "Peugeot Partner",
    registration: "32145-D-9",
    type: "Révision",
    description: "Révision générale du véhicule",
    date: "20 août 2026",
    dateISO: "2026-08-20",
    mileage: "51 800 km",
    status: "Terminée",
    priority: "Basse",
  },
];

const vehicles = [
  {
    vehicle: "Ford Transit Custom",
    registration: "12345-A-6",
  },
  {
    vehicle: "Renault Express",
    registration: "45678-B-7",
  },
  {
    vehicle: "Dacia Dokker",
    registration: "78912-C-8",
  },
  {
    vehicle: "Peugeot Partner",
    registration: "32145-D-9",
  },
  {
    vehicle: "Ford Ranger",
    registration: "65432-E-10",
  },
];

function StatusBadge({
  status,
}: {
  status: MaintenanceStatus;
}) {
  if (status === "Terminée") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Terminée
      </span>
    );
  }

  if (status === "Planifiée") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-400">
        <CalendarDays className="h-3.5 w-3.5" />
        Planifiée
      </span>
    );
  }

  if (status === "En retard") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
        <XCircle className="h-3.5 w-3.5" />
        En retard
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
      <Clock3 className="h-3.5 w-3.5" />
      À prévoir
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: Priority;
}) {
  if (priority === "Élevée") {
    return (
      <span className="text-xs font-medium text-red-400">
        Élevée
      </span>
    );
  }

  if (priority === "Moyenne") {
    return (
      <span className="text-xs font-medium text-amber-400">
        Moyenne
      </span>
    );
  }

  return (
    <span className="text-xs font-medium text-slate-400">
      Basse
    </span>
  );
}

function getPresetLabel(preset: DatePreset) {
  switch (preset) {
    case "today":
      return "Aujourd'hui";
    case "yesterday":
      return "Hier";
    case "7days":
      return "7 derniers jours";
    case "30days":
      return "30 derniers jours";
    case "3months":
      return "3 derniers mois";
    case "6months":
      return "6 derniers mois";
    case "1year":
      return "1 an";
    case "custom":
      return "Période personnalisée";
    default:
      return "Toutes les dates";
  }
}

function getDateRange(
  preset: DatePreset,
  customStart: string,
  customEnd: string
) {
  const today = new Date("2026-08-25T12:00:00");

  const end = new Date(today);
  let start: Date | null = null;

  if (preset === "today") {
    start = new Date(today);
  }

  if (preset === "yesterday") {
    start = new Date(today);
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  }

  if (preset === "7days") {
    start = new Date(today);
    start.setDate(start.getDate() - 6);
  }

  if (preset === "30days") {
    start = new Date(today);
    start.setDate(start.getDate() - 29);
  }

  if (preset === "3months") {
    start = new Date(today);
    start.setMonth(start.getMonth() - 3);
  }

  if (preset === "6months") {
    start = new Date(today);
    start.setMonth(start.getMonth() - 6);
  }

  if (preset === "1year") {
    start = new Date(today);
    start.setFullYear(start.getFullYear() - 1);
  }

  if (preset === "custom") {
    if (!customStart || !customEnd) {
      return null;
    }

    return {
      start: new Date(`${customStart}T00:00:00`),
      end: new Date(`${customEnd}T23:59:59`),
    };
  }

  if (!start) {
    return null;
  }

  return { start, end };
}

function formatDate(dateISO: string) {
  const date = new Date(`${dateISO}T12:00:00`);

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function MaintenancePage() {
  const [maintenanceItems, setMaintenanceItems] = useState<
    MaintenanceItem[]
  >(initialMaintenanceItems);

  const [datePreset, setDatePreset] =
    useState<DatePreset>("all");

  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [selectedItem, setSelectedItem] =
    useState<MaintenanceItem | null>(null);

  const [showDateMenu, setShowDateMenu] = useState(false);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [newVehicle, setNewVehicle] = useState("");
  const [newType, setNewType] = useState("Vidange");
  const [newDescription, setNewDescription] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newMileage, setNewMileage] = useState("");
  const [newPriority, setNewPriority] =
    useState<Priority>("Moyenne");
  const [newStatus, setNewStatus] =
    useState<MaintenanceStatus>("À prévoir");

  const filteredItems = useMemo(() => {
    const range = getDateRange(
      datePreset,
      customStart,
      customEnd
    );

    return maintenanceItems.filter((item) => {
      const matchesSearch =
        item.vehicle
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.registration
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        item.type
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        item.status === statusFilter;

      const matchesType =
        typeFilter === "all" ||
        item.type === typeFilter;

      const itemDate = new Date(
        `${item.dateISO}T12:00:00`
      );

      const matchesDate =
        !range ||
        (itemDate >= range.start &&
          itemDate <= range.end);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesDate
      );
    });
  }, [
    maintenanceItems,
    datePreset,
    customStart,
    customEnd,
    search,
    statusFilter,
    typeFilter,
  ]);

  const overdue = maintenanceItems.filter(
    (item) => item.status === "En retard"
  ).length;

  const planned = maintenanceItems.filter(
    (item) => item.status === "Planifiée"
  ).length;

  const completed = maintenanceItems.filter(
    (item) => item.status === "Terminée"
  ).length;

  const toPlan = maintenanceItems.filter(
    (item) => item.status === "À prévoir"
  ).length;

  const selectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setShowDateMenu(false);

    if (preset !== "custom") {
      setCustomStart("");
      setCustomEnd("");
    }
  };

  function resetCreateForm() {
    setNewVehicle("");
    setNewType("Vidange");
    setNewDescription("");
    setNewDate("");
    setNewMileage("");
    setNewPriority("Moyenne");
    setNewStatus("À prévoir");
  }

  function openCreateModal() {
    resetCreateForm();
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
  }

  function handleCreateMaintenance() {
    if (
      !newVehicle ||
      !newType ||
      !newDate ||
      !newMileage
    ) {
      return;
    }

    const selectedVehicle = vehicles.find(
      (vehicle) => vehicle.registration === newVehicle
    );

    if (!selectedVehicle) {
      return;
    }

    const newItem: MaintenanceItem = {
      id: `maintenance-${Date.now()}`,
      vehicle: selectedVehicle.vehicle,
      registration: selectedVehicle.registration,
      type: newType,
      description:
        newDescription.trim() ||
        `Intervention de maintenance : ${newType}`,
      date: formatDate(newDate),
      dateISO: newDate,
      mileage: `${newMileage} km`,
      status: newStatus,
      priority: newPriority,
    };

    setMaintenanceItems((current) => [
      newItem,
      ...current,
    ]);

    setShowCreateModal(false);
    resetCreateForm();
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10">
            <Wrench className="h-5 w-5 text-orange-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Maintenance
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Gérez l'entretien et la maintenance de votre flotte.
            </p>
          </div>

        </div>

        {/* BOUTON FONCTIONNEL */}
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle intervention
        </button>

      </div>

      {/* STATISTIQUES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Interventions à prévoir
            </p>

            <Wrench className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-400">
            {toPlan}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Interventions à planifier
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Planifiées
            </p>

            <CalendarDays className="h-5 w-5 text-blue-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-blue-400">
            {planned}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Interventions programmées
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              En retard
            </p>

            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-red-400">
            {overdue}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Action nécessaire
          </p>

        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Terminées
            </p>

            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {completed}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Interventions terminées
          </p>

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un véhicule..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
            />

          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="À prévoir">À prévoir</option>
            <option value="Planifiée">Planifiée</option>
            <option value="Terminée">Terminée</option>
            <option value="En retard">En retard</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-blue-500"
          >
            <option value="all">Tous les types</option>
            <option value="Vidange">Vidange</option>
            <option value="Freins">Freins</option>
            <option value="Pneus">Pneus</option>
            <option value="Révision">Révision</option>
            <option value="Batterie">Batterie</option>
            <option value="Climatisation">Climatisation</option>
            <option value="Autre">Autre</option>
          </select>

          {/* DATE */}
          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setShowDateMenu((value) => !value)
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <CalendarDays className="h-4 w-4" />
              {getPresetLabel(datePreset)}
            </button>

            {showDateMenu && (
              <div className="absolute right-0 z-30 mt-2 w-full min-w-[260px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 p-2 shadow-2xl">

                {[
                  ["all", "Toutes les dates"],
                  ["today", "Aujourd'hui"],
                  ["yesterday", "Hier"],
                  ["7days", "7 derniers jours"],
                  ["30days", "30 derniers jours"],
                  ["3months", "3 derniers mois"],
                  ["6months", "6 derniers mois"],
                  ["1year", "1 an"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      selectPreset(value as DatePreset)
                    }
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      datePreset === value
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <div className="my-2 border-t border-slate-800" />

                <button
                  type="button"
                  onClick={() => {
                    setDatePreset("custom");
                    setShowDateMenu(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    datePreset === "custom"
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  Période personnalisée
                </button>

              </div>
            )}

          </div>

        </div>

        {/* DATES PERSONNALISÉES */}
        {datePreset === "custom" && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">

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
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />

            </div>

          </div>
        )}

      </div>

      {/* TABLEAU */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 px-5 py-4">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-semibold text-white">
                Planning de maintenance
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Suivi des interventions de votre flotte.
              </p>

            </div>

            <span className="text-xs text-slate-500">
              {filteredItems.length} intervention
              {filteredItems.length !== 1 ? "s" : ""}
            </span>

          </div>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead>

              <tr className="border-b border-slate-800 bg-slate-950/50">

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Véhicule
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Intervention
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Échéance
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Priorité
                </th>

                <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Statut
                </th>

                <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-800">

              {filteredItems.map((item) => (

                <tr
                  key={item.id}
                  className="transition hover:bg-slate-800/40"
                >

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Car className="h-5 w-5 text-blue-400" />
                      </div>

                      <div>

                        <p className="text-sm font-medium text-white">
                          {item.vehicle}
                        </p>

                        <p className="text-xs text-slate-500">
                          {item.registration}
                        </p>

                      </div>

                    </div>

                  </td>

                  <td className="px-5 py-4">

                    <p className="text-sm font-medium text-white">
                      {item.type}
                    </p>

                    <p className="mt-1 max-w-xs text-xs text-slate-500">
                      {item.description}
                    </p>

                  </td>

                  <td className="px-5 py-4">

                    <p className="text-sm text-slate-300">
                      {item.date}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.mileage}
                    </p>

                  </td>

                  <td className="px-5 py-4">
                    <PriorityBadge
                      priority={item.priority}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="px-5 py-4 text-right">

                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                    >
                      Détails
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {filteredItems.length === 0 && (
            <div className="px-5 py-12 text-center">

              <CalendarDays className="mx-auto h-8 w-8 text-slate-600" />

              <p className="mt-3 text-sm font-medium text-white">
                Aucune intervention trouvée
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Modifiez la période ou les filtres sélectionnés.
              </p>

            </div>
          )}

        </div>

      </div>

      {/* MODAL CREATION */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeCreateModal}
        >

          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-400" />
                </div>

                <div>

                  <h2 className="text-lg font-semibold text-white">
                    Nouvelle intervention
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Ajoutez une intervention de maintenance à votre flotte.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* FORMULAIRE */}
            <div className="max-h-[70vh] overflow-y-auto p-6">

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                {/* VEHICULE */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Véhicule *
                  </label>

                  <select
                    value={newVehicle}
                    onChange={(e) =>
                      setNewVehicle(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="">
                      Sélectionner un véhicule
                    </option>

                    {vehicles.map((vehicle) => (
                      <option
                        key={vehicle.registration}
                        value={vehicle.registration}
                      >
                        {vehicle.vehicle} — {vehicle.registration}
                      </option>
                    ))}

                  </select>

                </div>

                {/* TYPE */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Type d'intervention *
                  </label>

                  <select
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="Vidange">Vidange</option>
                    <option value="Freins">Freins</option>
                    <option value="Pneus">Pneus</option>
                    <option value="Révision">Révision</option>
                    <option value="Batterie">Batterie</option>
                    <option value="Climatisation">
                      Climatisation
                    </option>
                    <option value="Autre">Autre</option>
                  </select>

                </div>

                {/* DATE */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Date d'échéance *
                  </label>

                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) =>
                      setNewDate(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />

                </div>

                {/* KILOMETRAGE */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Kilométrage *
                  </label>

                  <div className="relative">

                    <Gauge className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                    <input
                      type="number"
                      min="0"
                      value={newMileage}
                      onChange={(e) =>
                        setNewMileage(e.target.value)
                      }
                      placeholder="Ex. 50000"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />

                  </div>

                </div>

                {/* PRIORITE */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Priorité
                  </label>

                  <select
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(
                        e.target.value as Priority
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="Basse">Basse</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Élevée">Élevée</option>
                  </select>

                </div>

                {/* STATUT */}
                <div>

                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Statut
                  </label>

                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(
                        e.target.value as MaintenanceStatus
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="À prévoir">
                      À prévoir
                    </option>
                    <option value="Planifiée">
                      Planifiée
                    </option>
                    <option value="Terminée">
                      Terminée
                    </option>
                    <option value="En retard">
                      En retard
                    </option>
                  </select>

                </div>

              </div>

              {/* DESCRIPTION */}
              <div className="mt-4">

                <label className="mb-2 block text-xs font-medium text-slate-400">
                  Description
                </label>

                <textarea
                  value={newDescription}
                  onChange={(e) =>
                    setNewDescription(e.target.value)
                  }
                  rows={4}
                  placeholder="Décrivez l'intervention à effectuer..."
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                />

              </div>

              {/* AVERTISSEMENT FORMULAIRE */}
              {(!newVehicle ||
                !newDate ||
                !newMileage) && (
                <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">

                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />

                  <p className="text-xs leading-5 text-slate-400">
                    Veuillez renseigner le véhicule, la date
                    d'échéance et le kilométrage avant
                    d'enregistrer l'intervention.
                  </p>

                </div>
              )}

            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-6 py-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleCreateMaintenance}
                disabled={
                  !newVehicle ||
                  !newDate ||
                  !newMileage
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                Enregistrer l'intervention
              </button>

            </div>

          </div>

        </div>
      )}

      {/* MODAL DETAILS */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedItem(null)}
        >

          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10">
                  <Wrench className="h-5 w-5 text-orange-400" />
                </div>

                <div>

                  <h2 className="text-lg font-semibold text-white">
                    Détails de l'intervention
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedItem.type} ·{" "}
                    {selectedItem.vehicle}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            <div className="p-6">

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-xs text-slate-500">
                    Véhicule
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedItem.vehicle}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {selectedItem.registration}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-xs text-slate-500">
                    Intervention
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedItem.type}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-xs text-slate-500">
                    Échéance
                  </p>

                  <p className="mt-2 text-sm font-medium text-white">
                    {selectedItem.date}
                  </p>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-xs text-slate-500">
                    Kilométrage
                  </p>

                  <div className="mt-2 flex items-center gap-2">

                    <Gauge className="h-4 w-4 text-blue-400" />

                    <p className="text-sm font-medium text-white">
                      {selectedItem.mileage}
                    </p>

                  </div>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-xs text-slate-500">
                    Priorité
                  </p>

                  <div className="mt-2">
                    <PriorityBadge
                      priority={selectedItem.priority}
                    />
                  </div>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <p className="text-xs text-slate-500">
                    Statut
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status={selectedItem.status}
                    />
                  </div>

                </div>

              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  Description
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {selectedItem.description}
                </p>

              </div>

            </div>

            <div className="flex justify-end border-t border-slate-800 px-6 py-4">

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Fermer
              </button>

            </div>

          </div>

        </div>
      )}

      {/* RAPPEL */}
      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">

        <div className="flex gap-3">

          <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />

          <div>

            <p className="text-sm font-medium text-white">
              Suivi préventif
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Les informations affichées sont actuellement
              des données de démonstration. Le module pourra
              ensuite utiliser le kilométrage, les données CAN
              et les alertes des boîtiers Teltonika pour
              déclencher automatiquement les rappels de
              maintenance.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}