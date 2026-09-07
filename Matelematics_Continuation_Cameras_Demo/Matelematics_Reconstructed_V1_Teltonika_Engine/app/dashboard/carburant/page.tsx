"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  Car,
  Droplets,
  Fuel,
  Gauge,
  MapPin,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  CheckCircle2,
} from "lucide-react";

type FuelStatus = "Normal" | "Faible" | "Critique";

type VehicleFuel = {
  id: number;
  vehicle: string;
  registration: string;
  type: string;
  fuel: number;
  consumption: number;
  distance: number;
  fuelUsed: number;
  lastRefuel: string;
  location: string;
  status: FuelStatus;
};

const vehicles: VehicleFuel[] = [
  {
    id: 1,
    vehicle: "Ford Transit Custom",
    registration: "12345-A-6",
    type: "Utilitaire",
    fuel: 78,
    consumption: 8.4,
    distance: 184,
    fuelUsed: 15.5,
    lastRefuel: "Aujourd'hui, 08:42",
    location: "Casablanca",
    status: "Normal",
  },
  {
    id: 2,
    vehicle: "Renault Express",
    registration: "45678-B-7",
    type: "Fourgon",
    fuel: 54,
    consumption: 7.1,
    distance: 126,
    fuelUsed: 8.9,
    lastRefuel: "Hier, 17:20",
    location: "Aïn Sebaâ",
    status: "Normal",
  },
  {
    id: 3,
    vehicle: "Dacia Dokker",
    registration: "78912-C-8",
    type: "Utilitaire",
    fuel: 19,
    consumption: 9.2,
    distance: 74,
    fuelUsed: 6.8,
    lastRefuel: "Il y a 3 jours",
    location: "Mohammedia",
    status: "Faible",
  },
  {
    id: 4,
    vehicle: "Peugeot Partner",
    registration: "32145-D-9",
    type: "Fourgon",
    fuel: 8,
    consumption: 10.1,
    distance: 241,
    fuelUsed: 24.3,
    lastRefuel: "Il y a 5 jours",
    location: "Bouskoura",
    status: "Critique",
  },
  {
    id: 5,
    vehicle: "Ford Ranger",
    registration: "65432-E-10",
    type: "Pick-up",
    fuel: 67,
    consumption: 11.4,
    distance: 198,
    fuelUsed: 22.6,
    lastRefuel: "Hier, 09:15",
    location: "Casablanca",
    status: "Normal",
  },
];

function FuelStatusBadge({ status }: { status: FuelStatus }) {
  if (status === "Normal") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Normal
      </span>
    );
  }

  if (status === "Faible") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        Niveau faible
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      Critique
    </span>
  );
}

