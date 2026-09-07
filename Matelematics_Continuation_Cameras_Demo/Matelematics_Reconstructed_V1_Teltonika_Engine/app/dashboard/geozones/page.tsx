"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Circle,
  Edit3,
  Globe2,
  MapPin,
  Plus,
  Search,
  Shield,
  Trash2,
  Truck,
  Users,
  X,
  XCircle,
} from "lucide-react";

type ZoneStatus = "Active" | "Inactive";

type ZoneColor = "blue" | "emerald" | "amber" | "violet";

type GeoZone = {
  id: number;
  name: string;
  type: string;
  location: string;
  radius: string;
  vehicles: number;
  entries: number;
  exits: number;
  status: ZoneStatus;
  alerts: boolean;
  color: ZoneColor;
};

const initialZones: GeoZone[] = [
  {
    id: 1,
    name: "Dépôt principal",
    type: "Cercle",
    location: "Aïn Sebaâ, Casablanca",
    radius: "500 m",
    vehicles: 8,
    entries: 24,
    exits: 21,
    status: "Active",
    alerts: true,
    color: "blue",
  },
  {
    id: 2,
    name: "Zone industrielle",
    type: "Zone personnalisée",
    location: "Bouskoura",
    radius: "1,2 km",
    vehicles: 5,
    entries: 18,
    exits: 16,
    status: "Active",
    alerts: true,
    color: "emerald",
  },
  {
    id: 3,
    name: "Centre-ville Casablanca",
    type: "Cercle",
    location: "Centre-ville",
    radius: "2 km",
    vehicles: 4,
    entries: 31,
    exits: 29,
    status: "Active",
    alerts: false,
    color: "violet",
  },
  {
    id: 4,
    name: "Atelier maintenance",
    type: "Zone personnalisée",
    location: "Mohammedia",
    radius: "300 m",
    vehicles: 2,
    entries: 7,
    exits: 5,
    status: "Inactive",
    alerts: false,
    color: "amber",
  },
];

function ZoneStatusBadge({ status }: { status: ZoneStatus }) {
  if (status === "Active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400">
      <XCircle className="h-3.5 w-3.5" />
      Inactive
    </span>
  );
}

