"use client";

import AlertSettingsPanel from "./AlertSettingsPanel";

import { useState } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  Globe,
  Lock,
  Mail,
  Moon,
  Save,
  Shield,
  User,
  Smartphone,
  MapPin,
} from "lucide-react";

type Section =
  | "profil"
  | "entreprise"
  | "notifications"
  | "securite"
  | "preferences";

export default function ParametresPage() {
  const [activeSection, setActiveSection] =
    useState<Section>("profil");

  const [saved, setSaved] = useState(false);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [speedAlerts, setSpeedAlerts] = useState(true);
  const [geozoneAlerts, setGeozoneAlerts] = useState(true);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true);

  function saveSettings() {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  const sections = [
    {
      id: "profil" as Section,
      title: "Mon profil",
      description: "Informations personnelles",
      icon: User,
    },
    {
      id: "entreprise" as Section,
      title: "Entreprise",
      description: "Informations de votre société",
      icon: Building2,
    },
    {
      id: "notifications" as Section,
      title: "Notifications",
      description: "Alertes et préférences",
      icon: Bell,
    },
    {
      id: "securite" as Section,
      title: "Sécurité",
      description: "Mot de passe et accès",
      icon: Shield,
    },
    {
      id: "preferences" as Section,
      title: "Préférences",
      description: "Langue et affichage",
      icon: Globe,
    },
  ];

  return (
    <div className="space-y-6">

      {/* ALERT ENGINE V1.2B-1 */}
      <AlertSettingsPanel />

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <Shield className="h-6 w-6 text-blue-400" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-white">
              Paramètres
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Gérez votre compte, votre entreprise et les préférences de votre plateforme.
            </p>
          </div>

        </div>
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">

        {/* SIDEBAR SETTINGS */}
        <aside className="h-fit overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Configuration
            </p>
          </div>

          <div className="p-2">

            {sections.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition ${
                    active
                      ? "bg-blue-600/10 text-blue-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >

                  <Icon className="h-5 w-5 shrink-0" />

                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-medium">
                      {section.title}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {section.description}
                    </p>

                  </div>

                  <ChevronRight
                    className={`h-4 w-4 ${
                      active ? "text-blue-400" : "text-slate-700"
                    }`}
                  />

                </button>
              );
            })}

          </div>

        </aside>

        {/* MAIN PANEL */}
        <main className="min-w-0">

          {/* PROFIL */}
          {activeSection === "profil" && (
            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white">
                  Mon profil
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Gérez les informations de votre compte administrateur.
                </p>
              </div>

              <div className="space-y-6 p-6">

                <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4">

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-xl font-semibold text-white">
                    AB
                  </div>

                  <div>
                    <p className="font-medium text-white">
                      Ali Belgamra
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Administrateur
                    </p>
                  </div>

                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Prénom
                    </label>

                    <input
                      defaultValue="Ali"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Nom
                    </label>

                    <input
                      defaultValue="Belgamra"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Adresse e-mail
                    </label>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                      <input
                        defaultValue="admin@matelematics.com"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Téléphone
                    </label>

                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />

                      <input
                        defaultValue="+212 6 00 00 00 00"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                </div>

                <SaveButton
                  saved={saved}
                  onClick={saveSettings}
                />

              </div>

            </section>
          )}

          {/* ENTREPRISE */}
          {activeSection === "entreprise" && (
            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white">
                  Informations de l'entreprise
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Configurez les informations utilisées sur votre espace Matelematics.
                </p>
              </div>

              <div className="space-y-6 p-6">

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="flex gap-3">

                    <Building2 className="h-5 w-5 text-blue-400" />

                    <div>
                      <p className="text-sm font-medium text-white">
                        Compte entreprise
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Ces informations pourront être utilisées pour vos rapports,
                        factures et documents générés par la plateforme.
                      </p>
                    </div>

                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <Input label="Nom de l'entreprise" value="Matelematics" />

                  <Input label="Secteur d'activité" value="Télématique & gestion de flotte" />

                  <Input label="E-mail professionnel" value="contact@matelematics.com" />

                  <Input label="Téléphone" value="+212 5 22 00 00 00" />

                  <Input label="Ville" value="Casablanca" />

                  <Input label="Pays" value="Maroc" />

                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Adresse
                  </label>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-slate-600" />

                    <input
                      defaultValue="Casablanca, Maroc"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <SaveButton
                  saved={saved}
                  onClick={saveSettings}
                />

              </div>

            </section>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === "notifications" && (
            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Choisissez les événements pour lesquels vous souhaitez recevoir une notification.
                </p>
              </div>

              <div className="divide-y divide-slate-800">

                <ToggleRow
                  icon={Mail}
                  title="Notifications par e-mail"
                  description="Recevoir les alertes importantes par e-mail."
                  enabled={emailAlerts}
                  onChange={setEmailAlerts}
                />

                <ToggleRow
                  icon={Bell}
                  title="Excès de vitesse"
                  description="Être averti lorsqu'un véhicule dépasse la vitesse configurée."
                  enabled={speedAlerts}
                  onChange={setSpeedAlerts}
                />

                <ToggleRow
                  icon={MapPin}
                  title="Entrée / sortie de géozone"
                  description="Recevoir une alerte lorsqu'un véhicule entre ou sort d'une zone."
                  enabled={geozoneAlerts}
                  onChange={setGeozoneAlerts}
                />

                <ToggleRow
                  icon={Shield}
                  title="Maintenance"
                  description="Recevoir les rappels concernant les opérations de maintenance."
                  enabled={maintenanceAlerts}
                  onChange={setMaintenanceAlerts}
                />

              </div>

              <div className="border-t border-slate-800 p-6">

                <SaveButton
                  saved={saved}
                  onClick={saveSettings}
                />

              </div>

            </section>
          )}

          {/* SECURITE */}
          {activeSection === "securite" && (
            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white">
                  Sécurité
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Protégez votre compte et contrôlez vos accès.
                </p>
              </div>

              <div className="space-y-6 p-6">

                <div className="flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">
                      Compte protégé
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Votre compte administrateur est actuellement actif.
                    </p>
                  </div>

                </div>

                <div className="space-y-5">

                  <Input
                    label="Mot de passe actuel"
                    value=""
                    placeholder="••••••••"
                    type="password"
                  />

                  <Input
                    label="Nouveau mot de passe"
                    value=""
                    placeholder="••••••••"
                    type="password"
                  />

                  <Input
                    label="Confirmer le nouveau mot de passe"
                    value=""
                    placeholder="••••••••"
                    type="password"
                  />

                </div>

                <button
                  type="button"
                  onClick={saveSettings}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  <Lock className="h-4 w-4" />
                  Modifier le mot de passe
                </button>

              </div>

            </section>
          )}

          {/* PREFERENCES */}
          {activeSection === "preferences" && (
            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white">
                  Préférences
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Personnalisez l'expérience Matelematics.
                </p>
              </div>

              <div className="space-y-6 p-6">

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Langue
                    </label>

                    <select className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500">
                      <option>Français</option>
                      <option>English</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Fuseau horaire
                    </label>

                    <select className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500">
                      <option>GMT+01:00 — Casablanca</option>
                      <option>GMT+00:00 — Londres</option>
                    </select>
                  </div>

                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">

                  <div className="flex items-center gap-3">

                    <Moon className="h-5 w-5 text-blue-400" />

                    <div>
                      <p className="text-sm font-medium text-white">
                        Mode sombre
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        L'interface Matelematics utilise actuellement le mode sombre.
                      </p>
                    </div>

                    <div className="ml-auto flex h-6 w-11 items-center rounded-full bg-blue-600 p-1">
                      <div className="ml-auto h-4 w-4 rounded-full bg-white" />
                    </div>

                  </div>

                </div>

                <SaveButton
                  saved={saved}
                  onClick={saveSettings}
                />

              </div>

            </section>
          )}

        </main>

      </div>

    </div>
  );
}

/* COMPONENTS */

function Input({
  label,
  value,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        defaultValue={value}
        placeholder={placeholder}
        type={type}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-blue-500"
      />
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 p-5">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>

      <div className="min-w-0 flex-1">

        <p className="text-sm font-medium text-white">
          {title}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>

      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition ${
          enabled ? "bg-blue-600" : "bg-slate-700"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${
            enabled ? "ml-auto" : "ml-0"
          }`}
        />
      </button>

    </div>
  );
}

function SaveButton({
  saved,
  onClick,
}: {
  saved: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/10 transition hover:bg-blue-500"
    >
      {saved ? (
        <>
          <Check className="h-4 w-4" />
          Modifications enregistrées
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Enregistrer les modifications
        </>
      )}
    </button>
  );
}