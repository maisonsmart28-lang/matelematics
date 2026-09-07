"use client";

import {
  AlertTriangle,
  BatteryMedium,
  Fuel,
  Gauge,
  Save,
  Thermometer,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  supabase,
} from "../../../components/supabase";

import {
  useDashboardAccess,
} from "../../DashboardAccessContext";


type AlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "info";


type RuleSetting = {
  key: string;
  label: string;
  description: string;
  unit: string;

  platformValue:
    number;

  platformEnabled:
    boolean;

  platformSeverity:
    AlertSeverity;

  inheritedValue:
    number;

  inheritedEnabled:
    boolean;

  inheritedSeverity:
    AlertSeverity;

  inheritedSource:
    "company" |
    "platform";

  vehicleValue:
    number |
    null;

  vehicleEnabled:
    boolean |
    null;

  vehicleSeverity:
    AlertSeverity |
    null;

  effectiveValue:
    number;

  effectiveEnabled:
    boolean;

  effectiveSeverity:
    AlertSeverity;

  thresholdSource:
    "platform" |
    "company" |
    "vehicle";

  enabledSource:
    "platform" |
    "company" |
    "vehicle";

  severitySource:
    "platform" |
    "company" |
    "vehicle";

  mode:
    "inherit" |
    "vehicle";

  min:
    number;

  max:
    number;

  step:
    number;
};


type Payload = {
  mode:
    "vehicle";

  vehicle: {
    id: string;
    companyId: string;
    name: string;
    registration: string;
  };

  settings:
    RuleSetting[];

  canManage:
    boolean;
};


type LocalRule = {
  mode:
    "inherit" |
    "vehicle";

  value:
    string;

  enabled:
    boolean;

  severity:
    AlertSeverity;
};


function configurationSourceLabel(
  source:
    "platform" |
    "company" |
    "vehicle",
) {

  if (
    source ===
    "vehicle"
  ) {
    return "Vehicule";
  }

  if (
    source ===
    "company"
  ) {
    return "Client";
  }

  return "Plateforme";
}


