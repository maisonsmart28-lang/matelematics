"use client";

import {
  AlertTriangle,
  BatteryMedium,
  Fuel,
  Gauge,
  RotateCcw,
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
} from "../../components/supabase";

import {
  useDashboardAccess,
} from "../DashboardAccessContext";


type AlertSeverity =
  | "critical"
  | "high"
  | "medium"
  | "info";


type Setting = {
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

  value:
    number;

  enabled:
    boolean;

  severity:
    AlertSeverity;

  source:
    "platform" |
    "company";

  enabledSource:
    "platform" |
    "company";

  min:
    number;

  max:
    number;

  step:
    number;

  updatedAt:
    string |
    null;
};


type Company = {
  id: string;
  name: string;
};


type Payload = {
  companies:
    Company[];

  selectedCompanyId:
    string |
    null;

  settings:
    Setting[];

  canManage:
    boolean;
};


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


export default function AlertSettingsPanel() {
  const {
    identity,
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
    >(
      null,
    );

  const [
    values,
    setValues,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const [
    enabledValues,
    setEnabledValues,
  ] =
    useState<
      Record<
        string,
        boolean
      >
    >({});

  const [
    severityValues,
    setSeverityValues,
  ] =
    useState<
      Record<
        string,
        AlertSeverity
      >
    >({});

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] =
    useState("");

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
      async (
        companyId?:
          string,
      ) => {
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

          const suffix =
            companyId
              ? `?companyId=${encodeURIComponent(
                  companyId,
                )}`
              : "";

          const response =
            await fetch(
              `/api/alert-settings${suffix}`,
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
              "Configuration des alertes indisponible.",
            );
          }

          const nextPayload =
            data as Payload;

          setPayload(
            nextPayload,
          );

          setSelectedCompanyId(
            nextPayload
              .selectedCompanyId ??
            "",
          );

          const nextValues:
            Record<
              string,
              string
            > = {};

          const nextEnabled:
            Record<
              string,
              boolean
            > = {};

          const nextSeverity:
            Record<
              string,
              AlertSeverity
            > = {};

          for (
            const setting of
            nextPayload.settings
          ) {
            nextValues[
              setting.key
            ] =
              String(
                setting.value,
              );

            nextEnabled[
              setting.key
            ] =
              setting.enabled;

            nextSeverity[
              setting.key
            ] =
              setting.severity;
          }

          setValues(
            nextValues,
          );

          setEnabledValues(
            nextEnabled,
          );

          setSeverityValues(
            nextSeverity,
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


  async function send(
    body:
      Record<
        string,
        unknown
      >,
  ) {
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
            JSON.stringify(
              body,
            ),
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

    return data;
  }


  async function save() {
    if (
      !payload ||
      !selectedCompanyId
    ) {
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
            enabled:
              boolean;

            value:
              number;

            severity:
              AlertSeverity;
          }
        > = {};

      for (
        const rule of
        payload.settings
      ) {
        const value =
          Number(
            values[
              rule.key
            ],
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
          enabled:
            enabledValues[
              rule.key
            ] ??
            true,

          value,

          severity:
            severityValues[
              rule.key
            ] ??
            rule.platformSeverity,
        };
      }

      await send({
        companyId:
          selectedCompanyId,

        settings,
      });

      setMessage(
        "Configuration des alertes enregistrée.",
      );

      await load(
        selectedCompanyId,
      );

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


  async function reset() {
    if (
      !selectedCompanyId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Réinitialiser les règles aux valeurs plateforme ?",
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await send({
        companyId:
          selectedCompanyId,

        action:
          "reset",
      });

      setMessage(
        "Valeurs plateforme restaurées.",
      );

      await load(
        selectedCompanyId,
      );

    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Réinitialisation impossible.",
      );

    } finally {
      setSaving(false);
    }
  }


  const showCompanySelector =
    identity.role ===
      "matelematics_admin" ||
    identity.role ===
      "partner_admin";


  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-900">

      <div className="border-b border-slate-800 px-5 py-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
            </div>

            <div>

              <h2 className="font-semibold text-white">
                Configuration des alertes
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Activez ou désactivez les règles et définissez les seuils globaux de l'entreprise.
              </p>

            </div>

          </div>


          {showCompanySelector &&
            payload &&
            payload.companies.length >
              0 && (

            <select
              value={
                selectedCompanyId
              }
              onChange={
                (
                  event,
                ) => {
                  const companyId =
                    event.target.value;

                  setSelectedCompanyId(
                    companyId,
                  );

                  void load(
                    companyId,
                  );
                }
              }
              className="min-w-[240px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none"
            >
              {payload.companies.map(
                (company) => (
                  <option
                    key={
                      company.id
                    }
                    value={
                      company.id
                    }
                  >
                    {company.name}
                  </option>
                ),
              )}
            </select>
          )}

        </div>

      </div>


      {error && (
        <div className="mx-5 mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}


      {message && (
        <div className="mx-5 mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          {message}
        </div>
      )}


      {loading ? (

        <div className="p-8 text-sm text-slate-400">
          Chargement des règles d'alerte...
        </div>

      ) : !payload ||
        payload.settings.length ===
          0 ? (

        <div className="p-8 text-sm text-slate-400">
          Aucune configuration d'alerte disponible.
        </div>

      ) : (

        <>

          <div className="grid gap-4 p-5 lg:grid-cols-2">

            {payload.settings.map(
              (rule) => {

                const enabled =
                  enabledValues[
                    rule.key
                  ] ??
                  true;

                return (

                  <div
                    key={
                      rule.key
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-start gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                          <RuleIcon
                            ruleKey={
                              rule.key
                            }
                          />
                        </div>

                        <div>

                          <p className="text-sm font-semibold text-white">
                            {rule.label}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {rule.description}
                          </p>

                        </div>

                      </div>


                      <span
                        className={
                          rule.source ===
                          "company"
                            ? "shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300"
                            : "shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-400"
                        }
                      >
                        {rule.source ===
                        "company"
                          ? "Valeur client"
                          : "Valeur plateforme"}
                      </span>

                    </div>


                    <div className="mt-4 flex flex-wrap items-center gap-3">

                      <button
                        type="button"
                        disabled={
                          !canUpdate ||
                          !payload.canManage ||
                          saving
                        }
                        onClick={
                          () =>
                            setEnabledValues(
                              (
                                current,
                              ) => ({
                                ...current,

                                [rule.key]:
                                  !enabled,
                              }),
                            )
                        }
                        className={
                          enabled
                            ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300"
                            : "rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400"
                        }
                      >
                        {enabled
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
                        disabled={
                          !canUpdate ||
                          !payload.canManage ||
                          saving
                        }
                        value={
                          values[
                            rule.key
                          ] ??
                          ""
                        }
                        onChange={
                          (
                            event,
                          ) =>
                            setValues(
                              (
                                current,
                              ) => ({
                                ...current,

                                [rule.key]:
                                  event.target.value,
                              }),
                            )
                        }
                        className="w-32 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-medium text-white outline-none transition focus:border-blue-500 disabled:opacity-60"
                      />

                      <span className="text-sm text-slate-400">
                        {rule.unit}
                      </span>

                      <select
                        value={
                          severityValues[
                            rule.key
                          ] ??
                          rule.platformSeverity
                        }
                        disabled={
                          !canUpdate ||
                          !payload.canManage ||
                          saving
                        }
                        onChange={
                          (
                            event,
                          ) =>
                            setSeverityValues(
                              (
                                current,
                              ) => ({
                                ...current,

                                [rule.key]:
                                  event.target.value as AlertSeverity,
                              }),
                            )
                        }
                        className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-60"
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

                    </div>


                    <div className="mt-3 text-xs text-slate-600">
                      Plateforme : {rule.platformEnabled ? "Activée" : "Désactivée"} · {rule.platformValue} {rule.unit}
                    </div>

                  </div>
                );
              },
            )}

          </div>


          <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-slate-500">
              Priorité : véhicule &gt; client &gt; plateforme.
            </p>


            {canUpdate &&
              payload.canManage && (

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    () =>
                      void reset()
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Valeurs plateforme
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    () =>
                      void save()
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />

                  {saving
                    ? "Enregistrement..."
                    : "Enregistrer"}
                </button>

              </div>
            )}

          </div>

        </>
      )}

    </section>
  );
}