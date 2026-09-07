"use client";

import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft,
  Truck,
  User,
  MapPin,
  Gauge,
  Fuel,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Route,
  Wrench,
  Wifi,
  Navigation,
} from "lucide-react";

const vehicles = {
  "12345-A-6": {
    name: "Renault Express",
    registration: "12345-A-6",
    driver: "Ahmed Benali",
    status: "En ligne",
    location: "Casablanca",
    speed: 62,
    fuel: 78,
    battery: 94,
    mileage: "84 520 km",
    lastUpdate: "Il y a 12 secondes",
    alert: "Aucune",
    tracker: "Connecté",
    latitude: "33.5731",
    longitude: "-7.5898",
  },
  "67890-B-7": {
    name: "Ford Transit",
    registration: "67890-B-7",
    driver: "Youssef Karim",
    status: "En ligne",
    location: "Rabat",
    speed: 48,
    fuel: 54,
    battery: 88,
    mileage: "62 340 km",
    lastUpdate: "Il y a 8 secondes",
    alert: "Carburant faible",
    tracker: "Connecté",
    latitude: "34.0209",
    longitude: "-6.8416",
  },
  "24680-C-8": {
    name: "Dacia Dokker",
    registration: "24680-C-8",
    driver: "Samir El Idrissi",
    status: "Arrêté",
    location: "Tanger",
    speed: 0,
    fuel: 91,
    battery: 96,
    mileage: "51 280 km",
    lastUpdate: "Il y a 25 secondes",
    alert: "Aucune",
    tracker: "Connecté",
    latitude: "35.7595",
    longitude: "-5.8340",
  },
  "13579-D-9": {
    name: "Peugeot Partner",
    registration: "13579-D-9",
    driver: "Omar Alaoui",
    status: "En ligne",
    location: "Marrakech",
    speed: 71,
    fuel: 66,
    battery: 91,
    mileage: "93 710 km",
    lastUpdate: "Il y a 6 secondes",
    alert: "Excès de vitesse",
    tracker: "Connecté",
    latitude: "31.6295",
    longitude: "-7.9811",
  },
  "97531-E-4": {
    name: "Citroën Berlingo",
    registration: "97531-E-4",
    driver: "Karim Amrani",
    status: "Hors ligne",
    location: "Fès",
    speed: 0,
    fuel: 42,
    battery: 72,
    mileage: "71 450 km",
    lastUpdate: "Il y a 18 minutes",
    alert: "Connexion perdue",
    tracker: "Déconnecté",
    latitude: "34.0331",
    longitude: "-5.0003",
  },
} as const;

type Vehicle = (typeof vehicles)[keyof typeof vehicles];

function getVehicle(registration: string): Vehicle | null {
  return vehicles[registration as keyof typeof vehicles] ?? null;
}

