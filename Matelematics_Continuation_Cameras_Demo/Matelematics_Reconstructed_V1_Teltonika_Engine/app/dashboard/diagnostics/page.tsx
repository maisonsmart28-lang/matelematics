"use client";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  Truck,
  Wrench,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../../components/supabase";

import {
  getDiagnosticIntelligence,
  riskLabel,
  riskClasses,
  drivingAdviceLabel,
  type DiagnosticIntelligence,
} from "../../../lib/diagnostics/diagnostic-intelligence";


const TXT = {
  title:
    "Centre de diagnostic des v\u00e9hicules",

  subtitle:
    "Codes d\u00e9faut, Check Engine et historique de diagnostic.",

  select:
    "S\u00e9lectionner un v\u00e9hicule",

  active:
    "Codes d\u00e9faut actifs",

  stored:
    "Codes d\u00e9faut m\u00e9moris\u00e9s",

  history:
    "Historique diagnostic du v\u00e9hicule",

  noActive:
    "Aucun code d\u00e9faut actif.",

  noStored:
    "Aucun code d\u00e9faut m\u00e9moris\u00e9.",

  noHistory:
    "Aucun d\u00e9faut enregistr\u00e9 pour ce v\u00e9hicule.",

  clear:
    "Effacer les codes d\u00e9faut",

  clearing:
    "Effacement en cours...",

  refresh:
    "Actualiser",

  vehicle:
    "Ouvrir la fiche v\u00e9hicule",
};


type Dtc = {
  code: string;
  source: string | null;
  status: string;
};


type Vehicle = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  registration: string;

  device: {
    id: string;
    imei: string;
    manufacturer: string | null;
    model: string | null;
    status: string;
    lastSeenAt: string | null;
  } | null;

  telemetryAt: string | null;
  profile: string | null;
  checkEngine: boolean | null;
  activeDtc: Dtc[];
  storedDtc: Dtc[];

  j1939RealProfile: {
    mode: "real";
    imei: string;

    vehicleVerified: boolean;
    canProfileVerified: boolean;
    clearProfileVerified: boolean;

    realClearEnabled: false;
    safetyInterlock: "HARD_LOCK_V1";
    transmissionEnabled: false;

    canChannel: "CAN1" | "CAN2" | null;
    baudRate: number | null;
    idType: "29bit" | "11bit" | null;
    sourceAddress: number | null;

    dm1Read: boolean;
    dm2Read: boolean;

    clearActiveConfigured: boolean;
    clearStoredConfigured: boolean;

    manufacturer: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    engine: string | null;
    ecu: string | null;

    status:
      | "LOCKED"
      | "PROFILE_INCOMPLETE"
      | "READY_FOR_VALIDATION";

    note: string;
  } | null;

  clearCapability: {
    supported: boolean;
    reason: string;
  };
};


type EventItem = {
  id: string;
  vehicleId: string;

  vehicleName?: string;
  registration?: string;
  companyName?: string;

  kind?: "dtc" | "check_engine";

  code: string | null;
  title: string;
  message: string | null;

  severity?: string | null;
  status: string;

  triggeredAt: string;
  resolvedAt: string | null;

  recurrenceCount: number;

  profile?: string | null;
};


type DtcHistoryItem = {
  vehicleId: string;
  code: string;
  title: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  recurrenceCount: number;
  lastClearAt: string | null;
  returnedAfterClear: boolean;
  returnedAt: string | null;
  returnDelaySeconds: number | null;
  currentStatus: "active" | "resolved";
};


type Payload = {
  vehicles: Vehicle[];
  events: EventItem[];
  dtcHistory: DtcHistoryItem[];

  metrics: {
    activeDtc: number;
    activeCheckEngine: number;
    storedDtc: number;
    affectedVehicles: number;
  };
};


function formatDate(
  value: string | null,
) {
  if (!value) {
    return "-";
  }

  return new Date(
    value,
  ).toLocaleString(
    "fr-FR",
    {
      timeZone:
        "Africa/Casablanca",
    },
  );
}


function normalizeSeverity(
  value: string | null | undefined,
) {
  const severity =
    (
      value ??
      ""
    ).toLowerCase();


  if (
    severity === "critical" ||
    severity === "critique"
  ) {
    return "critical";
  }


  if (
    severity === "high" ||
    severity === "major" ||
    severity === "majeure" ||
    severity === "error"
  ) {
    return "major";
  }


  if (
    severity === "medium" ||
    severity === "moderate" ||
    severity === "warning"
  ) {
    return "moderate";
  }


  return "info";
}


