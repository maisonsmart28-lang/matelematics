"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit,
  Globe,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
  Save,
} from "lucide-react";

interface Geozone {
  id: number;
  name: string;
  type: "Cercle" | "Polygone";
  location: string;
  vehicles: number;
  status: "active" | "inactive";
  alerts: number;
}

const initialGeozones: Geozone[] = [
  {
    id: 1,
    name: "Dépôt Casablanca",
    type: "Cercle",
    location: "Casablanca",
    vehicles: 24,
    status: "active",
    alerts: 3,
  },
  {
    id: 2,
    name: "Agence Rabat",
    type: "Polygone",
    location: "Rabat",
    vehicles: 18,
    status: "active",
    alerts: 1,
  },
  {
    id: 3,
    name: "Zone industrielle Tanger",
    type: "Polygone",
    location: "Tanger",
    vehicles: 12,
    status: "active",
    alerts: 0,
  },
  {
    id: 4,
    name: "Centre logistique Marrakech",
    type: "Cercle",
    location: "Marrakech",
    vehicles: 9,
    status: "inactive",
    alerts: 0,
  },
  {
    id: 5,
    name: "Zone interdite Centre-ville",
    type: "Polygone",
    location: "Casablanca",
    vehicles: 0,
    status: "active",
    alerts: 8,
  },
];

