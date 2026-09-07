"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Battery,
  Clock3,
  Gauge,
  MapPin,
  Navigation,
  Radio,
  Satellite,
  Truck,
  Wifi,
} from "lucide-react";

import { supabase } from "../../components/supabase";

type VehicleStatus =
  | "En mouvement"
  | "À l'arrêt"
  | "Hors ligne";

type LiveVehicle = {
  id: string;
  companyId: string;
  deviceId: string;

  name: string;
  registration: string;

  lat: number;
  lng: number;

  speed: number;
  heading: number;

  status: VehicleStatus;

  lastSeenAt: string | null;

  model: string | null;

  batteryVoltage: number | null;
  ignition: boolean | null;

  satellites: number | null;
};

type RoutePoint = {
  lat: number;
  lng: number;
};

type LeafletVehicle = {
  lat: number;
  lng: number;

  status:
    | "online"
    | "en route"
    | "offline";

  vehicleId: string;
};

const LeafletMap = dynamic(
  () => import("../LeafletMap"),
  {
    ssr: false,

    loading: () => (
      <div className="flex h-full min-h-[600px] items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

          <p className="text-sm text-slate-400">
            Chargement de la carte...
          </p>
        </div>
      </div>
    ),
  },
);


function formatLastSeen(
  value: string | null,
) {
  if (!value) {
    return "Jamais";
  }

  const date = new Date(value);

  const diffMs =
    Date.now() - date.getTime();

  const diffSeconds =
    Math.max(
      0,
      Math.round(
        diffMs / 1000,
      ),
    );

  if (diffSeconds < 60) {
    return `Il y a ${diffSeconds} s`;
  }

  const diffMinutes =
    Math.round(
      diffSeconds / 60,
    );

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours =
    Math.round(
      diffMinutes / 60,
    );

  return `Il y a ${diffHours} h`;
}


function getStatus(
  lastSeenAt: string | null,
  speed: number,
): VehicleStatus {
  if (!lastSeenAt) {
    return "Hors ligne";
  }

  const ageMs =
    Date.now() -
    new Date(
      lastSeenAt,
    ).getTime();

  /*
   * Plus de 2 minutes sans paquet :
   * véhicule considéré hors ligne.
   */

  if (ageMs > 120_000) {
    return "Hors ligne";
  }

  if (speed > 2) {
    return "En mouvement";
  }

  return "À l'arrêt";
}


function StatusBadge({
  status,
}: {
  status: VehicleStatus;
}) {
  const styles = {
    "En mouvement":
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",

    "À l'arrêt":
      "bg-amber-500/10 text-amber-400 border-amber-500/20",

    "Hors ligne":
      "bg-slate-800 text-slate-400 border-slate-700",
  };

  const dots = {
    "En mouvement":
      "bg-emerald-400",

    "À l'arrêt":
      "bg-amber-400",

    "Hors ligne":
      "bg-slate-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dots[status]}`}
      />

      {status}
    </span>
  );
}