function severityLabel(
  value: string | null | undefined,
) {
  const severity =
    normalizeSeverity(
      value,
    );


  if (
    severity === "critical"
  ) {
    return "Critique";
  }


  if (
    severity === "major"
  ) {
    return "Majeure";
  }


  if (
    severity === "moderate"
  ) {
    return "Moderee";
  }


  return "Information";
}


function severityClasses(
  value: string | null | undefined,
) {
  const severity =
    normalizeSeverity(
      value,
    );


  if (
    severity === "critical"
  ) {
    return "bg-red-500/10 text-red-300 ring-red-500/20";
  }


  if (
    severity === "major"
  ) {
    return "bg-orange-500/10 text-orange-300 ring-orange-500/20";
  }


  if (
    severity === "moderate"
  ) {
    return "bg-amber-500/10 text-amber-300 ring-amber-500/20";
  }


  return "bg-blue-500/10 text-blue-300 ring-blue-500/20";
}


function diagnosticProtocol(
  profile: string | null | undefined,
  code?: string | null,
) {
  if (
    profile ===
    "j1939_fms"
  ) {
    return "j1939";
  }


  if (
    code
      ?.toUpperCase()
      .startsWith(
        "SPN",
      )
  ) {
    return "j1939";
  }


  return "light";
}

function profileLabel(
  value: string | null,
) {
  if (
    value ===
    "j1939_fms"
  ) {
    return "J1939 / FMS";
  }

  if (
    value ===
    "light_vehicle_can"
  ) {
    return "CAN Light";
  }

  return "CAN";
}


function capabilityMessage(
  reason: string,
) {
  if (
    reason ===
    "J1939_REAL_HARD_LOCK_V1"
  ) {
    return "Architecture J1939 r\u00e9elle pr\u00eate, mais toute \u00e9mission CAN d'effacement reste verrouill\u00e9e par HARD LOCK V1.";
  }

  if (
    reason ===
    "J1939_CLEAR_PROFILE_NOT_VERIFIED"
  ) {
    return "Le profil d\u0027effacement J1939 r\u00e9el de ce v\u00e9hicule n\u0027est pas encore valid\u00e9.";
  }

  if (
    reason ===
    "NO_TRACKER"
  ) {
    return "Aucun tracker affect\u00e9 au v\u00e9hicule.";
  }

  if (
    reason ===
    "TRACKER_CLEAR_NOT_SUPPORTED"
  ) {
    return "Ce mod\u00e8le de tracker n'est pas encore compatible avec l'effacement distant.";
  }

  return "";
}