export default function DemoGeozonesPage() {
  const [geozones, setGeozones] =
    useState<Geozone[]>(initialGeozones);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] =
    useState<"Cercle" | "Polygone">("Cercle");
  const [formLocation, setFormLocation] = useState("");
  const [formVehicles, setFormVehicles] = useState("0");
  const [formStatus, setFormStatus] =
    useState<"active" | "inactive">("active");

  const filteredGeozones = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return geozones;
    }

    return geozones.filter((zone) =>
      `${zone.name} ${zone.location} ${zone.type}`
        .toLowerCase()
        .includes(query)
    );
  }, [geozones, search]);

  const activeCount = geozones.filter(
    (zone) => zone.status === "active"
  ).length;

  const vehicleCount = geozones.reduce(
    (total, zone) => total + zone.vehicles,
    0
  );

  const alertCount = geozones.reduce(
    (total, zone) => total + zone.alerts,
    0
  );

  function resetForm() {
    setFormName("");
    setFormType("Cercle");
    setFormLocation("");
    setFormVehicles("0");
    setFormStatus("active");
    setEditingId(null);
  }

  function openNewForm() {
    resetForm();
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  function openEditForm(zone: Geozone) {
    setEditingId(zone.id);
    setFormName(zone.name);
    setFormType(zone.type);
    setFormLocation(zone.location);
    setFormVehicles(zone.vehicles.toString());
    setFormStatus(zone.status);
    setShowForm(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = formName.trim();
    const location = formLocation.trim();
    const vehicles = Math.max(
      0,
      Number.parseInt(formVehicles, 10) || 0
    );

    if (!name || !location) {
      alert("Veuillez renseigner le nom et la localisation.");
      return;
    }

    if (editingId !== null) {
      setGeozones((current) =>
        current.map((zone) =>
          zone.id === editingId
            ? {
                ...zone,
                name,
                type: formType,
                location,
                vehicles,
                status: formStatus,
              }
            : zone
        )
      );
    } else {
      const newId =
        geozones.length > 0
          ? Math.max(...geozones.map((zone) => zone.id)) + 1
          : 1;

      const newGeozone: Geozone = {
        id: newId,
        name,
        type: formType,
        location,
        vehicles,
        status: formStatus,
        alerts: 0,
      };

      setGeozones((current) => [
        ...current,
        newGeozone,
      ]);
    }

    closeForm();
  }

  function handleDelete(zone: Geozone) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la géozone "${zone.name}" ?`
    );

    if (!confirmed) {
      return;
    }

    setGeozones((current) =>
      current.filter((item) => item.id !== zone.id)
    );
  }

  function toggleStatus(zone: Geozone) {
    setGeozones((current) =>
      current.map((item) =>
        item.id === zone.id
          ? {
              ...item,
              status:
                item.status === "active"
                  ? "inactive"
                  : "active",
            }
          : item
      )
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <Link
              href="/demo"
              className="mb-4 inline-flex items-center gap-2 text-xs text-zinc-500 transition hover:text-cyan-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Link>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                <Globe className="h-6 w-6 text-cyan-400" />
              </div>

              <div>

                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Géozones
                </h1>

                <p className="mt-1 text-sm text-zinc-400">
                  Gérez les zones géographiques de votre flotte.
                </p>

              </div>

            </div>

          </div>

          <button
            type="button"
            onClick={openNewForm}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Nouvelle géozone
          </button>

        </div>

      </section>


      {/* FORMULAIRE */}

      {showForm && (
        <section className="rounded-2xl border border-cyan-500/20 bg-zinc-950 p-6 shadow-xl">

          <div className="mb-6 flex items-start justify-between gap-4">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Globe className="h-4 w-4 text-cyan-400" />
                </div>

                <h2 className="font-semibold text-white">
                  {editingId !== null
                    ? "Modifier la géozone"
                    : "Créer une nouvelle géozone"}
                </h2>

              </div>

              <p className="mt-2 text-xs text-zinc-500">
                Configurez les informations principales de la
                zone géographique.
              </p>

            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

          </div>


          <form
            onSubmit={handleSubmit}
            className="grid gap-5 md:grid-cols-2"
          >

            {/* NOM */}

            <div>

              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Nom de la géozone
              </label>

              <input
                type="text"
                value={formName}
                onChange={(event) =>
                  setFormName(event.target.value)
                }
                placeholder="Ex. Dépôt Casablanca"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-500"
                required
              />

            </div>


            {/* TYPE */}

            <div>

              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Type de zone
              </label>

              <select
                value={formType}
                onChange={(event) =>
                  setFormType(
                    event.target.value as
                      | "Cercle"
                      | "Polygone"
                  )
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500"
              >

                <option value="Cercle">
                  Cercle
                </option>

                <option value="Polygone">
                  Polygone
                </option>

              </select>

            </div>


            {/* LOCALISATION */}

            <div>

              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Localisation
              </label>

              <div className="relative">

                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />

                <input
                  type="text"
                  value={formLocation}
                  onChange={(event) =>
                    setFormLocation(event.target.value)
                  }
                  placeholder="Ex. Casablanca"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-500"
                  required
                />

              </div>

            </div>


            {/* VEHICULES */}

            <div>

              <label className="mb-2 block text-xs font-medium text-zinc-400">
                Nombre de véhicules
              </label>

              <input
                type="number"
                min="0"
                value={formVehicles}
                onChange={(event) =>
                  setFormVehicles(event.target.value)
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              />

            </div>


            {/* STATUT */}

            <div>

              <label className="mb-2 block text-xs font-medium text-zinc-400">
                État
              </label>

              <select
                value={formStatus}
                onChange={(event) =>
                  setFormStatus(
                    event.target.value as
                      | "active"
                      | "inactive"
                  )
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500"
              >

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>

              </select>

            </div>


            {/* ACTIONS */}

            <div className="flex items-end justify-end gap-3">

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                Annuler
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                <Save className="h-4 w-4" />

                {editingId !== null
                  ? "Enregistrer les modifications"
                  : "Créer la géozone"}
              </button>

            </div>

          </form>

        </section>
      )}


      {/* STATISTIQUES */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-500">
                Géozones totales
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {geozones.length}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
              <Globe className="h-5 w-5 text-cyan-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-500">
                Zones actives
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {activeCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-500">
                Véhicules concernés
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {vehicleCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <MapPin className="h-5 w-5 text-blue-400" />
            </div>

          </div>

        </div>


        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm text-zinc-500">
                Alertes géozones
              </p>

              <p className="mt-2 text-3xl font-bold text-white">
                {alertCount}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

          </div>

        </div>

      </section>


      {/* LISTE */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="flex flex-col gap-4 border-b border-zinc-800 p-5 md:flex-row md:items-center md:justify-between">

          <div>

            <h2 className="font-semibold text-white">
              Zones géographiques
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Liste des zones configurées
            </p>

          </div>

          <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">

            <Search className="h-4 w-4 text-zinc-500" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600 md:w-64"
            />

          </div>

        </div>


        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[850px] text-left">

            <thead className="border-b border-zinc-800 bg-zinc-900/50">

              <tr>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Géozone
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Type
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Localisation
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Véhicules
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Alertes
                </th>

                <th className="px-5 py-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  État
                </th>

                <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Actions
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-zinc-800">

              {filteredGeozones.map((zone) => (

                <tr
                  key={zone.id}
                  className="transition hover:bg-zinc-900/60"
                >

                  {/* GEozone */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-3">

                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                        <Globe className="h-4 w-4 text-cyan-400" />
                      </div>

                      <div>

                        <p className="text-sm font-medium text-white">
                          {zone.name}
                        </p>

                        <p className="text-xs text-zinc-600">
                          Zone #
                          {zone.id
                            .toString()
                            .padStart(3, "0")}
                        </p>

                      </div>

                    </div>

                  </td>


                  {/* TYPE */}

                  <td className="px-5 py-4">

                    <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                      {zone.type}
                    </span>

                  </td>


                  {/* LOCALISATION */}

                  <td className="px-5 py-4">

                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <MapPin className="h-4 w-4 text-zinc-600" />
                      {zone.location}
                    </div>

                  </td>


                  {/* VEHICULES */}

                  <td className="px-5 py-4 text-sm text-zinc-300">
                    {zone.vehicles}
                  </td>


                  {/* ALERTES */}

                  <td className="px-5 py-4">

                    <span
                      className={`text-sm font-medium ${
                        zone.alerts > 0
                          ? "text-red-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {zone.alerts}
                    </span>

                  </td>


                  {/* ETAT */}

                  <td className="px-5 py-4">

                    <button
                      type="button"
                      onClick={() =>
                        toggleStatus(zone)
                      }
                      title="Changer l'état"
                    >

                      {zone.status === "active" ? (

                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>

                      ) : (

                        <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                          Inactive
                        </span>

                      )}

                    </button>

                  </td>


                  {/* ACTIONS */}

                  <td className="px-5 py-4">

                    <div className="flex justify-end gap-2">

                      <button
                        type="button"
                        title="Modifier"
                        onClick={() =>
                          openEditForm(zone)
                        }
                        className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        title="Supprimer"
                        onClick={() =>
                          handleDelete(zone)
                        }
                        className="rounded-lg border border-zinc-800 p-2 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {filteredGeozones.length === 0 && (

          <div className="p-12 text-center">

            <Globe className="mx-auto h-10 w-10 text-zinc-700" />

            <p className="mt-3 text-sm text-zinc-500">
              Aucune géozone trouvée.
            </p>

          </div>

        )}

      </section>


      {/* BANDEAU DEMO */}

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-center text-xs text-cyan-400">
        Mode démonstration — les géozones affichées sont
        fictives. Les modifications sont conservées pendant la
        session.
      </div>

    </div>
  );
}