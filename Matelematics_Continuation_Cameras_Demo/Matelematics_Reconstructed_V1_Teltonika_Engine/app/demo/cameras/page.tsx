"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Play,
  Radio,
  Video,
} from "lucide-react";

type CameraMode = "live" | "recordings" | "alerts";

type Vehicle = {
  id: string;
  name: string;
  driver: string;
  location: string;
  liveVideo: string;
};

type VideoRecord = {
  id: number;
  vehicle: string;
  driver: string;
  location: string;
  time: string;
  type: string;
};

/* ========================================================= */
/* VEHICULES ET CHEMINS VIDEO LIVE                           */
/* ========================================================= */

const vehicles: Vehicle[] = [
  {
    id: "renault-express",
    name: "Renault Express",
    driver: "Ahmed Benali",
    location: "Casablanca",
    liveVideo: "/demo/cameras/renault-express/live.mp4",
  },
  {
    id: "ford-transit",
    name: "Ford Transit",
    driver: "Youssef Karim",
    location: "Rabat",
    liveVideo: "/demo/cameras/ford-transit/live.mp4",
  },
  {
    id: "dacia-dokker",
    name: "Dacia Dokker",
    driver: "Samir El Idrissi",
    location: "Tanger",
    liveVideo: "/demo/cameras/dacia-dokker/live.mp4",
  },
  {
    id: "peugeot-partner",
    name: "Peugeot Partner",
    driver: "Omar Alaoui",
    location: "Marrakech",
    liveVideo: "/demo/cameras/peugeot-partner/live.mp4",
  },
];

/* ========================================================= */
/* ENREGISTREMENTS                                            */
/* ========================================================= */

const recordings: VideoRecord[] = [
  {
    id: 1,
    vehicle: "Renault Express",
    driver: "Ahmed Benali",
    location: "Casablanca",
    time: "08:42",
    type: "Trajet enregistré",
  },
  {
    id: 2,
    vehicle: "Ford Transit",
    driver: "Youssef Karim",
    location: "Rabat",
    time: "10:15",
    type: "Trajet enregistré",
  },
  {
    id: 3,
    vehicle: "Dacia Dokker",
    driver: "Samir El Idrissi",
    location: "Tanger",
    time: "12:31",
    type: "Trajet enregistré",
  },
  {
    id: 4,
    vehicle: "Peugeot Partner",
    driver: "Omar Alaoui",
    location: "Marrakech",
    time: "15:08",
    type: "Trajet enregistré",
  },
];

/* ========================================================= */
/* ALERTES VIDEO                                             */
/* ========================================================= */

const videoAlerts: VideoRecord[] = [
  {
    id: 101,
    vehicle: "Renault Express",
    driver: "Ahmed Benali",
    location: "Casablanca",
    time: "09:14",
    type: "Excès de vitesse",
  },
  {
    id: 102,
    vehicle: "Ford Transit",
    driver: "Youssef Karim",
    location: "Rabat",
    time: "11:27",
    type: "Freinage brusque",
  },
  {
    id: 103,
    vehicle: "Dacia Dokker",
    driver: "Samir El Idrissi",
    location: "Tanger",
    time: "13:52",
    type: "Téléphone détecté",
  },
  {
    id: 104,
    vehicle: "Peugeot Partner",
    driver: "Omar Alaoui",
    location: "Marrakech",
    time: "17:06",
    type: "Somnolence détectée",
  },
];

/* ========================================================= */
/* DATES                                                      */
/* ========================================================= */