function vehicleSeverityLabel(
  severity:
    AlertSeverity,
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


function RuleIcon({
  ruleKey,
}: {
  ruleKey:
    string;
}) {
  if (
    ruleKey ===
    "coolant_temperature_high"
  ) {
    return (
      <Thermometer className="h-5 w-5 text-red-400" />
    );
  }

  if (
    ruleKey ===
      "battery_voltage_low_12v" ||
    ruleKey ===
      "battery_voltage_low_24v"
  ) {
    return (
      <BatteryMedium className="h-5 w-5 text-amber-400" />
    );
  }

  if (
    ruleKey ===
      "low_fuel" ||
    ruleKey ===
      "adblue_low"
  ) {
    return (
      <Fuel className="h-5 w-5 text-orange-400" />
    );
  }

  if (
    ruleKey ===
      "engine_rpm_high" ||
    ruleKey ===
      "engine_load_high"
  ) {
    return (
      <Gauge className="h-5 w-5 text-blue-400" />
    );
  }

  return (
    <Gauge className="h-5 w-5 text-blue-400" />
  );
}


export default function VehicleAlertSettingsPanel({
  vehicleId,
}: {
  vehicleId:
    string;
}) {
  const {
    canUpdate,
  } =
    useDashboardAccess();

  const [
    payload,
    setPayload,
  ] =
    useState<
      Payload |
      null
    >(null);

  const [
    local,
    setLocal,
  ] =
    useState<
      Record<
        string,
        LocalRule
      >
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string |
      null
    >(null);

  const [
    message,
    setMessage,
  ] =
    useState<
      string |
      null
    >(null);


  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const {
            data: {
              session,
            },
          } =
            await supabase.auth.getSession();

          if (!session) {
            throw new Error(
              "Session expirée.",
            );
          }

          const response =
            await fetch(
              `/api/alert-settings?vehicleId=${encodeURIComponent(
                vehicleId,
              )}`,
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
              "Configuration véhicule indisponible.",
            );
          }

          const nextPayload =
            data as Payload;

          setPayload(
            nextPayload,
          );

          const nextLocal:
            Record<
              string,
              LocalRule
            > = {};

          for (
            const rule of
            nextPayload.settings
          ) {
            nextLocal[
              rule.key
            ] = {
              mode:
                rule.mode,

              value:
                String(
                  rule.vehicleValue ??
                  rule.inheritedValue,
                ),

              enabled:
                rule.vehicleEnabled ??
                rule.inheritedEnabled,

              severity:
                rule.vehicleSeverity ??
                rule.inheritedSeverity,
            };
          }

          setLocal(
            nextLocal,
          );

        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Erreur de chargement.",
          );

        } finally {
          setLoading(false);
        }
      },
      [
        vehicleId,
      ],
    );


  useEffect(
    () => {
      void load();
    },
    [
      load,
    ],
  );


  async function save() {
    if (!payload) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const settings:
        Record<
          string,
          {
            mode:
              "inherit" |
              "vehicle";

            value?:
              number;

            enabled?:
              boolean;

            severity?:
              AlertSeverity;
          }
        > = {};

      for (
        const rule of
        payload.settings
      ) {
        const current =
          local[
            rule.key
          ];

        if (!current) {
          throw new Error(
            `Configuration manquante : ${rule.label}.`,
          );
        }

        if (
          current.mode ===
          "inherit"
        ) {
          settings[
            rule.key
          ] = {
            mode:
              "inherit",
          };

          continue;
        }

        const value =
          Number(
            current.value,
          );

        if (
          !Number.isFinite(
            value,
          ) ||
          value <
            rule.min ||
          value >
            rule.max
        ) {
          throw new Error(
            `${rule.label} : valeur comprise entre ${rule.min} et ${rule.max} ${rule.unit}.`,
          );
        }

        settings[
          rule.key
        ] = {
          mode:
            "vehicle",

          value,

          enabled:
            current.enabled,

          severity:
            current.severity,
        };
      }

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          "Session expirée.",
        );
      }

      const response =
        await fetch(
          "/api/alert-settings",
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
              JSON.stringify({
                action:
                  "vehicle-save",

                vehicleId,

                settings,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
          "Enregistrement impossible.",
        );
      }

      setMessage(
        "Configuration d'alertes du véhicule enregistrée.",
      );

      await load();

    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Enregistrement impossible.",
      );

    } finally {
      setSaving(false);
    }
  }


  return (
    <section className="rounded-2xl border border-blue-500/20 bg-slate-900 p-6">

      <div className="mb-5 flex items-start gap-3">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
          <AlertTriangle className="h-5 w-5 text-blue-400" />
        </div>

        <div>

          <h2 className="text-lg font-semibold text-white">
            Paramètres d'alertes du véhicule
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Héritez de la configuration du client ou définissez une configuration spécifique au véhicule.
          </p>

        </div>

      </div>


      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}


      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}


      {loading ? (

        <p className="py-6 text-sm text-slate-400">
          Chargement des paramètres d'alertes...
        </p>

      ) : !payload ? (

        <p className="py-6 text-sm text-slate-400">
          Configuration indisponible.
        </p>

      ) : (

        <>

          <div className="grid gap-4 xl:grid-cols-2">

            {payload.settings.map(
              (rule) => {
                const current =
                  local[
                    rule.key
                  ];

                if (!current) {
                  return null;
                }

                const editable =
                  canUpdate &&
                  payload.canManage;

                return (

                  <div
                    key={
                      rule.key
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >

                    <div className="flex items-start gap-3">

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                        <RuleIcon
                          ruleKey={
                            rule.key
                          }
                        />
                      </div>

                      <div>

                        <p className="font-medium text-white">
                          {rule.label}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {rule.description}
                        </p>

                      </div>

                    </div>


                    <div className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-400">

                      Hérité :
                      {" "}

                      <span
                        className={
                          rule.inheritedEnabled
                            ? "font-semibold text-emerald-300"
                            : "font-semibold text-slate-300"
                        }
                      >
                        {rule.inheritedEnabled
                          ? "Activée"
                          : "Désactivée"}
                      </span>

                      {" · "}

                      {rule.inheritedValue} {rule.unit}

                      {" · "}

                      {rule.inheritedSource ===
                      "company"
                        ? "Client"
                        : "Plateforme"}

                    </div>


                    <div className="mt-4 space-y-4">

                      <label className="flex cursor-pointer items-start gap-3">

                        <input
                          type="radio"
                          name={
                            `alert-${rule.key}`
                          }
                          checked={
                            current.mode ===
                            "inherit"
                          }
                          disabled={
                            !editable ||
                            saving
                          }
                          onChange={
                            () =>
                              setLocal(
                                (
                                  previous,
                                ) => ({
                                  ...previous,

                                  [rule.key]: {
                                    ...previous[
                                      rule.key
                                    ],

                                    mode:
                                      "inherit",

                                    enabled:
                                      rule.inheritedEnabled,

                                    severity:
                                      rule.inheritedSeverity,

                                    value:
                                      String(
                                        rule.inheritedValue,
                                      ),
                                  },
                                }),
                              )
                          }
                          className="mt-1"
                        />

                        <span>

                          <span className="block text-sm font-medium text-slate-200">
                            Hériter du client
                          </span>

                          <span className="text-xs text-slate-500">
                            Valeur effective : {rule.inheritedEnabled ? "Activée" : "Désactivée"} · {rule.inheritedValue} {rule.unit}
                          </span>

                        </span>

                      </label>


                      <label className="flex cursor-pointer items-start gap-3">

                        <input
                          type="radio"
                          name={
                            `alert-${rule.key}`
                          }
                          checked={
                            current.mode ===
                            "vehicle"
                          }
                          disabled={
                            !editable ||
                            saving
                          }
                          onChange={
                            () =>
                              setLocal(
                                (
                                  previous,
                                ) => ({
                                  ...previous,

                                  [rule.key]: {
                                    ...previous[
                                      rule.key
                                    ],

                                    mode:
                                      "vehicle",
                                  },
                                }),
                              )
                          }
                          className="mt-1"
                        />

                        <span className="flex-1">

                          <span className="block text-sm font-medium text-slate-200">
                            Configuration spécifique véhicule
                          </span>


                          <span className="mt-3 flex flex-wrap items-center gap-3">

                            <button
                              type="button"
                              disabled={
                                !editable ||
                                saving ||
                                current.mode !==
                                  "vehicle"
                              }
                              onClick={
                                (
                                  event,
                                ) => {
                                  event.preventDefault();

                                  setLocal(
                                    (
                                      previous,
                                    ) => ({
                                      ...previous,

                                      [rule.key]: {
                                        ...previous[
                                          rule.key
                                        ],

                                        enabled:
                                          !previous[
                                            rule.key
                                          ].enabled,
                                      },
                                    }),
                                  );
                                }
                              }
                              className={
                                current.enabled
                                  ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 disabled:opacity-50"
                                  : "rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 disabled:opacity-50"
                              }
                            >
                              {current.enabled
                                ? "Activée"
                                : "Désactivée"}
                            </button>


                            <input
                              type="number"
                              min={
                                rule.min
                              }
                              max={
                                rule.max
                              }
                              step={
                                rule.step
                              }
                              value={
                                current.value
                              }
                              disabled={
                                !editable ||
                                saving ||
                                current.mode !==
                                  "vehicle"
                              }
                              onChange={
                                (
                                  event,
                                ) =>
                                  setLocal(
                                    (
                                      previous,
                                    ) => ({
                                      ...previous,

                                      [rule.key]: {
                                        ...previous[
                                          rule.key
                                        ],

                                        value:
                                          event.target.value,
                                      },
                                    }),
                                  )
                              }
                              className="w-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                            />

                            <span className="text-sm text-slate-400">
                              {rule.unit}
                            </span>

                            <select
                              value={
                                current.severity
                              }
                              disabled={
                                !editable ||
                                saving ||
                                current.mode !==
                                  "vehicle"
                              }
                              onChange={
                                (
                                  event,
                                ) =>
                                  setLocal(
                                    (
                                      previous,
                                    ) => ({
                                      ...previous,

                                      [rule.key]: {
                                        ...previous[
                                          rule.key
                                        ],

                                        severity:
                                          event.target.value as AlertSeverity,
                                      },
                                    }),
                                  )
                              }
                              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                            >
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

                          </span>

                        </span>

                      </label>

                    </div>


                    <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">

                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-300">
                        Configuration effective enregistree
                      </p>


                      <div className="mt-3 grid gap-2 sm:grid-cols-3">

                        <div className="rounded-lg bg-slate-950/70 p-3">

                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Activation
                          </p>

                          <p className={
                            rule.effectiveEnabled
                              ? "mt-1 text-sm font-semibold text-emerald-300"
                              : "mt-1 text-sm font-semibold text-slate-300"
                          }>
                            {rule.effectiveEnabled
                              ? "Activee"
                              : "Desactivee"}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            Source : {configurationSourceLabel(
                              rule.enabledSource,
                            )}
                          </p>

                        </div>


                        <div className="rounded-lg bg-slate-950/70 p-3">

                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Seuil
                          </p>

                          <p className="mt-1 text-sm font-semibold text-white">
                            {rule.effectiveValue} {rule.unit}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            Source : {configurationSourceLabel(
                              rule.thresholdSource,
                            )}
                          </p>

                        </div>


                        <div className="rounded-lg bg-slate-950/70 p-3">

                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Gravite
                          </p>

                          <p className="mt-1 text-sm font-semibold text-white">
                            {vehicleSeverityLabel(
                              rule.effectiveSeverity,
                            )}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            Source : {configurationSourceLabel(
                              rule.severitySource,
                            )}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              },
            )}

          </div>


          <div className="mt-5 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">
              Une configuration spécifique véhicule remplace l'état et le seuil hérités.
            </p>


            {canUpdate &&
              payload.canManage && (

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  () =>
                    void save()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />

                {saving
                  ? "Enregistrement..."
                  : "Enregistrer la configuration"}
              </button>
            )}

          </div>

        </>
      )}

    </section>
  );
}