export default function DemoVehicleDetailsPage({
  params,
}: {
  params: Promise<{ registration: string }>;
}) {
  const { registration } = use(params);

  const vehicle = getVehicle(decodeURIComponent(registration));

  if (!vehicle) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Truck className="mx-auto h-12 w-12 text-slate-600" />

          <h1 className="mt-4 text-2xl font-bold text-white">
            Véhicule introuvable
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Ce véhicule n'existe pas dans les données de démonstration.
          </p>

          <Link
            href="/demo/vehicles"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux véhicules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-start gap-4">

          <Link
            href="/demo/vehicles"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>

            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />

              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Mode démonstration
              </span>
            </div>

            <h1 className="text-3xl font-bold text-white">
              {vehicle.name}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Fiche détaillée du véhicule • {vehicle.registration}
            </p>

          </div>

        </div>

        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
            vehicle.status === "En ligne"
              ? "bg-emerald-500/10 text-emerald-400"
              : vehicle.status === "Arrêté"
              ? "bg-amber-500/10 text-amber-400"
              : "bg-slate-700 text-slate-400"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {vehicle.status}
        </div>

      </div>

      {/* INFORMATIONS PRINCIPALES */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <Gauge className="h-5 w-5 text-blue-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Vitesse actuelle
              </p>

              <p className="text-2xl font-bold text-white">
                {vehicle.speed} km/h
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <Fuel className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Carburant
              </p>

              <p className="text-2xl font-bold text-white">
                {vehicle.fuel}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Battery className="h-5 w-5 text-emerald-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Batterie
              </p>

              <p className="text-2xl font-bold text-white">
                {vehicle.battery}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
              <Route className="h-5 w-5 text-purple-400" />
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Kilométrage
              </p>

              <p className="text-2xl font-bold text-white">
                {vehicle.mileage}
              </p>
            </div>
          </div>
        </div>

      </section>

      {/* INFORMATIONS VEHICULE */}

      <section className="grid gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Truck className="h-5 w-5 text-blue-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Informations du véhicule
              </h2>

              <p className="text-xs text-slate-500">
                Données de démonstration
              </p>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">

            <div>
              <p className="text-xs text-slate-500">
                Véhicule
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {vehicle.name}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Immatriculation
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {vehicle.registration}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Conducteur
              </p>

              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />

                <p className="text-sm font-medium text-white">
                  {vehicle.driver}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Position
              </p>

              <div className="mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-400" />

                <p className="text-sm font-medium text-white">
                  {vehicle.location}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Dernière mise à jour
              </p>

              <div className="mt-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />

                <p className="text-sm font-medium text-white">
                  {vehicle.lastUpdate}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Tracker GPS
              </p>

              <div className="mt-1 flex items-center gap-2">
                <Wifi className="h-4 w-4 text-emerald-400" />

                <p
                  className={`text-sm font-medium ${
                    vehicle.tracker === "Connecté"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {vehicle.tracker}
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* ALERTE */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                État des alertes
              </h2>

              <p className="text-xs text-slate-500">
                Surveillance du véhicule
              </p>
            </div>
          </div>

          {vehicle.alert === "Aucune" ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />

              <p className="mt-3 font-medium text-emerald-400">
                Aucune alerte active
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Le véhicule fonctionne normalement.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
              <AlertTriangle className="h-7 w-7 text-red-400" />

              <p className="mt-3 font-medium text-red-400">
                {vehicle.alert}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Une intervention peut être nécessaire.
              </p>
            </div>
          )}

        </div>

      </section>

      {/* CARTE */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="mb-5 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <Navigation className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Position du véhicule
              </h2>

              <p className="text-xs text-slate-500">
                Localisation GPS de démonstration
              </p>
            </div>

          </div>

          <span className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-400">
            {vehicle.location}
          </span>

        </div>

        <div className="flex h-[320px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950">

          <div className="text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10">
              <MapPin className="h-7 w-7 text-cyan-400" />
            </div>

            <p className="mt-4 font-medium text-white">
              {vehicle.location}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Latitude : {vehicle.latitude}
            </p>

            <p className="text-xs text-slate-500">
              Longitude : {vehicle.longitude}
            </p>

            <Link
              href="/demo/map"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-cyan-700"
            >
              <MapPin className="h-4 w-4" />
              Voir sur la carte
            </Link>

          </div>

        </div>

      </section>

      {/* ACTIVITE */}

      <section className="grid gap-6 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Activité récente
              </h2>

              <p className="text-xs text-slate-500">
                Historique fictif
              </p>
            </div>
          </div>

          <div className="space-y-4">

            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />

              <div>
                <p className="text-sm text-white">
                  Véhicule connecté
                </p>

                <p className="text-xs text-slate-500">
                  Il y a 12 secondes
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />

              <div>
                <p className="text-sm text-white">
                  Position mise à jour
                </p>

                <p className="text-xs text-slate-500">
                  Il y a 30 secondes
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-blue-400" />

              <div>
                <p className="text-sm text-white">
                  Trajet en cours
                </p>

                <p className="text-xs text-slate-500">
                  Il y a 2 minutes
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* MAINTENANCE */}

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Wrench className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <h2 className="font-semibold text-white">
                Maintenance
              </h2>

              <p className="text-xs text-slate-500">
                État préventif
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-sm font-medium text-white">
                  Prochaine maintenance
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Révision générale
                </p>
              </div>

              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                Dans 2 450 km
              </span>

            </div>

          </div>

          <Link
            href="/demo/maintenance"
            className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-blue-400 transition hover:text-blue-300"
          >
            Voir la maintenance
            <ArrowLeft className="h-3 w-3 rotate-180" />
          </Link>

        </div>

      </section>

      {/* RETOUR */}

      <div className="flex justify-center pb-4">

        <Link
          href="/demo/vehicles"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la flotte
        </Link>

      </div>

    </div>
  );
}