function FuelBar({ value }: { value: number }) {
  const barColor =
    value <= 15
      ? "bg-red-500"
      : value <= 30
        ? "bg-amber-500"
        : "bg-emerald-500";

  const textColor =
    value <= 15
      ? "text-red-400"
      : value <= 30
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <div className="w-full min-w-[150px]">
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-semibold ${textColor}`}>
          {value}%
        </span>

        <span className="text-xs text-slate-600">
          réservoir
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function CarburantPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Tous" | FuelStatus>("Tous");

  // Contrôle de l'ouverture de la fenêtre des alertes
  const [showAlerts, setShowAlerts] = useState(false);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        vehicle.vehicle.toLowerCase().includes(searchValue) ||
        vehicle.registration.toLowerCase().includes(searchValue) ||
        vehicle.location.toLowerCase().includes(searchValue);

      const matchesFilter =
        filter === "Tous" || vehicle.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const averageFuel = Math.round(
    vehicles.reduce((sum, vehicle) => sum + vehicle.fuel, 0) /
      vehicles.length
  );

  const totalDistance = vehicles.reduce(
    (sum, vehicle) => sum + vehicle.distance,
    0
  );

  const totalFuelUsed = vehicles.reduce(
    (sum, vehicle) => sum + vehicle.fuelUsed,
    0
  );

  const averageConsumption =
    vehicles.reduce(
      (sum, vehicle) => sum + vehicle.consumption,
      0
    ) / vehicles.length;

  const lowFuelVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "Faible"
  ).length;

  const criticalVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "Critique"
  ).length;

  // Tous les véhicules nécessitant une attention
  const alertVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.status === "Faible" ||
      vehicle.status === "Critique"
  );

  return (
    <>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <Fuel className="h-6 w-6 text-cyan-400" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-white">
                Gestion du carburant
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Surveillez la consommation et le niveau de carburant de votre flotte.
              </p>
            </div>

          </div>

        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Niveau moyen */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Niveau moyen
              </span>

              <Droplets className="h-5 w-5 text-cyan-400" />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {averageFuel}%
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{ width: `${averageFuel}%` }}
              />
            </div>

          </div>

          {/* Consommation */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Consommation moyenne
              </span>

              <Gauge className="h-5 w-5 text-blue-400" />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {averageConsumption.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-slate-500">
                L/100 km
              </span>
            </p>

            <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
              <TrendingDown className="h-3.5 w-3.5" />
              Optimisation en cours
            </div>

          </div>

          {/* Distance */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Distance parcourue
              </span>

              <MapPin className="h-5 w-5 text-violet-400" />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {totalDistance}
              <span className="ml-1 text-sm font-normal text-slate-500">
                km
              </span>
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Depuis le dernier relevé
            </p>

          </div>

          {/* Carburant consommé */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Carburant consommé
              </span>

              <Fuel className="h-5 w-5 text-orange-400" />
            </div>

            <p className="mt-3 text-3xl font-bold text-white">
              {totalFuelUsed.toFixed(1)}
              <span className="ml-1 text-sm font-normal text-slate-500">
                L
              </span>
            </p>

            <p className="mt-2 flex items-center gap-1 text-xs text-orange-400">
              <ArrowDown className="h-3.5 w-3.5" />
              Consommation estimée
            </p>

          </div>

        </div>

        {/* ALERTES CARBURANT */}
        {(lowFuelVehicles > 0 || criticalVehicles > 0) && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              <div className="flex gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>

                <div>
                  <h2 className="font-medium text-white">
                    Attention au niveau de carburant
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {criticalVehicles > 0 && (
                      <>
                        {criticalVehicles} véhicule
                        {criticalVehicles > 1 ? "s" : ""} en niveau critique.
                      </>
                    )}

                    {lowFuelVehicles > 0 && (
                      <>
                        {" "}
                        {lowFuelVehicles} véhicule
                        {lowFuelVehicles > 1 ? "s" : ""} avec un niveau faible.
                      </>
                    )}
                  </p>
                </div>

              </div>

              {/* BOUTON FONCTIONNEL */}
              <button
                type="button"
                onClick={() => setShowAlerts(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-500/10 hover:text-amber-300"
              >
                <AlertTriangle className="h-4 w-4" />
                Voir les alertes
              </button>

            </div>

          </div>
        )}

        {/* ANALYSE */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 lg:col-span-2">

            <div className="flex items-center justify-between">

              <div>
                <h2 className="font-semibold text-white">
                  Performance carburant
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Comparaison de la consommation des véhicules
                </p>
              </div>

              <TrendingUp className="h-5 w-5 text-cyan-400" />

            </div>

            <div className="mt-6 space-y-5">

              {vehicles.slice(0, 4).map((vehicle) => {

                const percentage = Math.min(
                  100,
                  (vehicle.consumption / 12) * 100
                );

                return (
                  <div key={vehicle.id}>

                    <div className="mb-2 flex items-center justify-between">

                      <div className="flex items-center gap-2">

                        <Car className="h-4 w-4 text-slate-500" />

                        <span className="text-sm text-slate-300">
                          {vehicle.vehicle}
                        </span>

                      </div>

                      <span className="text-sm font-medium text-white">
                        {vehicle.consumption.toFixed(1)} L/100 km
                      </span>

                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                      <div
                        className={`h-full rounded-full ${
                          vehicle.consumption >= 10
                            ? "bg-red-500"
                            : vehicle.consumption >= 8.5
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />

                    </div>

                  </div>
                );
              })}

            </div>

          </div>

          {/* ETAT DE LA FLOTTE */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                <Fuel className="h-5 w-5 text-cyan-400" />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  État de la flotte
                </h2>

                <p className="text-xs text-slate-500">
                  Niveau actuel
                </p>
              </div>

            </div>

            <div className="mt-6 space-y-4">

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-sm text-slate-400">
                  Niveau normal
                </span>

                <span className="font-semibold text-emerald-400">
                  {vehicles.filter((v) => v.status === "Normal").length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-sm text-slate-400">
                  Niveau faible
                </span>

                <span className="font-semibold text-amber-400">
                  {lowFuelVehicles}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
                <span className="text-sm text-slate-400">
                  Niveau critique
                </span>

                <span className="font-semibold text-red-400">
                  {criticalVehicles}
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-5">

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              <div>
                <h2 className="font-semibold text-white">
                  Suivi des véhicules
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Niveau et consommation de carburant
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">

                <div className="relative">

                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher un véhicule..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500 sm:w-64"
                  />

                </div>

                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as "Tous" | FuelStatus)
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-500"
                >
                  <option value="Tous">Tous</option>
                  <option value="Normal">Normal</option>
                  <option value="Faible">Faible</option>
                  <option value="Critique">Critique</option>
                </select>

              </div>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="border-b border-slate-800 bg-slate-950/50">

                <tr>

                  <th className="px-5 py-4 font-medium text-slate-400">
                    Véhicule
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-400">
                    Carburant
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-400">
                    Consommation
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-400">
                    Distance
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-400">
                    Dernier plein
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-400">
                    Position
                  </th>

                  <th className="px-5 py-4 font-medium text-slate-400">
                    État
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-800">

                {filteredVehicles.map((vehicle) => (

                  <tr
                    key={vehicle.id}
                    className="transition hover:bg-slate-800/30"
                  >

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-3">

                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
                          <Car className="h-5 w-5 text-cyan-400" />
                        </div>

                        <div>
                          <p className="font-medium text-white">
                            {vehicle.vehicle}
                          </p>

                          <p className="text-xs text-slate-500">
                            {vehicle.registration}
                          </p>
                        </div>

                      </div>

                    </td>

                    <td className="px-5 py-5">
                      <FuelBar value={vehicle.fuel} />
                    </td>

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-2">

                        {vehicle.consumption >= 10 ? (
                          <TrendingUp className="h-4 w-4 text-red-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-emerald-400" />
                        )}

                        <span className="text-slate-300">
                          {vehicle.consumption.toFixed(1)} L/100 km
                        </span>

                      </div>

                    </td>

                    <td className="px-5 py-5 text-slate-300">
                      {vehicle.distance} km
                    </td>

                    <td className="px-5 py-5">

                      <p className="text-slate-300">
                        {vehicle.lastRefuel}
                      </p>

                      <p className="mt-1 text-xs text-slate-600">
                        {vehicle.fuelUsed.toFixed(1)} L consommés
                      </p>

                    </td>

                    <td className="px-5 py-5">

                      <div className="flex items-center gap-2 text-slate-300">

                        <MapPin className="h-4 w-4 text-slate-500" />

                        {vehicle.location}

                      </div>

                    </td>

                    <td className="px-5 py-5">
                      <FuelStatusBadge status={vehicle.status} />
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          {filteredVehicles.length === 0 && (
            <div className="p-12 text-center">

              <Fuel className="mx-auto h-10 w-10 text-slate-700" />

              <p className="mt-3 font-medium text-slate-300">
                Aucun véhicule trouvé
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Modifiez votre recherche ou votre filtre.
              </p>

            </div>
          )}

        </div>

        {/* NOTE */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">

          <div className="flex gap-3">

            <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />

            <div>

              <p className="text-sm font-medium text-white">
                Données carburant
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Les données affichées sont actuellement des données de
                démonstration. Ce module pourra ensuite être connecté aux
                données réelles des véhicules et aux paramètres CAN/OBD de
                votre flotte.
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* MODALE DES ALERTES */}
      {/* ========================================================= */}

      {showAlerts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowAlerts(false);
            }
          }}
        >

          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            {/* HEADER MODALE */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>

                <div>
                  <h2 className="font-semibold text-white">
                    Alertes carburant
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {alertVehicles.length} véhicule
                    {alertVehicles.length > 1 ? "s" : ""} nécessite
                    {alertVehicles.length > 1 ? "nt" : ""} votre attention
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setShowAlerts(false)}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

            </div>

            {/* CONTENU */}
            <div className="max-h-[65vh] overflow-y-auto p-5">

              <div className="space-y-3">

                {alertVehicles.map((vehicle) => {

                  const isCritical = vehicle.status === "Critique";

                  return (
                    <div
                      key={vehicle.id}
                      className={`rounded-xl border p-4 ${
                        isCritical
                          ? "border-red-500/20 bg-red-500/5"
                          : "border-amber-500/20 bg-amber-500/5"
                      }`}
                    >

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        {/* VEHICULE */}
                        <div className="flex items-center gap-3">

                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                              isCritical
                                ? "bg-red-500/10"
                                : "bg-amber-500/10"
                            }`}
                          >
                            <Car
                              className={`h-5 w-5 ${
                                isCritical
                                  ? "text-red-400"
                                  : "text-amber-400"
                              }`}
                            />
                          </div>

                          <div>
                            <p className="font-medium text-white">
                              {vehicle.vehicle}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {vehicle.registration} · {vehicle.location}
                            </p>
                          </div>

                        </div>

                        {/* NIVEAU */}
                        <div className="sm:text-right">

                          <p
                            className={`text-2xl font-bold ${
                              isCritical
                                ? "text-red-400"
                                : "text-amber-400"
                            }`}
                          >
                            {vehicle.fuel}%
                          </p>

                          <p className="text-xs text-slate-500">
                            niveau carburant
                          </p>

                        </div>

                      </div>

                      {/* BARRE */}
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

                        <div
                          className={`h-full rounded-full ${
                            isCritical
                              ? "bg-red-500"
                              : "bg-amber-500"
                          }`}
                          style={{
                            width: `${vehicle.fuel}%`,
                          }}
                        />

                      </div>

                      {/* INFOS */}
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">

                        <span>
                          Consommation :{" "}
                          <strong className="font-medium text-slate-300">
                            {vehicle.consumption.toFixed(1)} L/100 km
                          </strong>
                        </span>

                        <span>
                          Position :{" "}
                          <strong className="font-medium text-slate-300">
                            {vehicle.location}
                          </strong>
                        </span>

                        <span>
                          Dernier plein :{" "}
                          <strong className="font-medium text-slate-300">
                            {vehicle.lastRefuel}
                          </strong>
                        </span>

                      </div>

                      <div className="mt-4 flex items-center justify-between">

                        <FuelStatusBadge status={vehicle.status} />

                        <button
                          type="button"
                          onClick={() => {
                            setSearch(vehicle.registration);
                            setFilter(vehicle.status);
                            setShowAlerts(false);
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                          Voir le véhicule
                        </button>

                      </div>

                    </div>
                  );
                })}

              </div>

              {/* AUCUNE ALERTE */}
              {alertVehicles.length === 0 && (
                <div className="py-10 text-center">

                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />

                  <p className="mt-3 font-medium text-white">
                    Aucune alerte carburant
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Tous les véhicules disposent d'un niveau de carburant
                    normal.
                  </p>

                </div>
              )}

            </div>

            {/* FOOTER */}
            <div className="flex justify-end border-t border-slate-800 bg-slate-950/40 p-4">

              <button
                type="button"
                onClick={() => setShowAlerts(false)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
              >
                Fermer
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}