export default function MapPage() {
  const [
    vehicles,
    setVehicles,
  ] = useState<LiveVehicle[]>([]);

  const [
    route,
    setRoute,
  ] = useState<RoutePoint[]>([]);

  const [
    selectedVehicleId,
    setSelectedVehicleId,
  ] = useState<string | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  useEffect(() => {
    let cancelled = false;


    async function load() {
      try {
        setError(null);


        /*
         * 1. Devices accessibles selon la session/RLS
         */

        const {
          data: devices,
          error: devicesError,
        } = await supabase
          .from("devices")
          .select(
            "id,company_id,vehicle_id,imei,model,status,last_seen_at",
          )
          .not(
            "vehicle_id",
            "is",
            null,
          );


        if (devicesError) {
          throw devicesError;
        }


        if (
          cancelled
        ) {
          return;
        }


        if (
          !devices ||
          devices.length === 0
        ) {
          setVehicles([]);
          setRoute([]);
          setLoading(false);

          return;
        }


        const vehicleIds =
          devices
            .map(
              (device) =>
                device.vehicle_id,
            )
            .filter(
              (
                id,
              ): id is string =>
                Boolean(id),
            );


        /*
         * 2. Véhicules
         */

        const {
          data: vehicleRows,
          error: vehiclesError,
        } = await supabase
          .from("vehicles")
          .select(
            "id,company_id,name,registration,status",
          )
          .in(
            "id",
            vehicleIds,
          );


        if (vehiclesError) {
          throw vehiclesError;
        }


        /*
         * 3. Positions récentes
         *
         * On charge les dernières lignes visibles.
         * Pour chaque véhicule, on garde ensuite
         * la position la plus récente.
         */

        const {
          data: positionRows,
          error: positionsError,
        } = await supabase
          .from("positions")
          .select(
            "id,company_id,vehicle_id,device_id,latitude,longitude,speed,heading,recorded_at",
          )
          .in(
            "vehicle_id",
            vehicleIds,
          )
          .order(
            "recorded_at",
            {
              ascending: false,
            },
          )
          .limit(500);


        if (positionsError) {
          throw positionsError;
        }


        /*
         * 4. Dernière télémétrie
         */

        const {
          data: telemetryRows,
          error: telemetryError,
        } = await supabase
          .from("telemetry")
          .select(
            "vehicle_id,device_id,battery_voltage,ignition,metadata,recorded_at",
          )
          .in(
            "vehicle_id",
            vehicleIds,
          )
          .order(
            "recorded_at",
            {
              ascending: false,
            },
          )
          .limit(500);


        if (telemetryError) {
          throw telemetryError;
        }


        const vehicleMap =
          new Map(
            (
              vehicleRows ??
              []
            ).map(
              (vehicle) => [
                vehicle.id,
                vehicle,
              ],
            ),
          );


        const latestPosition =
          new Map<
            string,
            (typeof positionRows)[number]
          >();


        for (
          const position of
          positionRows ?? []
        ) {
          if (
            !latestPosition.has(
              position.vehicle_id,
            )
          ) {
            latestPosition.set(
              position.vehicle_id,
              position,
            );
          }
        }


        const latestTelemetry =
          new Map<
            string,
            (typeof telemetryRows)[number]
          >();


        for (
          const telemetry of
          telemetryRows ?? []
        ) {
          if (
            !latestTelemetry.has(
              telemetry.vehicle_id,
            )
          ) {
            latestTelemetry.set(
              telemetry.vehicle_id,
              telemetry,
            );
          }
        }


        const mapped: LiveVehicle[] =
          [];


        for (
          const device of
          devices
        ) {
          if (
            !device.vehicle_id
          ) {
            continue;
          }


          const vehicle =
            vehicleMap.get(
              device.vehicle_id,
            );


          const position =
            latestPosition.get(
              device.vehicle_id,
            );


          if (
            !vehicle ||
            !position ||
            position.latitude === null ||
            position.longitude === null
          ) {
            continue;
          }


          const telemetry =
            latestTelemetry.get(
              device.vehicle_id,
            );


          const speed =
            position.speed ??
            0;


          const metadata =
            telemetry?.metadata as
              | {
                  satellites?: number;
                }
              | null
              | undefined;


          mapped.push({
            id:
              vehicle.id,

            companyId:
              vehicle.company_id,

            deviceId:
              device.id,

            name:
              vehicle.name,

            registration:
              vehicle.registration,

            lat:
              position.latitude,

            lng:
              position.longitude,

            speed,

            heading:
              position.heading ??
              0,

            status:
              getStatus(
                device.last_seen_at,
                speed,
              ),

            lastSeenAt:
              device.last_seen_at,

            model:
              device.model,

            batteryVoltage:
              telemetry?.battery_voltage ??
              null,

            ignition:
              telemetry?.ignition ??
              null,

            satellites:
              typeof metadata?.satellites ===
              "number"
                ? metadata.satellites
                : null,
          });
        }


        /*
         * 5. Historique GPS du véhicule sélectionné
         */

        const targetVehicleId =
          selectedVehicleId ??
          mapped[0]?.id ??
          null;


        const history =
          targetVehicleId
            ? (
                positionRows ??
                []
              )
                .filter(
                  (position) =>
                    position.vehicle_id ===
                      targetVehicleId &&
                    position.latitude !==
                      null &&
                    position.longitude !==
                      null,
                )
                .sort(
                  (
                    a,
                    b,
                  ) =>
                    new Date(
                      a.recorded_at,
                    ).getTime() -
                    new Date(
                      b.recorded_at,
                    ).getTime(),
                )
                .map(
                  (position) => ({
                    lat:
                      position.latitude as number,

                    lng:
                      position.longitude as number,
                  }),
                )
            : [];


        if (
          cancelled
        ) {
          return;
        }


        setVehicles(
          mapped,
        );

        setRoute(
          history,
        );


        if (
          !selectedVehicleId &&
          mapped[0]
        ) {
          setSelectedVehicleId(
            mapped[0].id,
          );
        }


        setLoading(false);
      } catch (cause) {
        if (
          cancelled
        ) {
          return;
        }


        console.error(
          "[Dashboard map]",
          cause,
        );


        setError(
          cause instanceof Error
            ? cause.message
            : "Impossible de charger les positions.",
        );


        setLoading(false);
      }
    }


    void load();


    /*
     * Le simulateur envoie toutes les 3 secondes.
     * On rafraîchit également toutes les 3 secondes.
     */

    const timer =
      window.setInterval(
        () => {
          void load();
        },
        3000,
      );


    return () => {
      cancelled = true;

      window.clearInterval(
        timer,
      );
    };
  }, [
    selectedVehicleId,
  ]);


  const selectedVehicle =
    useMemo(
      () =>
        vehicles.find(
          (vehicle) =>
            vehicle.id ===
            selectedVehicleId,
        ) ??
        vehicles[0] ??
        null,

      [
        vehicles,
        selectedVehicleId,
      ],
    );


  const leafletVehicles:
    LeafletVehicle[] =
    vehicles.map(
      (vehicle) => ({
        lat:
          vehicle.lat,

        lng:
          vehicle.lng,

        vehicleId:
          vehicle.id,

        status:
          vehicle.status ===
          "En mouvement"
            ? "en route"
            : vehicle.status ===
                "Hors ligne"
              ? "offline"
              : "online",
      }),
    );


  const moving =
    vehicles.filter(
      (vehicle) =>
        vehicle.status ===
        "En mouvement",
    ).length;


  const stopped =
    vehicles.filter(
      (vehicle) =>
        vehicle.status ===
        "À l'arrêt",
    ).length;


  const offline =
    vehicles.filter(
      (vehicle) =>
        vehicle.status ===
        "Hors ligne",
    ).length;


  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <MapPin className="h-5 w-5 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Carte en direct
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Positions Teltonika enregistrées dans Supabase.
            </p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">
            Véhicules suivis
          </p>

          <p className="mt-2 text-2xl font-bold text-white">
            {vehicles.length}
          </p>
        </div>


        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">
            En mouvement
          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {moving}
          </p>
        </div>


        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">
            À l'arrêt
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-400">
            {stopped}
          </p>
        </div>


        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-400">
            Hors ligne
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-300">
            {offline}
          </p>
        </div>
      </div>


      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm font-medium text-red-300">
            Impossible de charger les données Teltonika
          </p>

          <p className="mt-1 text-xs text-red-200/70">
            {error}
          </p>
        </div>
      )}


      <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-slate-800 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">
                Véhicules
              </h2>

              <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                {vehicles.length}
              </span>
            </div>


            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />

              Données Teltonika / Supabase
            </div>
          </div>


          <div className="max-h-[590px] overflow-y-auto">
            {loading && (
              <div className="p-5 text-sm text-slate-400">
                Chargement des véhicules...
              </div>
            )}


            {!loading &&
              vehicles.length ===
                0 && (
                <div className="p-5 text-sm text-slate-400">
                  Aucun véhicule avec position disponible.
                </div>
              )}


            {vehicles.map(
              (vehicle) => (
                <button
                  key={
                    vehicle.id
                  }
                  type="button"
                  onClick={() =>
                    setSelectedVehicleId(
                      vehicle.id,
                    )
                  }
                  className={`w-full border-b border-slate-800 p-4 text-left transition ${
                    selectedVehicle?.id ===
                    vehicle.id
                      ? "bg-blue-500/10"
                      : "hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                      <Truck className="h-4 w-4 text-blue-400" />
                    </div>


                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {
                          vehicle.name
                        }
                      </p>


                      <p className="mt-0.5 text-xs text-slate-500">
                        {
                          vehicle.registration
                        }
                      </p>


                      <div className="mt-2">
                        <StatusBadge
                          status={
                            vehicle.status
                          }
                        />
                      </div>


                      <p className="mt-2 text-[11px] text-slate-500">
                        {
                          formatLastSeen(
                            vehicle.lastSeenAt,
                          )
                        }
                      </p>
                    </div>
                  </div>
                </button>
              ),
            )}
          </div>
        </aside>


        <div className="relative min-h-[600px] bg-slate-950">
          <LeafletMap
            vehicles={
              leafletVehicles
            }
            route={
              route
            }
          />


          {selectedVehicle && (
            <div className="absolute bottom-5 left-5 right-5 z-[500]">
              <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-semibold text-white">
                      {
                        selectedVehicle.name
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {
                        selectedVehicle.registration
                      }
                      {" · "}
                      {
                        selectedVehicle.model ??
                        "Teltonika"
                      }
                    </p>
                  </div>


                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <StatusBadge
                      status={
                        selectedVehicle.status
                      }
                    />


                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Gauge className="h-4 w-4 text-blue-400" />

                      {
                        selectedVehicle.speed
                      }{" "}
                      km/h
                    </div>


                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Navigation className="h-4 w-4 text-blue-400" />

                      {
                        selectedVehicle.heading
                      }
                      °
                    </div>


                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Wifi
                        className={`h-4 w-4 ${
                          selectedVehicle.ignition
                            ? "text-emerald-400"
                            : "text-slate-500"
                        }`}
                      />

                      Ignition{" "}
                      {
                        selectedVehicle.ignition ===
                        null
                          ? "—"
                          : selectedVehicle.ignition
                            ? "ON"
                            : "OFF"
                      }
                    </div>


                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Battery className="h-4 w-4 text-emerald-400" />

                      {
                        selectedVehicle.batteryVoltage ===
                        null
                          ? "—"
                          : `${selectedVehicle.batteryVoltage.toFixed(
                              1,
                            )} V`
                      }
                    </div>


                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Satellite className="h-4 w-4 text-purple-400" />

                      {
                        selectedVehicle.satellites ??
                        "—"
                      }{" "}
                      satellites
                    </div>


                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Clock3 className="h-4 w-4 text-slate-400" />

                      {
                        formatLastSeen(
                          selectedVehicle.lastSeenAt,
                        )
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex gap-3">
          <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />

          <div>
            <p className="text-sm font-medium text-white">
              Connexion télématique active
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Cette page lit les positions et télémétries enregistrées
              dans Supabase par le serveur Teltonika Matelematics.
              Le simulateur utilise aujourd'hui le même pipeline que
              le futur matériel physique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
