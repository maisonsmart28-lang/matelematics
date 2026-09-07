"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileDown,
  FileText,
  Fuel,
  Loader2,
  Route,
  Truck,
} from "lucide-react";

import {
  supabase,
} from "../../../components/supabase";


type Vehicle = {
  id: string;
  company_id: string;
  name: string;
  registration: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  device_id: string | null;
  status: string;
};


function dateValue(
  date: Date
) {
  return date
    .toISOString()
    .slice(
      0,
      10
    );
}


export default function ExportReportPage() {
  const today =
    new Date();

  const monthAgo =
    new Date(
      Date.now() -
      30 *
      24 *
      60 *
      60 *
      1000
    );


  const [
    reportType,
    setReportType,
  ] =
    useState("fleet");

  const [
    vehicle,
    setVehicle,
  ] =
    useState("all");

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      dateValue(
        monthAgo
      )
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState(
      dateValue(
        today
      )
    );

  const [
    vehicles,
    setVehicles,
  ] =
    useState<Vehicle[]>([]);

  const [
    loadingVehicles,
    setLoadingVehicles,
  ] =
    useState(true);

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    generated,
    setGenerated,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );


  async function sessionToken() {
    const {
      data: {
        session,
      },
    } =
      await supabase.auth.getSession();

    if (!session) {
      throw new Error(
        "Votre session a expiré. Reconnectez-vous."
      );
    }

    return session.access_token;
  }


  useEffect(() => {
    let mounted =
      true;

    async function loadVehicles() {
      setLoadingVehicles(
        true
      );

      try {
        const token =
          await sessionToken();

        const response =
          await fetch(
            "/api/reports/pdf",
            {
              method: "GET",
              cache: "no-store",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload.error ??
            "Impossible de charger les véhicules."
          );
        }

        if (mounted) {
          setVehicles(
            payload.vehicles ??
            []
          );
        }
      } catch (cause) {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Erreur."
          );
        }
      } finally {
        if (mounted) {
          setLoadingVehicles(
            false
          );
        }
      }
    }

    void loadVehicles();

    return () => {
      mounted =
        false;
    };
  }, []);


  async function handleGenerate() {
    setGenerating(true);
    setGenerated(false);
    setError(null);

    try {
      const token =
        await sessionToken();

      const response =
        await fetch(
          "/api/reports/pdf",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                reportType,
                vehicle,
                startDate,
                endDate,
              }),
          }
        );


      if (!response.ok) {
        const payload =
          await response.json();

        throw new Error(
          payload.error ??
          "Impossible de générer le PDF."
        );
      }


      const blob =
        await response.blob();

      const disposition =
        response.headers.get(
          "content-disposition"
        );

      const match =
        disposition?.match(
          /filename="([^"]+)"/
        );

      const filename =
        match?.[1] ??
        `Matelematics_Rapport_${startDate}_${endDate}.pdf`;


      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        url;

      anchor.download =
        filename;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url
      );

      setGenerated(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Erreur pendant la génération."
      );
    } finally {
      setGenerating(false);
    }
  }


  return (
    <div className="mx-auto max-w-6xl space-y-8">

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div>

          <Link
            href="/dashboard/rapports"
            className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />

            Retour aux rapports
          </Link>

          <h1 className="text-3xl font-bold text-white">
            Exporter un rapport PDF
          </h1>

          <p className="mt-2 text-slate-400">
            Générez un vrai rapport PDF à partir des données
            télématiques auxquelles votre compte a accès.
          </p>

        </div>


        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
          <FileDown className="h-7 w-7 text-blue-400" />
        </div>

      </div>


      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}


      {generated && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">

          <CheckCircle2 className="h-5 w-5 text-emerald-400" />

          <div>

            <p className="font-medium text-emerald-300">
              Rapport PDF généré
            </p>

            <p className="text-sm text-emerald-400/80">
              Le téléchargement du fichier PDF a été lancé.
            </p>

          </div>

        </div>
      )}


      <section className="rounded-2xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-400" />
            </div>

            <div>

              <h2 className="font-semibold text-white">
                Type de rapport
              </h2>

              <p className="text-sm text-slate-400">
                Sélectionnez les informations à exporter.
              </p>

            </div>

          </div>

        </div>


        <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">

          <ReportButton
            active={
              reportType ===
              "fleet"
            }
            onClick={() =>
              setReportType(
                "fleet"
              )
            }
            icon={Truck}
            title="Rapport de flotte"
            text="Vue globale des véhicules, états, vitesses et activité GPS."
          />

          <ReportButton
            active={
              reportType ===
              "trips"
            }
            onClick={() =>
              setReportType(
                "trips"
              )
            }
            icon={Route}
            title="Activité GPS"
            text="Positions, distance GPS calculée et période d'activité."
          />

          <ReportButton
            active={
              reportType ===
              "fuel"
            }
            onClick={() =>
              setReportType(
                "fuel"
              )
            }
            icon={Fuel}
            title="Télémétrie / carburant"
            text="Télémétrie disponible. Les métriques carburant seront enrichies via CAN/IO."
          />

          <ReportButton
            active={
              reportType ===
              "alerts"
            }
            onClick={() =>
              setReportType(
                "alerts"
              )
            }
            icon={
              AlertTriangle
            }
            title="Alertes"
            text="Incidents et alertes réellement enregistrés sur la période."
          />

        </div>

      </section>


      <section className="rounded-2xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 p-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <BarChart3 className="h-5 w-5 text-purple-400" />
            </div>

            <div>

              <h2 className="font-semibold text-white">
                Paramètres du rapport
              </h2>

              <p className="text-sm text-slate-400">
                Définissez la période et le véhicule concernés.
              </p>

            </div>

          </div>

        </div>


        <div className="grid gap-6 p-6 md:grid-cols-2">

          <div>

            <label
              htmlFor="vehicle"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Véhicule
            </label>

            <select
              id="vehicle"
              value={vehicle}
              disabled={
                loadingVehicles
              }
              onChange={(
                event
              ) =>
                setVehicle(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 disabled:opacity-50"
            >

              <option value="all">
                Toute la flotte
              </option>

              {vehicles.map(
                (item) => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {
                      item.registration
                    }
                    {" - "}
                    {
                      item.name
                    }
                  </option>
                )
              )}

            </select>

            {loadingVehicles && (
              <p className="mt-2 text-xs text-slate-500">
                Chargement des véhicules autorisés...
              </p>
            )}

          </div>


          <div>

            <label className="mb-2 block text-sm font-medium text-slate-300">
              Format
            </label>

            <div className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-white">
              PDF
            </div>

          </div>


          <div>

            <label
              htmlFor="startDate"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Date de début
            </label>

            <div className="relative">

              <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                id="startDate"
                type="date"
                value={
                  startDate
                }
                onChange={(
                  event
                ) =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-blue-500"
              />

            </div>

          </div>


          <div>

            <label
              htmlFor="endDate"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Date de fin
            </label>

            <div className="relative">

              <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                id="endDate"
                type="date"
                value={
                  endDate
                }
                onChange={(
                  event
                ) =>
                  setEndDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-blue-500"
              />

            </div>

          </div>

        </div>

      </section>


      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <h2 className="mb-5 font-semibold text-white">
          Résumé de l'export
        </h2>

        <div className="grid gap-4 md:grid-cols-4">

          <Summary
            label="Rapport"
            value={
              reportType ===
                "fleet"
                ? "Flotte"
                : reportType ===
                    "trips"
                  ? "Activité GPS"
                  : reportType ===
                      "fuel"
                    ? "Télémétrie"
                    : "Alertes"
            }
          />

          <Summary
            label="Véhicule"
            value={
              vehicle ===
                "all"
                ? "Toute la flotte"
                : vehicles.find(
                    (item) =>
                      item.id ===
                      vehicle
                  )
                    ?.registration ??
                  vehicle
            }
          />

          <Summary
            label="Période"
            value={
              `${startDate} - ${endDate}`
            }
          />

          <Summary
            label="Format"
            value="PDF"
          />

        </div>

      </section>


      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

        <Link
          href="/dashboard/rapports"
          className="rounded-xl border border-slate-700 px-6 py-3 text-center text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          Annuler
        </Link>

        <button
          type="button"
          disabled={
            generating ||
            loadingVehicles
          }
          onClick={() =>
            void handleGenerate()
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >

          {generating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileDown className="h-5 w-5" />
          )}

          {generating
            ? "Génération du PDF..."
            : "Générer le rapport PDF"}

        </button>

      </div>

    </div>
  );
}


function ReportButton({
  active,
  onClick,
  icon: Icon,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  icon:
    typeof Truck;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-5 text-left transition ${
        active
          ? "border-blue-500 bg-blue-500/10"
          : "border-slate-700 bg-slate-950 hover:border-slate-600"
      }`}
    >

      <Icon
        className={`mb-4 h-6 w-6 ${
          active
            ? "text-blue-400"
            : "text-slate-400"
        }`}
      />

      <h3 className="font-medium text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-5 text-slate-400">
        {text}
      </p>

    </button>
  );
}


function Summary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-950 p-4">

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-medium text-white">
        {value}
      </p>

    </div>
  );
}