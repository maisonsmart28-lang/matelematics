"use client";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  Wrench,
  XCircle,
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


type AlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "info";


type AlertLifecycle =
  | "active"
  | "acknowledged"
  | "resolved";


type AlertItem = {
  id:
    string;

  vehicleId:
    string;

  companyId:
    string;

  vehicleName:
    string;

  registration:
    string;

  companyName:
    string;

  alertType:
    string;

  label:
    string;

  category:
    string;

  ruleLabel:
    string;

  message:
    string;

  severity:
    AlertSeverity;

  lifecycle:
    AlertLifecycle;

  status:
    string;

  triggeredAt:
    string;

  resolvedAt:
    string |
    null;

  acknowledgedAt:
    string |
    null;

  acknowledgedBy:
    string |
    null;

  recurrenceCount:
    number;

  firstSeenAt:
    string;

  lastSeenAt:
    string;

  diagnostic:
    boolean;

  metadata:
    Record<
      string,
      unknown
    > |
    null;
};


type VehicleOption = {
  id:
    string;

  name:
    string;

  registration:
    string;
};


type Payload = {
  alerts:
    AlertItem[];

  vehicles:
    VehicleOption[];

  metrics: {
    active:
      number;

    critical:
      number;

    acknowledged:
      number;

    resolved:
      number;
  };
};