export default function DiagnosticsPage() {
  const [
    payload,
    setPayload,
  ] =
    useState<Payload | null>(
      null,
    );

  const [
    selectedVehicleId,
    setSelectedVehicleId,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    clearing,
    setClearing,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  const [
    search,
    setSearch,
  ] =
    useState("");


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      "all" |
      "active" |
      "resolved" |
      "recurring"
    >(
      "all",
    );


  const [
    severityFilter,
    setSeverityFilter,
  ] =
    useState<
      "all" |
      "critical" |
      "major" |
      "moderate" |
      "info"
    >(
      "all",
    );


  const [
    protocolFilter,
    setProtocolFilter,
  ] =
    useState<
      "all" |
      "light" |
      "j1939"
    >(
      "all",
    );


  const load =
    useCallback(
      async () => {
        try {
          const {
            data: {
              session,
            },
          } =
            await supabase.auth.getSession();

          if (!session) {
            throw new Error(
              "Session expir\u00e9e.",
            );
          }

          const response =
            await fetch(
              "/api/diagnostics",
              {
                cache:
                  "no-store",

                headers: {
                  Authorization:
                    `Bearer ${session.access_token}`,
                },
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ??
              "Diagnostic indisponible.",
            );
          }

          const next =
            data as Payload;

          setPayload(
            next,
          );

          setSelectedVehicleId(
            (
              current,
            ) => {
              if (
                current &&
                (
                  current === "__all__" ||
                  next.vehicles.some(
                    (
                      vehicle,
                    ) =>
                      vehicle.id ===
                      current,
                  )
                )
              ) {
                return current;
              }


              return "__all__";
            },
          );

          setError(
            null,
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Erreur.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );


  const fleetMode =
    selectedVehicleId ===
    "__all__";


  const selectedVehicle =
    useMemo(
      () => {
        if (
          fleetMode
        ) {
          return null;
        }


        return (
          payload?.vehicles.find(
            (
              vehicle,
            ) =>
              vehicle.id ===
              selectedVehicleId,
          ) ??
          null
        );
      },
      [
        payload,
        selectedVehicleId,
        fleetMode,
      ],
    );


  const filteredEvents =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();


        return (
          payload?.events ??
          []
        ).filter(
          (
            event,
          ) => {
            if (
              !fleetMode &&
              event.vehicleId !==
                selectedVehicleId
            ) {
              return false;
            }


            if (
              statusFilter === "active" &&
              event.status !== "active"
            ) {
              return false;
            }


            if (
              statusFilter === "resolved" &&
              event.status === "active"
            ) {
              return false;
            }


            if (
              statusFilter === "recurring" &&
              event.recurrenceCount <= 1
            ) {
              return false;
            }


            if (
              severityFilter !== "all" &&
              normalizeSeverity(
                event.severity,
              ) !== severityFilter
            ) {
              return false;
            }


            if (
              protocolFilter !== "all" &&
              diagnosticProtocol(
                event.profile,
                event.code,
              ) !== protocolFilter
            ) {
              return false;
            }


            if (
              query
            ) {
              const haystack =
                [
                  event.code,
                  event.title,
                  event.message,
                  event.vehicleName,
                  event.registration,
                  event.companyName,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();


              if (
                !haystack.includes(
                  query,
                )
              ) {
                return false;
              }
            }


            return true;
          },
        );
      },
      [
        payload,
        fleetMode,
        selectedVehicleId,
        search,
        statusFilter,
        severityFilter,
        protocolFilter,
      ],
    );


  const dtcHistory =
    useMemo(
      () => {
        return (
          payload?.dtcHistory ??
          []
        ).filter(
          (
            item,
          ) => {
            if (
              !fleetMode &&
              item.vehicleId !==
                selectedVehicleId
            ) {
              return false;
            }


            if (
              statusFilter === "active" &&
              item.currentStatus !== "active"
            ) {
              return false;
            }


            if (
              statusFilter === "resolved" &&
              item.currentStatus === "active"
            ) {
              return false;
            }


            if (
              statusFilter === "recurring" &&
              !item.returnedAfterClear &&
              item.recurrenceCount <= 1
            ) {
              return false;
            }


            return true;
          },
        );
      },
      [
        payload,
        fleetMode,
        selectedVehicleId,
        statusFilter,
      ],
    );


  const history =
    filteredEvents;


  const resolvedCount =
    (
      payload?.events ??
      []
    ).filter(
      (
        event,
      ) =>
        event.status !==
        "active",
    ).length;


  const recurringCount =
    (
      payload?.dtcHistory ??
      []
    ).filter(
      (
        item,
      ) =>
        item.returnedAfterClear ||
        item.recurrenceCount >
          1,
    ).length;


  const fleetVehicles =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();


        return (
          payload?.vehicles ??
          []
        ).filter(
          (
            vehicle,
          ) => {
            const directText =
              [
                vehicle.name,
                vehicle.registration,
                vehicle.companyName,
                vehicle.device?.imei,
                vehicle.device?.model,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            if (
              query &&
              !directText.includes(
                query,
              ) &&
              !filteredEvents.some(
                (
                  event,
                ) =>
                  event.vehicleId ===
                  vehicle.id,
              )
            ) {
              return false;
            }


            if (
              (
                statusFilter !== "all" ||
                severityFilter !== "all" ||
                protocolFilter !== "all"
              ) &&
              !filteredEvents.some(
                (
                  event,
                ) =>
                  event.vehicleId ===
                  vehicle.id,
              )
            ) {
              return false;
            }


            return true;
          },
        );
      },
      [
        payload,
        filteredEvents,
        search,
        statusFilter,
        severityFilter,
        protocolFilter,
      ],
    );


  const hasFaults =
    Boolean(
      selectedVehicle &&
      (
        selectedVehicle.checkEngine ===
          true ||
        selectedVehicle.activeDtc.length >
          0 ||
        selectedVehicle.storedDtc.length >
          0 ||
        history.some(
          (
            event,
          ) =>
            event.status ===
            "active",
        )
      ),
    );


  const clearFaults =
    async () => {
      if (
        !selectedVehicle
      ) {
        return;
      }


      const confirmed =
        window.confirm(
          "Confirmer l'effacement des codes d\u00e9faut sur le v\u00e9hicule et dans Matelematics ?",
        );


      if (
        !confirmed
      ) {
        return;
      }


      setClearing(
        true,
      );

      setMessage(
        null,
      );

      setError(
        null,
      );


      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();


        if (
          !session
        ) {
          throw new Error(
            "Session expir\u00e9e.",
          );
        }


        const response =
          await fetch(
            "/api/diagnostics",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${session.access_token}`,
              },

              body:
                JSON.stringify({
                  action:
                    "clear_dtc",

                  vehicleId:
                    selectedVehicle.id,
                }),
            },
          );


        const result =
          await response.json();


        if (
          !response.ok
        ) {
          throw new Error(
            result.error ??
            "L'effacement a \u00e9chou\u00e9.",
          );
        }


        if (
          result.stage !==
            "verified" ||
          result.verification?.verified !==
            true
        ) {
          throw new Error(
            "L'effacement n'a pas pu etre confirme par la telemetrie.",
          );
        }


        setMessage(
          `Effacement confirme : tracker OK + telemetrie ECU propre a ${formatDate(
            result.verification.recordedAt ??
            null,
          )}.`,
        );


        await load();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Erreur d'effacement.",
        );
      } finally {
        setClearing(
          false,
        );
      }
    };


  if (
    loading &&
    !payload
  ) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }


  return (
    <div className="space-y-6 pb-12">

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
              <ShieldAlert className="h-6 w-6 text-red-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white">
                {TXT.title}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                {TXT.subtitle}
              </p>
            </div>

          </div>


          <button
            type="button"
            onClick={() =>
              void load()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            {TXT.refresh}
          </button>

        </div>

      </section>


      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}


      {message && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">

        <Kpi
          label="DTC actifs"
          value={
            payload?.metrics.activeDtc ??
            0
          }
          icon="alert"
        />

        <Kpi
          label="Check Engine"
          value={
            payload?.metrics.activeCheckEngine ??
            0
          }
          icon="engine"
        />

        <Kpi
          label={"DTC m\u00e9moris\u00e9s"}
          value={
            payload?.metrics.storedDtc ??
            0
          }
          icon="stored"
        />

        <Kpi
          label={"V\u00e9hicules concern\u00e9s"}
          value={
            payload?.metrics.affectedVehicles ??
            0
          }
          icon="vehicle"
        />


        <Kpi
          label={"R\u00e9solus"}
          value={
            resolvedCount
          }
          icon="resolved"
        />


        <Kpi
          label={"R\u00e9cidivants"}
          value={
            recurringCount
          }
          icon="recurring"
        />

      </section>


      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <label className="mb-2 block text-sm font-medium text-slate-300">
          {TXT.select}
        </label>

        <select
          value={
            selectedVehicleId
          }
          onChange={
            (
              event,
            ) =>
              setSelectedVehicleId(
                event.target.value,
              )
          }
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none lg:max-w-2xl"
        >

          <option value="__all__">
            Tous les vehicules - Vue flotte
          </option>
          {(payload?.vehicles ?? []).map(
            (
              vehicle,
            ) => (
              <option
                key={
                  vehicle.id
                }
                value={
                  vehicle.id
                }
              >
                {vehicle.name} - {vehicle.registration} - {vehicle.companyName}
              </option>
            ),
          )}
        </select>

      </section>


      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <div className="grid gap-3 lg:grid-cols-4">

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="DTC, vehicule, immatriculation, IMEI..."
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          />


          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as typeof statusFilter,
              )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="resolved">Resolus</option>
            <option value="recurring">Recidivants</option>
          </select>


          <select
            value={severityFilter}
            onChange={(event) =>
              setSeverityFilter(
                event.target.value as typeof severityFilter,
              )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="all">Toutes les gravites</option>
            <option value="critical">Critique</option>
            <option value="major">Majeure</option>
            <option value="moderate">Moderee</option>
            <option value="info">Information</option>
          </select>


          <select
            value={protocolFilter}
            onChange={(event) =>
              setProtocolFilter(
                event.target.value as typeof protocolFilter,
              )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white"
          >
            <option value="all">LIGHT + J1939</option>
            <option value="light">OBD-II / CAN Light</option>
            <option value="j1939">J1939 / SPN-FMI</option>
          </select>

        </div>

      </section>


      {fleetMode && (
        <section>

          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Vue flotte diagnostic
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {fleetVehicles.length} vehicule(s) correspondant aux filtres.
            </p>
          </div>


          <div className="grid gap-4 lg:grid-cols-2">

            {fleetVehicles.map(
              (
                vehicle,
              ) => {
                const vehicleEvents =
                  filteredEvents.filter(
                    (
                      event,
                    ) =>
                      event.vehicleId ===
                      vehicle.id,
                  );


                const activeEvents =
                  vehicleEvents.filter(
                    (
                      event,
                    ) =>
                      event.status ===
                      "active",
                  );


                const recurring =
                  (
                    payload?.dtcHistory ??
                    []
                  ).filter(
                    (
                      item,
                    ) =>
                      item.vehicleId ===
                        vehicle.id &&
                      (
                        item.returnedAfterClear ||
                        item.recurrenceCount >
                          1
                      ),
                  ).length;


                return (
                  <button
                    key={vehicle.id}
                    type="button"
                    onClick={() =>
                      setSelectedVehicleId(
                        vehicle.id,
                      )
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-slate-700 hover:bg-slate-800/70"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>
                        <p className="font-semibold text-white">
                          {vehicle.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {vehicle.registration} - {vehicle.companyName}
                        </p>
                      </div>


                      <span className="text-xs text-slate-400">
                        {profileLabel(
                          vehicle.profile,
                        )}
                      </span>

                    </div>


                    <div className="mt-4 grid grid-cols-3 gap-3">

                      <HistoryStat
                        label="Actifs"
                        value={
                          String(
                            vehicle.activeDtc.length,
                          )
                        }
                      />

                      <HistoryStat
                        label="Memorises"
                        value={
                          String(
                            vehicle.storedDtc.length,
                          )
                        }
                      />

                      <HistoryStat
                        label="Recidivants"
                        value={
                          String(
                            recurring,
                          )
                        }
                      />

                    </div>


                    {activeEvents[0] && (
                      <span
                        className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${severityClasses(
                          activeEvents[0].severity,
                        )}`}
                      >
                        {severityLabel(
                          activeEvents[0].severity,
                        )}
                      </span>
                    )}

                  </button>
                );
              },
            )}

          </div>

        </section>
      )}

      {selectedVehicle && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

            <div>

              <div className="flex flex-wrap items-center gap-3">

                <Truck className="h-6 w-6 text-blue-400" />

                <h2 className="text-xl font-bold text-white">
                  {selectedVehicle.name}
                </h2>

                {selectedVehicle.checkEngine === true && (
                  <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/20">
                    CHECK ENGINE
                  </span>
                )}

              </div>

              <p className="mt-2 text-sm text-slate-400">
                {selectedVehicle.registration}
                {" - "}
                {selectedVehicle.companyName}
                {" - "}
                {selectedVehicle.device?.model ?? "No tracker"}
                {" - "}
                {profileLabel(selectedVehicle.profile)}
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                disabled={
                  clearing ||
                  !selectedVehicle.clearCapability.supported ||
                  !hasFaults
                }
                onClick={() =>
                  void clearFaults()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white enabled:hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
              >
                <Wrench className="h-4 w-4" />

                {clearing
                  ? TXT.clearing
                  : TXT.clear}
              </button>


              <Link
                href={`/dashboard/vehicle/${selectedVehicle.id}`}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white hover:bg-slate-700"
              >
                {TXT.vehicle}
              </Link>

            </div>

          </div>


          {!selectedVehicle.clearCapability.supported && (
            <p className="mt-4 text-xs text-amber-400">
              {capabilityMessage(
                selectedVehicle.clearCapability.reason,
              )}
            </p>
          )}


          {selectedVehicle.j1939RealProfile && (
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">

              <div className="flex flex-wrap items-center justify-between gap-3">

                <div>
                  <p className="font-semibold text-white">
                    Profil FMC650 / J1939 r\u00e9el
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Architecture Safe V1 - aucune trame d'effacement CAN ne peut \u00eatre envoy\u00e9e.
                  </p>
                </div>

                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/20">
                  HARD LOCK
                </span>

              </div>


              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                <SafeProfileStat
                  label="V\u00e9hicule identifi\u00e9"
                  ok={
                    selectedVehicle.j1939RealProfile.vehicleVerified
                  }
                />

                <SafeProfileStat
                  label="Profil CAN valid\u00e9"
                  ok={
                    selectedVehicle.j1939RealProfile.canProfileVerified
                  }
                />

                <SafeProfileStat
                  label="Profil Clear valid\u00e9"
                  ok={
                    selectedVehicle.j1939RealProfile.clearProfileVerified
                  }
                />

                <SafeProfileStat
                  label="Transmission r\u00e9elle"
                  ok={
                    selectedVehicle.j1939RealProfile.transmissionEnabled
                  }
                  locked
                />

              </div>


              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                <ProfileValue
                  label="Canal"
                  value={
                    selectedVehicle.j1939RealProfile.canChannel ??
                    "Non configur\u00e9"
                  }
                />

                <ProfileValue
                  label="Baudrate"
                  value={
                    selectedVehicle.j1939RealProfile.baudRate
                      ? `${selectedVehicle.j1939RealProfile.baudRate} bit/s`
                      : "Non configur\u00e9"
                  }
                />

                <ProfileValue
                  label="CAN ID"
                  value={
                    selectedVehicle.j1939RealProfile.idType ??
                    "Non configur\u00e9"
                  }
                />

                <ProfileValue
                  label="ECU"
                  value={
                    selectedVehicle.j1939RealProfile.ecu ??
                    "Non renseign\u00e9"
                  }
                />

              </div>


              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

                <SafeProfileStat
                  label="Lecture DM1"
                  ok={
                    selectedVehicle.j1939RealProfile.dm1Read
                  }
                />

                <SafeProfileStat
                  label="Lecture DM2"
                  ok={
                    selectedVehicle.j1939RealProfile.dm2Read
                  }
                />

                <SafeProfileStat
                  label="Clear actifs configur\u00e9"
                  ok={
                    selectedVehicle.j1939RealProfile.clearActiveConfigured
                  }
                />

                <SafeProfileStat
                  label="Clear m\u00e9moris\u00e9s configur\u00e9"
                  ok={
                    selectedVehicle.j1939RealProfile.clearStoredConfigured
                  }
                />

              </div>


              <p className="mt-4 text-xs text-amber-300">
                {selectedVehicle.j1939RealProfile.note}
              </p>

            </div>
          )}


          <div className="mt-6">

            <h3 className="font-semibold text-white">
              {TXT.active}
            </h3>

            {selectedVehicle.activeDtc.length === 0 ? (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                {TXT.noActive}
              </div>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">

                {selectedVehicle.activeDtc.map(
                  (
                    dtc,
                  ) => (
                    <DiagnosticCard
                      key={
                        dtc.code
                      }
                      dtc={
                        dtc
                      }
                      active
                    />
                  ),
                )}

              </div>
            )}

          </div>


          <div className="mt-6">

            <h3 className="font-semibold text-white">
              {TXT.stored}
            </h3>

            {selectedVehicle.storedDtc.length === 0 ? (
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
                {TXT.noStored}
              </div>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">

                {selectedVehicle.storedDtc.map(
                  (
                    dtc,
                  ) => (
                    <DiagnosticCard
                      key={
                        dtc.code
                      }
                      dtc={
                        dtc
                      }
                      active={
                        false
                      }
                    />
                  ),
                )}

              </div>
            )}

          </div>

        </section>
      )}


      {selectedVehicle && (
        <section>

          <div className="mb-4">

            <h2 className="text-lg font-semibold text-white">
              Synth\u00e8se historique des codes d\u00e9faut
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Agr\u00e9gation par code DTC pour {selectedVehicle.name}.
            </p>

          </div>


          {dtcHistory.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              Aucun code d\u00e9faut historique pour ce v\u00e9hicule.
            </div>
          ) : (
            <div className="space-y-4">

              {dtcHistory.map(
                (
                  item,
                ) => (
                  <div
                    key={
                      `${item.vehicleId}-${item.code}`
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >

                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">

                      <div>

                        <div className="flex flex-wrap items-center gap-3">

                          {item.currentStatus === "active" ? (
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          )}

                          <p className="text-lg font-bold text-white">
                            {item.code}
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.currentStatus === "active"
                                ? "bg-red-500/10 text-red-300"
                                : "bg-emerald-500/10 text-emerald-300"
                            }`}
                          >
                            {item.currentStatus === "active"
                              ? "Actif"
                              : "R\u00e9solu"}
                          </span>


                          {item.returnedAfterClear && (
                            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                              Revenu apr\u00e8s effacement
                            </span>
                          )}

                        </div>


                        {item.title && (
                          <p className="mt-2 text-sm text-slate-400">
                            {item.title}
                          </p>
                        )}


                        <DiagnosticHistorySummary
                          code={
                            item.code
                          }
                        />

                      </div>

                    </div>


                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">

                      <HistoryStat
                        label={"Premi\u00e8re apparition"}
                        value={
                          formatDate(
                            item.firstSeenAt,
                          )
                        }
                      />

                      <HistoryStat
                        label={"Derni\u00e8re apparition"}
                        value={
                          formatDate(
                            item.lastSeenAt,
                          )
                        }
                      />

                      <HistoryStat
                        label={"Nombre de r\u00e9cidives"}
                        value={
                          String(
                            item.recurrenceCount,
                          )
                        }
                      />

                      <HistoryStat
                        label={"Dernier effacement"}
                        value={
                          formatDate(
                            item.lastClearAt,
                          )
                        }
                      />

                      <HistoryStat
                        label={"Revenu apr\u00e8s effacement"}
                        value={
                          item.returnedAfterClear
                            ? "OUI"
                            : "NON"
                        }
                      />

                    </div>


                    {item.returnedAfterClear && (
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">

                        <p className="text-sm font-semibold text-amber-300">
                          R\u00e9cidive apr\u00e8s effacement confirm\u00e9
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Retour d\u00e9tect\u00e9 : {formatDate(item.returnedAt)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          D\u00e9lai avant retour : {
                            item.returnDelaySeconds === null
                              ? "-"
                              : item.returnDelaySeconds < 60
                                ? `${item.returnDelaySeconds} s`
                                : `${Math.round(item.returnDelaySeconds / 60)} min`
                          }
                        </p>

                      </div>
                    )}

                  </div>
                ),
              )}

            </div>
          )}

        </section>
      )}


      {selectedVehicle && (
        <section>

          <div className="mb-4">

            <h2 className="text-lg font-semibold text-white">
              {TXT.history}
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {selectedVehicle.name} - {selectedVehicle.registration}
            </p>

          </div>


          {history.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
              {TXT.noHistory}
            </div>
          ) : (
            <div className="space-y-3">

              {history.map(
                (
                  event,
                ) => (
                  <div
                    key={
                      event.id
                    }
                    className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                  >

                    <div className="flex flex-wrap items-center gap-3">

                      {event.status === "active" ? (
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      )}

                      <p className="font-bold text-white">
                        {event.code ?? "Check Engine"}
                      </p>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          event.status === "active"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {event.status === "active"
                          ? "Actif"
                          : "R\u00e9solu"}
                      </span>

                    </div>


                    <p className="mt-2 text-sm text-slate-400">
                      {event.title}
                    </p>


                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">

                      <span>
                        D\u00e9tect\u00e9 : {formatDate(event.triggeredAt)}
                      </span>

                      <span>
                        R\u00e9solu : {formatDate(event.resolvedAt)}
                      </span>

                      <span>
                        R\u00e9cidives : {event.recurrenceCount}
                      </span>

                    </div>

                  </div>
                ),
              )}

            </div>
          )}

        </section>
      )}

    </div>
  );
}


function DiagnosticHistorySummary({
  code,
}: {
  code: string;
}) {
  const diagnostic =
    getDiagnosticIntelligence(
      code,
    );


  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">

      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${riskClasses(
          diagnostic.risk,
        )}`}
      >
        Risque {riskLabel(
          diagnostic.risk,
        )}
      </span>


      <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
        {diagnostic.protocol === "j1939"
          ? "J1939"
          : diagnostic.protocol === "obd2"
            ? "OBD-II"
            : "Protocole inconnu"}
      </span>


      <span className="text-xs text-slate-500">
        {diagnostic.family}
      </span>

    </div>
  );
}


function DiagnosticCard({
  dtc,
  active,
}: {
  dtc: Dtc;
  active: boolean;
}) {
  const diagnostic:
    DiagnosticIntelligence =
      getDiagnosticIntelligence(
        dtc.code,
      );


  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? "border-red-500/20 bg-red-500/5"
          : "border-amber-500/20 bg-amber-500/5"
      }`}
    >

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <p
              className={`text-xl font-bold ${
                active
                  ? "text-red-300"
                  : "text-amber-300"
              }`}
            >
              {dtc.code}
            </p>


            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${riskClasses(
                diagnostic.risk,
              )}`}
            >
              {riskLabel(
                diagnostic.risk,
              )}
            </span>


            <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
              {diagnostic.protocol === "j1939"
                ? "J1939"
                : diagnostic.protocol === "obd2"
                  ? "OBD-II"
                  : "INCONNU"}
            </span>

          </div>


          <p className="mt-2 font-semibold text-white">
            {diagnostic.title}
          </p>


          <p className="mt-1 text-xs text-slate-500">
            {diagnostic.family}
          </p>

        </div>


        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            active
              ? "bg-red-500/10 text-red-300"
              : "bg-amber-500/10 text-amber-300"
          }`}
        >
          {active
            ? "ACTIF"
            : "MEMORISE"}
        </span>

      </div>


      <p className="mt-4 text-sm leading-6 text-slate-300">
        {diagnostic.explanation}
      </p>


      {!diagnostic.known && (
        <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-300">
          Signification specifique non validee dans la base Matelematics. Aucune interpretation constructeur n'est inventee.
        </div>
      )}


      {diagnostic.possibleEffects.length > 0 && (
        <div className="mt-5">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Effets possibles
          </p>

          <ul className="mt-2 space-y-1.5 text-sm text-slate-300">

            {diagnostic.possibleEffects.map(
              (
                effect,
              ) => (
                <li
                  key={
                    effect
                  }
                  className="flex gap-2"
                >
                  <span className="text-slate-600">
                    •
                  </span>

                  <span>
                    {effect}
                  </span>
                </li>
              ),
            )}

          </ul>

        </div>
      )}


      {diagnostic.recommendedActions.length > 0 && (
        <div className="mt-5">

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Controles recommandes
          </p>

          <ul className="mt-2 space-y-1.5 text-sm text-slate-300">

            {diagnostic.recommendedActions.map(
              (
                action,
              ) => (
                <li
                  key={
                    action
                  }
                  className="flex gap-2"
                >
                  <span className="text-blue-400">
                    →
                  </span>

                  <span>
                    {action}
                  </span>
                </li>
              ),
            )}

          </ul>

        </div>
      )}


      <div className="mt-5 rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">

        <div className="flex flex-wrap items-center gap-2">

          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Conduite
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${riskClasses(
              diagnostic.risk,
            )}`}
          >
            {drivingAdviceLabel(
              diagnostic.drivingAdvice,
            )}
          </span>

        </div>


        <p className="mt-2 text-sm text-slate-300">
          {diagnostic.drivingAdviceText}
        </p>

      </div>


      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">

        {dtc.source && (
          <p className="text-xs text-slate-500">
            Source : {dtc.source}
          </p>
        )}


        <p className="text-xs text-slate-600">
          {diagnostic.disclaimer}
        </p>

      </div>

    </div>
  );
}

function SafeProfileStat({
  label,
  ok,
  locked = false,
}: {
  label: string;
  ok: boolean;
  locked?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${
          locked
            ? "text-red-300"
            : ok
              ? "text-emerald-300"
              : "text-amber-300"
        }`}
      >
        {locked
          ? "VERROUILL\u00c9"
          : ok
            ? "VALID\u00c9"
            : "EN ATTENTE"}
      </p>

    </div>
  );
}


function ProfileValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">

      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-white">
        {value}
      </p>

    </div>
  );
}

function HistoryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-white">
        {value}
      </p>

    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon:
    | "alert"
    | "engine"
    | "stored"
    | "vehicle"
    | "resolved"
    | "recurring";
}) {
  const Icon =
    icon === "vehicle"
      ? Truck
      : icon === "stored"
        ? Clock
        : icon === "engine"
          ? Activity
          : icon === "resolved"
            ? CheckCircle2
            : icon === "recurring"
              ? RefreshCw
              : AlertTriangle;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm text-slate-400">
          {label}
        </p>

        <Icon className="h-5 w-5 text-red-400" />

      </div>

      <p className="mt-3 text-3xl font-bold text-white">
        {value}
      </p>

    </div>
  );
}