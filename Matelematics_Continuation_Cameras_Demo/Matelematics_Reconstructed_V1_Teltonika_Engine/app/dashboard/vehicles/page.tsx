"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CircleAlert,
  MoreHorizontal,
  Plus,
  Truck,
  Wifi,
  X,
} from "lucide-react";

import type {
  DemoVehicle,
} from "../../../lib/demo-fleet";

import {
  useDashboardAccess,
} from "../DashboardAccessContext";


function StatusBadge({
  status,
}: {
  status: string;
}) {
  const active =
    status === "En ligne" ||
    status === "En mouvement";

  const offline =
    status === "Hors ligne";

  const styles = active
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
    : offline
      ? "border-slate-700 bg-slate-800 text-slate-400"
      : "border-orange-500/20 bg-orange-500/10 text-orange-400";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}


export default function VehiclesPage() {
  const {
    canCreate,
  } = useDashboardAccess();


  const [
    vehicles,
    setVehicles,
  ] =
    useState<DemoVehicle[]>([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    showAddVehicle,
    setShowAddVehicle,
  ] =
    useState(false);


  const [
    formError,
    setFormError,
  ] =
    useState<string | null>(
      null,
    );


  const [
    newVehicle,
    setNewVehicle,
  ] =
    useState({
      name: "",
      registration: "",
      companyName: "",
      deviceModel: "FMC125",
      trackerImei: "",
      driver: "",
    });


  const loadVehicles =
    async () => {
      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/vehicles",
            {
              cache:
                "no-store",
            },
          );

        if (
          response.ok
        ) {
          const payload =
            (await response.json()) as {
              vehicles:
                DemoVehicle[];
            };

          setVehicles(
            payload.vehicles,
          );
        }
      } finally {
        setLoading(false);
      }
    };


  useEffect(() => {
    const timer =
      window.setTimeout(
        () =>
          void loadVehicles(),
        0,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, []);


  const metrics =
    useMemo(
      () => ({
        total:
          vehicles.length,

        active:
          vehicles.filter(
            (vehicle) =>
              vehicle.status ===
                "En ligne" ||
              vehicle.status ===
                "En mouvement",
          ).length,

        stopped:
          vehicles.filter(
            (vehicle) =>
              vehicle.status ===
              "À l'arrêt",
          ).length,

        offline:
          vehicles.filter(
            (vehicle) =>
              vehicle.status ===
              "Hors ligne",
          ).length,
      }),
      [vehicles],
    );


  function resetAddForm() {
    setNewVehicle({
      name: "",
      registration: "",
      companyName: "",
      deviceModel:
        "FMC125",
      trackerImei: "",
      driver: "",
    });

    setFormError(null);
  }


  function closeAddVehicleModal() {
    setShowAddVehicle(false);

    resetAddForm();
  }


  function handleAddVehicle() {
    const name =
      newVehicle.name.trim();

    const registration =
      newVehicle.registration.trim();

    const companyName =
      newVehicle.companyName.trim();

    const trackerImei =
      newVehicle.trackerImei.trim();

    if (
      !name ||
      !registration ||
      !companyName
    ) {
      setFormError(
        "Nom du véhicule, immatriculation et entreprise sont obligatoires.",
      );

      return;
    }


    const duplicateRegistration =
      vehicles.some(
        (vehicle) =>
          vehicle.registration
            .toLowerCase() ===
          registration.toLowerCase(),
      );


    if (
      duplicateRegistration
    ) {
      setFormError(
        "Cette immatriculation existe déjà.",
      );

      return;
    }


    const companyId =
      "local-" +
      companyName
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          "-",
        )
        .replace(
          /^-|-$/g,
          "",
        );


    const vehicleId =
      `local-vehicle-${Date.now()}`;


    const createdVehicle =
      {
        id:
          vehicleId,

        companyId,

        companyName,

        name,

        registration,

        status:
          "Hors ligne",

        deviceModel:
          newVehicle.deviceModel,

        trackerImei:
          trackerImei ||
          "Non assigné",

        driver:
          newVehicle.driver.trim() ||
          "Non affecté",
      } as DemoVehicle;


    setVehicles(
      (current) => [
        createdVehicle,
        ...current,
      ],
    );


    closeAddVehicleModal();
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Truck className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Véhicules
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Flotte Matelematics.
            </p>
          </div>

        </div>


        {canCreate && (
          <button
            type="button"
            onClick={() =>
              setShowAddVehicle(
                true,
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />

            Ajouter un véhicule
          </button>
        )}

      </div>


      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <VehicleKpi
          label="Total véhicules"
          value={
            metrics.total
          }
          loading={
            loading
          }
          icon="truck"
        />

        <VehicleKpi
          label="Actifs"
          value={
            metrics.active
          }
          loading={
            loading
          }
          icon="wifi"
        />

        <VehicleKpi
          label="À l'arrêt"
          value={
            metrics.stopped
          }
          loading={
            loading
          }
          icon="alert"
        />

        <VehicleKpi
          label="Hors ligne"
          value={
            metrics.offline
          }
          loading={
            loading
          }
          icon="offline"
        />

      </div>


      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

          <div>
            <h2 className="font-semibold text-white">
              Liste des véhicules
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Véhicules visibles selon votre périmètre d'accès.
            </p>
          </div>

        </div>


        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">

                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">
                  Véhicule
                </th>

                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">
                  Client
                </th>

                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">
                  Immatriculation
                </th>

                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">
                  Statut
                </th>

                <th className="px-5 py-4 text-left text-xs uppercase text-slate-500">
                  Tracker
                </th>

                <th className="px-5 py-4 text-right text-xs uppercase text-slate-500">
                  Actions
                </th>

              </tr>
            </thead>


            <tbody className="divide-y divide-slate-800">

              {vehicles.map(
                (vehicle) => (
                  <tr
                    key={
                      vehicle.id
                    }
                    className="transition hover:bg-slate-800/40"
                  >

                    <td className="px-5 py-4">

                      <p className="font-medium text-white">
                        {
                          vehicle.name
                        }
                      </p>

                      <p className="text-xs text-slate-500">
                        {
                          vehicle.driver
                        }
                      </p>

                    </td>


                    <td className="px-5 py-4 text-sm text-slate-300">
                      {
                        vehicle.companyName
                      }
                    </td>


                    <td className="px-5 py-4 text-sm text-slate-300">
                      {
                        vehicle.registration
                      }
                    </td>


                    <td className="px-5 py-4">
                      <StatusBadge
                        status={
                          vehicle.status
                        }
                      />
                    </td>


                    <td className="px-5 py-4 text-sm text-slate-300">

                      {
                        vehicle.deviceModel
                      }

                      <p className="text-xs text-slate-500">
                        {
                          vehicle.trackerImei
                        }
                      </p>

                    </td>


                    <td className="px-5 py-4 text-right">

                      <button
                        type="button"
                        onClick={() => {
                          window.location.href =
                            "/dashboard/vehicle/" +
                            vehicle.id;
                        }}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                        aria-label="Voir le véhicule"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                    </td>

                  </tr>
                ),
              )}

            </tbody>

          </table>

        </div>

      </div>


      {showAddVehicle && canCreate && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeAddVehicleModal();
            }
          }}
        >

          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-800 p-5">

              <div>

                <h2 className="text-lg font-semibold text-white">
                  Ajouter un véhicule
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Créez un nouveau véhicule dans votre flotte.
                </p>

              </div>


              <button
                type="button"
                onClick={
                  closeAddVehicleModal
                }
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

            </div>


            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">

              {formError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                  {
                    formError
                  }
                </div>
              )}


              <div className="grid gap-4 sm:grid-cols-2">

                <label className="space-y-2">

                  <span className="text-xs font-medium text-slate-400">
                    Nom du véhicule *
                  </span>

                  <input
                    value={
                      newVehicle.name
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewVehicle(
                        (current) => ({
                          ...current,
                          name:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Mercedes Sprinter"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  />

                </label>


                <label className="space-y-2">

                  <span className="text-xs font-medium text-slate-400">
                    Immatriculation *
                  </span>

                  <input
                    value={
                      newVehicle.registration
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewVehicle(
                        (current) => ({
                          ...current,
                          registration:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="12345-A-6"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  />

                </label>


                <label className="space-y-2">

                  <span className="text-xs font-medium text-slate-400">
                    Entreprise / Client *
                  </span>

                  <input
                    value={
                      newVehicle.companyName
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewVehicle(
                        (current) => ({
                          ...current,
                          companyName:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Nom du client"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  />

                </label>


                <label className="space-y-2">

                  <span className="text-xs font-medium text-slate-400">
                    Modèle Teltonika
                  </span>

                  <select
                    value={
                      newVehicle.deviceModel
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewVehicle(
                        (current) => ({
                          ...current,
                          deviceModel:
                            event.target.value,
                        }),
                      )
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  >
                    <option value="FMC125">
                      FMC125
                    </option>

                    <option value="FMC150">
                      FMC150
                    </option>

                    <option value="FMC650">
                      FMC650
                    </option>

                    <option value="">
                      Aucun tracker
                    </option>
                  </select>

                </label>


                <label className="space-y-2">

                  <span className="text-xs font-medium text-slate-400">
                    IMEI tracker
                  </span>

                  <input
                    value={
                      newVehicle.trackerImei
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewVehicle(
                        (current) => ({
                          ...current,
                          trackerImei:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="356307042441234"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  />

                </label>


                <label className="space-y-2">

                  <span className="text-xs font-medium text-slate-400">
                    Conducteur
                  </span>

                  <input
                    value={
                      newVehicle.driver
                    }
                    onChange={(
                      event,
                    ) =>
                      setNewVehicle(
                        (current) => ({
                          ...current,
                          driver:
                            event.target.value,
                        }),
                      )
                    }
                    placeholder="Conducteur non affecté"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
                  />

                </label>

              </div>


              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                <p className="text-sm font-medium text-white">
                  Étape actuelle
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Cette modal ajoute actuellement le véhicule à l'interface.
                  La prochaine étape sera de connecter cette création à
                  Supabase pour enregistrer réellement le véhicule dans la base.
                </p>

              </div>

            </div>


            <div className="flex flex-col-reverse gap-2 border-t border-slate-800 p-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={
                  closeAddVehicleModal
                }
                className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Annuler
              </button>


              <button
                type="button"
                onClick={
                  handleAddVehicle
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />

                Ajouter le véhicule
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


function VehicleKpi({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: number;
  loading: boolean;
  icon:
    | "truck"
    | "wifi"
    | "alert"
    | "offline";
}) {
  const Icon =
    icon === "truck"
      ? Truck
      : icon === "alert"
        ? CircleAlert
        : Wifi;

  const color =
    icon === "wifi"
      ? "text-emerald-400"
      : icon === "alert"
        ? "text-orange-400"
        : icon === "offline"
          ? "text-slate-500"
          : "text-blue-400";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm text-slate-400">
          {label}
        </p>

        <Icon
          className={`h-5 w-5 ${color}`}
        />

      </div>


      <p className="mt-3 text-3xl font-bold text-white">
        {
          loading
            ? "…"
            : value
        }
      </p>

    </div>
  );
}