function ZoneIcon({ color }: { color: ZoneColor }) {
  const classes: Record<ZoneColor, string> = {
    blue: "bg-blue-500/10 text-blue-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    violet: "bg-violet-500/10 text-violet-400",
  };

  return (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-xl ${classes[color]}`}
    >
      <Globe2 className="h-5 w-5" />
    </div>
  );
}

type ZoneModalProps = {
  mode: "create" | "edit";
  zone: GeoZone | null;
  onClose: () => void;
  onSave: (zone: GeoZone) => void;
};

function ZoneModal({
  mode,
  zone,
  onClose,
  onSave,
}: ZoneModalProps) {
  const [name, setName] = useState(zone?.name ?? "");
  const [type, setType] = useState(zone?.type ?? "Cercle");
  const [location, setLocation] = useState(zone?.location ?? "");
  const [radius, setRadius] = useState(zone?.radius ?? "500 m");
  const [color, setColor] = useState<ZoneColor>(
    zone?.color ?? "blue"
  );
  const [alerts, setAlerts] = useState(zone?.alerts ?? true);
  const [status, setStatus] = useState<ZoneStatus>(
    zone?.status ?? "Active"
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !location.trim() || !radius.trim()) {
      return;
    }

    const newZone: GeoZone = {
      id: zone?.id ?? Date.now(),
      name: name.trim(),
      type,
      location: location.trim(),
      radius: radius.trim(),
      vehicles: zone?.vehicles ?? 0,
      entries: zone?.entries ?? 0,
      exits: zone?.exits ?? 0,
      status,
      alerts,
      color,
    };

    onSave(newZone);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Globe2 className="h-5 w-5 text-violet-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                {mode === "create"
                  ? "Créer une géozone"
                  : "Modifier la géozone"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Configurez les paramètres de la zone.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-5">
            {/* NOM */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Nom de la zone
              </label>

              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex. Dépôt principal"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                required
              />
            </div>

            {/* TYPE */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Type de zone
              </label>

              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-violet-500"
              >
                <option value="Cercle">Cercle</option>
                <option value="Zone personnalisée">
                  Zone personnalisée
                </option>
              </select>
            </div>

            {/* LOCALISATION */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Localisation
              </label>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  value={location}
                  onChange={(event) =>
                    setLocation(event.target.value)
                  }
                  placeholder="Ex. Aïn Sebaâ, Casablanca"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                  required
                />
              </div>
            </div>

            {/* RAYON + COULEUR */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Rayon / taille
                </label>

                <input
                  value={radius}
                  onChange={(event) =>
                    setRadius(event.target.value)
                  }
                  placeholder="Ex. 500 m"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Couleur
                </label>

                <select
                  value={color}
                  onChange={(event) =>
                    setColor(event.target.value as ZoneColor)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-violet-500"
                >
                  <option value="blue">Bleu</option>
                  <option value="emerald">Vert</option>
                  <option value="amber">Orange</option>
                  <option value="violet">Violet</option>
                </select>
              </div>
            </div>

            {/* OPTIONS */}
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">
                    Alertes de géozone
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Être alerté lors des événements liés à cette zone.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={alerts}
                  onChange={(event) =>
                    setAlerts(event.target.checked)
                  }
                  className="h-4 w-4 accent-violet-500"
                />
              </label>

              <div className="border-t border-slate-800 pt-3">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  État de la zone
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as ZoneStatus)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-violet-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-950/50 p-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              <CheckCircle2 className="h-4 w-4" />

              {mode === "create"
                ? "Créer la géozone"
                : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GeozonesPage() {
  const [zones, setZones] = useState<GeoZone[]>(initialZones);

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "Tous" | ZoneStatus
  >("Tous");

  const [modalMode, setModalMode] = useState<
    "create" | "edit" | null
  >(null);

  const [selectedZone, setSelectedZone] =
    useState<GeoZone | null>(null);

  const filteredZones = useMemo(() => {
    return zones.filter((zone) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        zone.name.toLowerCase().includes(searchValue) ||
        zone.location.toLowerCase().includes(searchValue);

      const matchesFilter =
        filter === "Tous" || zone.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [zones, search, filter]);

  const activeZones = zones.filter(
    (zone) => zone.status === "Active"
  ).length;

  const monitoredVehicles = zones.reduce(
    (sum, zone) => sum + zone.vehicles,
    0
  );

  const totalEntries = zones.reduce(
    (sum, zone) => sum + zone.entries,
    0
  );

  const zonesWithAlerts = zones.filter(
    (zone) => zone.alerts
  ).length;

  function openCreateModal() {
    setSelectedZone(null);
    setModalMode("create");
  }

  function openEditModal(zone: GeoZone) {
    setSelectedZone(zone);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedZone(null);
  }

  function saveZone(zone: GeoZone) {
    setZones((current) => {
      const exists = current.some(
        (item) => item.id === zone.id
      );

      if (exists) {
        return current.map((item) =>
          item.id === zone.id ? zone : item
        );
      }

      return [...current, zone];
    });

    closeModal();
  }

  function toggleZone(id: number) {
    setZones((current) =>
      current.map((zone) =>
        zone.id === id
          ? {
              ...zone,
              status:
                zone.status === "Active"
                  ? "Inactive"
                  : "Active",
            }
          : zone
      )
    );
  }

  function toggleAlerts(id: number) {
    setZones((current) =>
      current.map((zone) =>
        zone.id === id
          ? {
              ...zone,
              alerts: !zone.alerts,
            }
          : zone
      )
    );
  }

  function deleteZone(id: number) {
    const zone = zones.find((item) => item.id === id);

    if (!zone) return;

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la géozone "${zone.name}" ?`
    );

    if (!confirmed) return;

    setZones((current) =>
      current.filter((zone) => zone.id !== id)
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
            <Globe2 className="h-6 w-6 text-violet-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Géozones
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Définissez des zones géographiques et surveillez
              les mouvements de votre flotte.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" />
          Créer une géozone
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Géozones
            </span>

            <Globe2 className="h-5 w-5 text-violet-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-white">
            {zones.length}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {activeZones} zones actuellement actives
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Véhicules surveillés
            </span>

            <Truck className="h-5 w-5 text-blue-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-blue-400">
            {monitoredVehicles}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Véhicules présents dans les zones
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Entrées
            </span>

            <MapPin className="h-5 w-5 text-emerald-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-emerald-400">
            {totalEntries}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Entrées enregistrées
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              Alertes
            </span>

            <Bell className="h-5 w-5 text-amber-400" />
          </div>

          <p className="mt-3 text-3xl font-bold text-amber-400">
            {zonesWithAlerts}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Zones avec alertes activées
          </p>
        </div>
      </div>

      {/* MAP PREVIEW */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-white">
              Carte des géozones
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Vue d'ensemble de vos zones de surveillance
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            {activeZones} zones actives
          </div>
        </div>

        <div className="relative h-[300px] overflow-hidden bg-slate-950">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(rgba(100,116,139,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(100,116,139,0.25) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="absolute left-[15%] top-[30%] h-28 w-28 rounded-full border-2 border-blue-500/40 bg-blue-500/10" />

          <div className="absolute left-[45%] top-[20%] h-40 w-40 rounded-full border-2 border-emerald-500/40 bg-emerald-500/10" />

          <div className="absolute bottom-[20%] right-[15%] h-32 w-32 rounded-full border-2 border-violet-500/40 bg-violet-500/10" />

          <div className="absolute left-[22%] top-[42%] flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-500/30">
            <MapPin className="h-4 w-4 text-white" />
          </div>

          <div className="absolute left-[52%] top-[37%] flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-500/30">
            <MapPin className="h-4 w-4 text-white" />
          </div>

          <div className="absolute bottom-[30%] right-[25%] flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-500/30">
            <MapPin className="h-4 w-4 text-white" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-xl border border-slate-700 bg-slate-900/90 px-5 py-4 text-center shadow-xl backdrop-blur">
              <Globe2 className="mx-auto h-7 w-7 text-violet-400" />

              <p className="mt-2 text-sm font-medium text-white">
                Carte interactive
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Les géozones seront affichées sur la carte en
                temps réel.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LISTE */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Vos géozones
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                {filteredZones.length} zone
                {filteredZones.length > 1 ? "s" : ""} affichée
                {filteredZones.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Rechercher une zone..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500 sm:w-64"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as
                      | "Tous"
                      | ZoneStatus
                  )
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-violet-500"
              >
                <option value="Tous">Toutes les zones</option>
                <option value="Active">Actives</option>
                <option value="Inactive">Inactives</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800">
          {filteredZones.map((zone) => (
            <div
              key={zone.id}
              className="p-5 transition hover:bg-slate-800/30"
            >
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                {/* NOM */}
                <div className="flex min-w-[260px] flex-1 items-center gap-4">
                  <ZoneIcon color={zone.color} />

                  <div>
                    <h3 className="font-medium text-white">
                      {zone.name}
                    </h3>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />

                      {zone.location}
                    </div>
                  </div>
                </div>

                {/* TYPE */}
                <div className="min-w-[150px]">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
                    Type
                  </p>

                  <p className="text-sm text-slate-300">
                    {zone.type}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Rayon : {zone.radius}
                  </p>
                </div>

                {/* VEHICULES */}
                <div className="min-w-[130px]">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
                    Véhicules
                  </p>

                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-400" />

                    <span className="text-sm text-slate-300">
                      {zone.vehicles}
                    </span>
                  </div>
                </div>

                {/* MOUVEMENTS */}
                <div className="min-w-[160px]">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
                    Mouvements
                  </p>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400">
                      ↑ {zone.entries}
                    </span>

                    <span className="text-red-400">
                      ↓ {zone.exits}
                    </span>
                  </div>
                </div>

                {/* ALERTES */}
                <div className="min-w-[150px]">
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-600">
                    Alertes
                  </p>

                  <button
                    type="button"
                    title={
                      zone.alerts
                        ? "Désactiver les alertes"
                        : "Activer les alertes"
                    }
                    onClick={() => toggleAlerts(zone.id)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-slate-800"
                  >
                    {zone.alerts ? (
                      <>
                        <Bell className="h-4 w-4 text-amber-400" />

                        <span className="text-sm text-amber-400">
                          Activées
                        </span>
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 text-slate-600" />

                        <span className="text-sm text-slate-500">
                          Désactivées
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* ACTIONS */}
                <div className="flex flex-wrap items-center gap-2">
                  <ZoneStatusBadge status={zone.status} />

                  <button
                    type="button"
                    title={
                      zone.status === "Active"
                        ? "Désactiver"
                        : "Activer"
                    }
                    onClick={() => toggleZone(zone.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                  >
                    {zone.status === "Active" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    title="Modifier"
                    onClick={() => openEditModal(zone)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    title="Supprimer"
                    onClick={() => deleteZone(zone.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredZones.length === 0 && (
            <div className="p-12 text-center">
              <Globe2 className="mx-auto h-10 w-10 text-slate-700" />

              <p className="mt-3 font-medium text-slate-300">
                Aucune géozone trouvée
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Modifiez votre recherche ou votre filtre.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* INFO */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />

          <div>
            <p className="text-sm font-medium text-white">
              Surveillance géographique
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Les géozones permettent de déclencher automatiquement
              des événements lorsqu'un véhicule entre ou sort d'une
              zone définie. Les actions de création, modification,
              suppression et activation sont maintenant disponibles
              dans cette interface.
            </p>
          </div>
        </div>
      </div>

      {/* MODALE */}
      {modalMode !== null && (
        <ZoneModal
          mode={modalMode}
          zone={selectedZone}
          onClose={closeModal}
          onSave={saveZone}
        />
      )}
    </div>
  );
}