function formatDate(
  value: string | null,
) {
  if (
    !value
  ) {
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


function severityLabel(
  severity: AlertSeverity,
) {
  if (
    severity ===
    "critical"
  ) {
    return "Critique";
  }


  if (
    severity ===
    "high"
  ) {
    return "Majeure";
  }


  if (
    severity ===
    "medium"
  ) {
    return "Moderee";
  }


  return "Information";
}


function severityClasses(
  severity: AlertSeverity,
) {
  if (
    severity ===
    "critical"
  ) {
    return "bg-red-500/10 text-red-300 ring-red-500/20";
  }


  if (
    severity ===
    "high"
  ) {
    return "bg-orange-500/10 text-orange-300 ring-orange-500/20";
  }


  if (
    severity ===
    "medium"
  ) {
    return "bg-amber-500/10 text-amber-300 ring-amber-500/20";
  }


  return "bg-blue-500/10 text-blue-300 ring-blue-500/20";
}


function lifecycleLabel(
  lifecycle: AlertLifecycle,
) {
  if (
    lifecycle ===
    "resolved"
  ) {
    return "Resolue";
  }


  if (
    lifecycle ===
    "acknowledged"
  ) {
    return "Acquittee";
  }


  return "Active";
}


function lifecycleClasses(
  lifecycle: AlertLifecycle,
) {
  if (
    lifecycle ===
    "resolved"
  ) {
    return "bg-emerald-500/10 text-emerald-300";
  }


  if (
    lifecycle ===
    "acknowledged"
  ) {
    return "bg-blue-500/10 text-blue-300";
  }


  return "bg-red-500/10 text-red-300";
}


function metadataString(
  metadata:
    Record<
      string,
      unknown
    > |
    null,

  key:
    string,
) {

  if (!metadata) {
    return null;
  }

  const value =
    metadata[
      key
    ];

  return typeof value ===
    "string"
      ? value
      : null;
}


function auditSourceLabel(
  value:
    string |
    null,
) {

  if (
    value ===
    "vehicle"
  ) {
    return "Vehicule";
  }

  if (
    value ===
    "company"
  ) {
    return "Client";
  }

  if (
    value ===
    "platform"
  ) {
    return "Plateforme";
  }

  return "-";
}


function hasAuditMetadata(
  metadata:
    Record<
      string,
      unknown
    > |
    null,
) {

  return Boolean(
    metadataString(
      metadata,
      "rule_version",
    ) ||
    metadataString(
      metadata,
      "alert_engine_version",
    ) ||
    metadataString(
      metadata,
      "threshold_source",
    ) ||
    metadataString(
      metadata,
      "can_mapping_version",
    )
  );
}


function AlertIcon({
  alert,
}: {
  alert:
    AlertItem;
}) {
  if (
    alert.diagnostic
  ) {
    return (
      <Wrench className="h-5 w-5 text-orange-400" />
    );
  }


  if (
    alert.alertType ===
    "door_open_moving"
  ) {
    return (
      <ShieldAlert className="h-5 w-5 text-red-400" />
    );
  }


  if (
    alert.alertType ===
    "overspeed"
  ) {
    return (
      <Gauge className="h-5 w-5 text-red-400" />
    );
  }


  if (
    alert.alertType ===
      "gps_lost" ||
    alert.alertType ===
      "tracker_offline"
  ) {
    return (
      <MapPin className="h-5 w-5 text-amber-400" />
    );
  }


  return (
    <Bell className="h-5 w-5 text-blue-400" />
  );
}


export default function AlertsPage() {
  const [
    payload,
    setPayload,
  ] =
    useState<Payload | null>(
      null,
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );


  const [
    actionLoading,
    setActionLoading,
  ] =
    useState<
      string |
      null
    >(
      null,
    );


  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(
      null,
    );


  const [
    message,
    setMessage,
  ] =
    useState<
      string |
      null
    >(
      null,
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      "",
    );


  const [
    selectedVehicle,
    setSelectedVehicle,
  ] =
    useState(
      "all",
    );


  const [
    selectedType,
    setSelectedType,
  ] =
    useState(
      "all",
    );


  const [
    selectedStatus,
    setSelectedStatus,
  ] =
    useState(
      "all",
    );


  const [
    selectedSeverity,
    setSelectedSeverity,
  ] =
    useState(
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


          if (
            !session
          ) {
            throw new Error(
              "Session expiree.",
            );
          }


          const response =
            await fetch(
              "/api/alerts",
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


          if (
            !response.ok
          ) {
            throw new Error(
              data.error ??
              "Alertes indisponibles.",
            );
          }


          setPayload(
            data as Payload,
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


  const alertTypes =
    useMemo(
      () =>
        Array.from(
          new Set(
            (
              payload?.alerts ??
              []
            ).map(
              (
                alert,
              ) =>
                alert.alertType,
            ),
          ),
        ).sort(),
      [
        payload,
      ],
    );


  const filteredAlerts =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();


        return (
          payload?.alerts ??
          []
        ).filter(
          (
            alert,
          ) => {
            if (
              selectedVehicle !==
                "all" &&
              alert.vehicleId !==
                selectedVehicle
            ) {
              return false;
            }


            if (
              selectedType !==
                "all" &&
              alert.alertType !==
                selectedType
            ) {
              return false;
            }


            if (
              selectedStatus !==
                "all" &&
              alert.lifecycle !==
                selectedStatus
            ) {
              return false;
            }


            if (
              selectedSeverity !==
                "all" &&
              alert.severity !==
                selectedSeverity
            ) {
              return false;
            }


            if (
              query
            ) {
              const haystack =
                [
                  alert.label,
                  alert.message,
                  alert.vehicleName,
                  alert.registration,
                  alert.companyName,
                  alert.alertType,
                ]
                  .join(
                    " ",
                  )
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
        search,
        selectedVehicle,
        selectedType,
        selectedStatus,
        selectedSeverity,
      ],
    );


  async function postAction(
    body:
      Record<
        string,
        string
      >,
  ) {
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
        "Session expiree.",
      );
    }


    const response =
      await fetch(
        "/api/alerts",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              body,
            ),
        },
      );


    const data =
      await response.json();


    if (
      !response.ok
    ) {
      throw new Error(
        data.error ??
        "Action impossible.",
      );
    }


    return data;
  }


  async function acknowledge(
    alertId: string,
  ) {
    try {
      setActionLoading(
        alertId,
      );

      setError(
        null,
      );

      setMessage(
        null,
      );


      await postAction({
        action:
          "acknowledge",

        alertId,
      });


      setMessage(
        "Alerte acquittee.",
      );


      await load();

    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Erreur.",
      );

    } finally {
      setActionLoading(
        null,
      );
    }
  }


  async function acknowledgeAll() {
    try {
      setActionLoading(
        "__all__",
      );

      setError(
        null,
      );

      setMessage(
        null,
      );


      const result =
        await postAction({
          action:
            "acknowledge_all",
        });


      setMessage(
        `${result.updated ?? 0} alerte(s) acquittee(s).`,
      );


      await load();

    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Erreur.",
      );

    } finally {
      setActionLoading(
        null,
      );
    }
  }


  if (
    loading
  ) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-sm text-slate-400">
        Chargement des alertes...
      </div>
    );
  }


  return (
    <div className="space-y-6">


      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
            <Bell className="h-5 w-5 text-red-400" />
          </div>


          <div>

            <h1 className="text-2xl font-semibold text-white">
              Centre des alertes
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Evenements telematiques, diagnostics et securite de la flotte.
            </p>

          </div>

        </div>


        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={
              () =>
                void load()
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />

            Actualiser
          </button>


          <button
            type="button"
            disabled={
              actionLoading !==
              null
            }
            onClick={
              () =>
                void acknowledgeAll()
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />

            Tout acquitter
          </button>

        </div>

      </header>


      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}


      {message && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}


      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <MetricCard
          label="Actives"
          value={
            payload?.metrics.active ??
            0
          }
          icon="active"
        />

        <MetricCard
          label="Critiques"
          value={
            payload?.metrics.critical ??
            0
          }
          icon="critical"
        />

        <MetricCard
          label="Acquittees"
          value={
            payload?.metrics.acknowledged ??
            0
          }
          icon="ack"
        />

        <MetricCard
          label="Resolues"
          value={
            payload?.metrics.resolved ??
            0
          }
          icon="resolved"
        />

      </section>


      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">

          <div className="relative">

            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

            <input
              value={
                search
              }
              onChange={
                (
                  event,
                ) =>
                  setSearch(
                    event.target.value,
                  )
              }
              placeholder="Vehicule, alerte, DTC..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none"
            />

          </div>


          <select
            value={
              selectedVehicle
            }
            onChange={
              (
                event,
              ) =>
                setSelectedVehicle(
                  event.target.value,
                )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
          >
            <option value="all">
              Tous les vehicules
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
                  {vehicle.name} - {vehicle.registration}
                </option>
              ),
            )}
          </select>


          <select
            value={
              selectedType
            }
            onChange={
              (
                event,
              ) =>
                setSelectedType(
                  event.target.value,
                )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
          >
            <option value="all">
              Tous les types
            </option>

            {alertTypes.map(
              (
                type,
              ) => (
                <option
                  key={
                    type
                  }
                  value={
                    type
                  }
                >
                  {type}
                </option>
              ),
            )}
          </select>


          <select
            value={
              selectedStatus
            }
            onChange={
              (
                event,
              ) =>
                setSelectedStatus(
                  event.target.value,
                )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
          >
            <option value="all">
              Tous les statuts
            </option>

            <option value="active">
              Actives
            </option>

            <option value="acknowledged">
              Acquittees
            </option>

            <option value="resolved">
              Resolues
            </option>
          </select>


          <select
            value={
              selectedSeverity
            }
            onChange={
              (
                event,
              ) =>
                setSelectedSeverity(
                  event.target.value,
                )
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white"
          >
            <option value="all">
              Toutes les gravites
            </option>

            <option value="critical">
              Critique
            </option>

            <option value="high">
              Majeure
            </option>

            <option value="medium">
              Moderee
            </option>

            <option value="info">
              Information
            </option>
          </select>

        </div>


        <p className="mt-4 text-xs text-slate-500">
          {filteredAlerts.length} alerte(s) correspondant aux filtres.
        </p>

      </section>


      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 px-5 py-4">

          <h2 className="font-semibold text-white">
            Historique des alertes
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Etat, priorite et recurrence des evenements de flotte.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="min-w-full">

            <thead>

              <tr className="border-b border-slate-800 bg-slate-950/50">

                <TableHeader>
                  Alerte
                </TableHeader>

                <TableHeader>
                  Vehicule
                </TableHeader>

                <TableHeader>
                  Gravite
                </TableHeader>

                <TableHeader>
                  Recidive
                </TableHeader>

                <TableHeader>
                  Apparition
                </TableHeader>

                <TableHeader>
                  Statut
                </TableHeader>

                <TableHeader>
                  Actions
                </TableHeader>

              </tr>

            </thead>


            <tbody className="divide-y divide-slate-800">

              {filteredAlerts.map(
                (
                  alert,
                ) => (
                  <tr
                    key={
                      alert.id
                    }
                    className="transition hover:bg-slate-800/40"
                  >

                    <td className="px-5 py-4">

                      <div className="flex min-w-[260px] items-start gap-3">

                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950">
                          <AlertIcon
                            alert={
                              alert
                            }
                          />
                        </div>


                        <div>

                          <p className="text-sm font-semibold text-white">
                            {alert.label}
                          </p>

                          <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                            {alert.message}
                          </p>

                          <p className="mt-1 text-xs text-slate-600">
                            {alert.alertType}
                          </p>


                          {hasAuditMetadata(
                            alert.metadata,
                          ) && (

                            <details className="mt-2 max-w-sm rounded-lg border border-blue-500/20 bg-blue-500/5 p-2">

                              <summary className="cursor-pointer text-xs font-medium text-blue-300">
                                Audit configuration
                              </summary>


                              <div className="mt-3 grid gap-x-4 gap-y-2 text-[11px] sm:grid-cols-2">

                                <div>
                                  <span className="text-slate-500">
                                    Regle :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {metadataString(
                                      alert.metadata,
                                      "rule_version",
                                    ) ?? "-"}
                                  </span>
                                </div>


                                <div>
                                  <span className="text-slate-500">
                                    Moteur :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {metadataString(
                                      alert.metadata,
                                      "alert_engine_version",
                                    ) ?? "-"}
                                  </span>
                                </div>


                                <div>
                                  <span className="text-slate-500">
                                    Resolution :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {metadataString(
                                      alert.metadata,
                                      "config_resolution_version",
                                    ) ?? "-"}
                                  </span>
                                </div>


                                <div>
                                  <span className="text-slate-500">
                                    Metadata :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {metadataString(
                                      alert.metadata,
                                      "metadata_version",
                                    ) ?? "-"}
                                  </span>
                                </div>


                                <div>
                                  <span className="text-slate-500">
                                    Seuil :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {auditSourceLabel(
                                      metadataString(
                                        alert.metadata,
                                        "threshold_source",
                                      ),
                                    )}
                                  </span>
                                </div>


                                <div>
                                  <span className="text-slate-500">
                                    Activation :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {auditSourceLabel(
                                      metadataString(
                                        alert.metadata,
                                        "enabled_source",
                                      ),
                                    )}
                                  </span>
                                </div>


                                <div>
                                  <span className="text-slate-500">
                                    Gravite :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {auditSourceLabel(
                                      metadataString(
                                        alert.metadata,
                                        "severity_source",
                                      ),
                                    )}
                                  </span>
                                </div>


                                <div>
                                  <span className="text-slate-500">
                                    CAN :
                                  </span>{" "}
                                  <span className="text-slate-300">
                                    {metadataString(
                                      alert.metadata,
                                      "can_mapping_version",
                                    ) ?? "-"}
                                  </span>
                                </div>

                              </div>

                            </details>
                          )}

                        </div>

                      </div>

                    </td>


                    <td className="px-5 py-4">

                      <Link
                        href={
                          `/dashboard/vehicle/${alert.vehicleId}`
                        }
                        className="inline-flex items-start gap-2"
                      >

                        <Truck className="mt-0.5 h-4 w-4 text-blue-400" />

                        <span>

                          <span className="block text-sm font-medium text-white hover:text-blue-300">
                            {alert.vehicleName}
                          </span>

                          <span className="block text-xs text-slate-500">
                            {alert.registration}
                          </span>

                          <span className="block text-xs text-slate-600">
                            {alert.companyName}
                          </span>

                        </span>

                      </Link>

                    </td>


                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${severityClasses(
                          alert.severity,
                        )}`}
                      >
                        {severityLabel(
                          alert.severity,
                        )}
                      </span>

                    </td>


                    <td className="px-5 py-4">

                      <p className="text-sm font-semibold text-white">
                        {alert.recurrenceCount}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        premiere : {formatDate(alert.firstSeenAt)}
                      </p>

                    </td>


                    <td className="px-5 py-4">

                      <p className="text-sm text-slate-300">
                        {formatDate(
                          alert.triggeredAt,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        derniere : {formatDate(alert.lastSeenAt)}
                      </p>

                    </td>


                    <td className="px-5 py-4">

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${lifecycleClasses(
                          alert.lifecycle,
                        )}`}
                      >
                        {lifecycleLabel(
                          alert.lifecycle,
                        )}
                      </span>


                      {alert.acknowledgedAt && (
                        <p className="mt-2 text-xs text-slate-500">
                          {formatDate(
                            alert.acknowledgedAt,
                          )}
                        </p>
                      )}

                    </td>


                    <td className="px-5 py-4">

                      <div className="flex min-w-[150px] flex-col gap-2">

                        {alert.lifecycle ===
                          "active" && (
                          <button
                            type="button"
                            disabled={
                              actionLoading ===
                              alert.id
                            }
                            onClick={
                              () =>
                                void acknowledge(
                                  alert.id,
                                )
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                          >
                            Acquitter
                          </button>
                        )}


                        {alert.diagnostic && (
                          <Link
                            href="/dashboard/diagnostics"
                            className="rounded-lg border border-slate-700 px-3 py-2 text-center text-xs text-slate-300 transition hover:bg-slate-800"
                          >
                            Diagnostic
                          </Link>
                        )}


                        <Link
                          href={
                            `/dashboard/vehicle/${alert.vehicleId}`
                          }
                          className="rounded-lg border border-slate-700 px-3 py-2 text-center text-xs text-slate-300 transition hover:bg-slate-800"
                        >
                          Fiche vehicule
                        </Link>

                      </div>

                    </td>

                  </tr>
                ),
              )}

            </tbody>

          </table>


          {filteredAlerts.length ===
            0 && (
            <div className="px-6 py-14 text-center">

              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />

              <p className="mt-4 font-medium text-white">
                Aucune alerte
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Aucun evenement ne correspond aux filtres actuels.
              </p>

            </div>
          )}

        </div>

      </section>


      <section className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">

        <div className="flex gap-3">

          <Activity className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

          <div>

            <p className="font-medium text-white">
              Alert Engine V1
            </p>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Cette page utilise maintenant les alertes Matelematics stockees en base. L'acquittement confirme la prise en charge sans forcer la resolution du defaut.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}


function TableHeader({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}


function MetricCard({
  label,
  value,
  icon,
}: {
  label:
    string;

  value:
    number;

  icon:
    | "active"
    | "critical"
    | "ack"
    | "resolved";
}) {
  const Icon =
    icon ===
      "critical"
      ? XCircle
      : icon ===
          "ack"
        ? Clock3
        : icon ===
            "resolved"
          ? CheckCircle2
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