function getTodayString(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getOneYearAgoString(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ========================================================= */
/* PAGE                                                       */
/* ========================================================= */

export default function DemoCameraPage() {
  const today = useMemo(() => getTodayString(), []);
  const oneYearAgo = useMemo(() => getOneYearAgoString(), []);

  const [mode, setMode] = useState<CameraMode>("live");

  const [selectedVehicleId, setSelectedVehicleId] = useState(
    vehicles[0].id
  );

  const [selectedDate, setSelectedDate] = useState(today);

  const [videoError, setVideoError] = useState(false);

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ??
    vehicles[0];

  const currentVideoList =
    mode === "recordings" ? recordings : videoAlerts;

  /* ======================================================= */
  /* CHANGEMENT DE DATE                                      */
  /* ======================================================= */

  function changeDate(amount: number) {
    const current = new Date(`${selectedDate}T12:00:00`);

    current.setDate(current.getDate() + amount);

    const minimum = new Date(`${oneYearAgo}T12:00:00`);
    const maximum = new Date(`${today}T12:00:00`);

    if (current < minimum || current > maximum) {
      return;
    }

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    setSelectedDate(`${year}-${month}-${day}`);
  }

  /* ======================================================= */
  /* CHANGEMENT DE MODE                                      */
  /* ======================================================= */

  function selectMode(newMode: CameraMode) {
    setMode(newMode);
  }

  /* ======================================================= */
  /* CHANGEMENT VEHICULE                                     */
  /* ======================================================= */

  function selectVehicle(vehicleId: string) {
    setVideoError(false);
    setSelectedVehicleId(vehicleId);
  }

  /* ======================================================= */
  /* RENDU                                                     */
  /* ======================================================= */

  return (
    <div className="min-h-full space-y-6 bg-slate-950 text-white">

      {/* =================================================== */}
      {/* TITRE                                                */}
      {/* =================================================== */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
              <Camera className="h-6 w-6 text-cyan-400" />
            </div>

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <h1 className="text-2xl font-bold text-white">
                  Caméras embarquées
                </h1>

                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                  Démonstration
                </span>

              </div>

              <p className="mt-2 text-sm text-slate-400">
                Visualisez les caméras de vos véhicules et consultez
                leur historique vidéo.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">

            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

            <div>

              <p className="text-xs text-slate-500">
                Système caméra
              </p>

              <p className="text-sm font-semibold text-emerald-400">
                Opérationnel
              </p>

            </div>

          </div>

        </div>
      </section>

      {/* =================================================== */}
      {/* ONGLETS                                               */}
      {/* =================================================== */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-2">

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">

          <button
            type="button"
            onClick={() => selectMode("live")}
            className={`flex items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition ${
              mode === "live"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Radio className="h-4 w-4" />
            Vidéo en direct
          </button>

          <button
            type="button"
            onClick={() => selectMode("recordings")}
            className={`flex items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition ${
              mode === "recordings"
                ? "bg-cyan-500 text-slate-950"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Video className="h-4 w-4" />
            Enregistrements
          </button>

          <button
            type="button"
            onClick={() => selectMode("alerts")}
            className={`flex items-center justify-center gap-3 rounded-xl px-5 py-3.5 text-sm font-semibold transition ${
              mode === "alerts"
                ? "bg-red-500 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Alertes vidéo
          </button>

        </div>

      </section>

      {/* =================================================== */}
      {/* LIVE                                                   */}
      {/* =================================================== */}

      {mode === "live" && (
        <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">

          {/* LISTE VEHICULES */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">

            <div className="mb-4">

              <h2 className="font-semibold text-white">
                Véhicules
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Sélectionnez une caméra
              </p>

            </div>

            <div className="space-y-2">

              {vehicles.map((vehicle) => {

                const isSelected =
                  vehicle.id === selectedVehicleId;

                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() => selectVehicle(vehicle.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-cyan-500/40 bg-cyan-500/10"
                        : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-800"
                    }`}
                  >

                    <div className="flex items-center justify-between gap-3">

                      <div className="flex min-w-0 items-center gap-3">

                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? "bg-cyan-500/15 text-cyan-400"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          <Camera className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-medium text-white">
                            {vehicle.name}
                          </p>

                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            {vehicle.driver}
                          </p>

                        </div>

                      </div>

                      <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-emerald-400">

                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                        LIVE

                      </span>

                    </div>

                  </button>
                );
              })}

            </div>

          </div>

          {/* LECTEUR LIVE */}

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-black">

            <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />

                  <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                    En direct
                  </span>

                </div>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  {selectedVehicle.name}
                </h2>

                <p className="text-xs text-slate-500">
                  {selectedVehicle.location} •{" "}
                  {selectedVehicle.driver}
                </p>

              </div>

              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-400">

                <Radio className="h-3.5 w-3.5" />

                LIVE

              </div>

            </div>

            {/* ================================================= */}
            {/* VIDEO                                              */}
            {/* ================================================= */}

            <div className="relative aspect-video bg-black">

              {!videoError ? (
                <video
                  key={selectedVehicle.liveVideo}
                  src={selectedVehicle.liveVideo}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  preload="auto"
                  className="h-full w-full object-contain"
                  onError={() => setVideoError(true)}
                  onLoadedData={() => setVideoError(false)}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 px-6 text-center">

                  <Camera className="h-10 w-10 text-red-400" />

                  <p className="mt-4 text-sm font-semibold text-white">
                    Impossible de charger la vidéo
                  </p>

                  <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
                    Le lecteur n'arrive pas à accéder au fichier vidéo
                    de démonstration.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setVideoError(false);
                    }}
                    className="mt-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Réessayer
                  </button>

                </div>
              )}

              <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-sm">

                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  Caméra avant
                </p>

                <p className="mt-1 text-xs font-semibold text-white">
                  {selectedVehicle.name}
                </p>

              </div>

            </div>

            {/* INFORMATIONS */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-5 py-4">

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">

                <span className="flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5" />
                  Caméra avant
                </span>

                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {selectedVehicle.location}
                </span>

              </div>

              <span className="text-xs text-slate-600">
                Données de démonstration
              </span>

            </div>

          </div>

        </section>
      )}

      {/* =================================================== */}
      {/* ENREGISTREMENTS / ALERTES                            */}
      {/* =================================================== */}

      {(mode === "recordings" || mode === "alerts") && (
        <section className="space-y-6">

          {/* SELECTION DATE */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    mode === "alerts"
                      ? "bg-red-500/10"
                      : "bg-cyan-500/10"
                  }`}
                >

                  {mode === "alerts" ? (
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  ) : (
                    <CalendarDays className="h-5 w-5 text-cyan-400" />
                  )}

                </div>

                <div>

                  <h2 className="font-semibold text-white">
                    {mode === "recordings"
                      ? "Historique des enregistrements"
                      : "Historique des alertes vidéo"}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Consultez les données jusqu'à un an dans le passé.
                  </p>

                </div>

              </div>

              {/* CONTROLES DATE */}

              <div className="flex flex-wrap items-center gap-2">

                <button
                  type="button"
                  onClick={() => changeDate(-1)}
                  disabled={selectedDate === oneYearAgo}
                  title="Jour précédent"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* MENU DEROUlant DE DATE */}

                <select
                  value={selectedDate}
                  onChange={(event) =>
                    setSelectedDate(event.target.value)
                  }
                  className="h-10 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-cyan-500"
                >
                  {Array.from({ length: 366 }, (_, index) => {
                    const date = new Date(`${today}T12:00:00`);
                    date.setDate(date.getDate() - index);

                    const year = date.getFullYear();
                    const month = String(
                      date.getMonth() + 1
                    ).padStart(2, "0");
                    const day = String(
                      date.getDate()
                    ).padStart(2, "0");

                    const value = `${year}-${month}-${day}`;

                    if (value < oneYearAgo) {
                      return null;
                    }

                    return (
                      <option
                        key={value}
                        value={value}
                      >
                        {formatDisplayDate(value)}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="button"
                  onClick={() => changeDate(1)}
                  disabled={selectedDate === today}
                  title="Jour suivant"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  disabled={selectedDate === today}
                  className="h-10 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 text-xs font-semibold text-cyan-400 transition hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Aujourd'hui
                </button>

              </div>

            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">

              <CalendarDays className="h-3.5 w-3.5" />

              <span>
                Date sélectionnée :
              </span>

              <strong className="text-slate-300">
                {formatDisplayDate(selectedDate)}
              </strong>

              <span className="text-slate-700">
                •
              </span>

              <span>
                Historique disponible sur 12 mois
              </span>

            </div>

          </div>

          {/* TABLEAU */}

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

            <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h3 className="font-semibold text-white">
                  {mode === "recordings"
                    ? "Enregistrements vidéo"
                    : "Alertes vidéo"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {formatDisplayDate(selectedDate)}
                </p>

              </div>

              <span
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  mode === "alerts"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-cyan-500/10 text-cyan-400"
                }`}
              >
                {currentVideoList.length}{" "}
                {mode === "alerts"
                  ? "alertes"
                  : "enregistrements"}
              </span>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[760px]">

                <thead>

                  <tr className="border-b border-slate-800 bg-slate-950/70 text-left">

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Véhicule
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Conducteur
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Localisation
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Heure
                    </th>

                    <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Événement
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {currentVideoList.map((item) => (

                    <tr
                      key={item.id}
                      className="border-b border-slate-800/80 transition hover:bg-slate-800/40"
                    >

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-cyan-400">
                            <Camera className="h-4 w-4" />
                          </div>

                          <span className="text-sm font-medium text-white">
                            {item.vehicle}
                          </span>

                        </div>

                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {item.driver}
                      </td>

                      <td className="px-5 py-4">

                        <span className="flex items-center gap-2 text-sm text-slate-400">
                          <MapPin className="h-3.5 w-3.5 text-slate-600" />
                          {item.location}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <span className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock3 className="h-3.5 w-3.5 text-slate-500" />
                          {item.time}
                        </span>

                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            mode === "alerts"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-cyan-500/10 text-cyan-400"
                          }`}
                        >
                          {item.type}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-right">

                        <button
                          type="button"
                          onClick={() => {
                            window.alert(
                              `Démonstration : vidéo du ${formatDisplayDate(
                                selectedDate
                              )} à ${item.time} — ${item.vehicle}`
                            );
                          }}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:bg-slate-800 hover:text-cyan-400"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Regarder
                        </button>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

          {/* INFORMATION */}

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">

            <div className="flex gap-3">

              <Clock3
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  mode === "alerts"
                    ? "text-red-400"
                    : "text-cyan-400"
                }`}
              />

              <div>

                <p className="text-xs font-medium text-slate-300">
                  Historique vidéo
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Vous pouvez sélectionner n'importe quelle date
                  comprise entre aujourd'hui et les douze derniers
                  mois. Cette navigation concerne uniquement les
                  enregistrements et les alertes vidéo.
                </p>

              </div>

            </div>

          </div>

        </section>
      )}

    </div>
  );
}