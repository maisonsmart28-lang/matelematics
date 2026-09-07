"use client";

import { useState } from "react";
import {
  Bell,
  Globe,
  Lock,
  Mail,
  Save,
  Settings,
  Shield,
  Smartphone,
  User,
} from "lucide-react";

export default function DemoParametresPage() {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}

      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 p-6 shadow-xl">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <div className="mb-2 flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-cyan-400" />

              <span className="text-xs font-medium uppercase tracking-wider text-cyan-400">
                Configuration — Démonstration
              </span>

            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Paramètres
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Configurez les préférences de votre plateforme Matelematics.
            </p>

          </div>

          <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">

            <Settings className="h-5 w-5 text-cyan-400" />

            <div>

              <p className="text-xs text-zinc-500">
                Mode
              </p>

              <p className="text-sm font-semibold text-cyan-400">
                Démonstration
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* PARAMÈTRES GÉNÉRAUX */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="border-b border-zinc-800 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Globe className="h-5 w-5 text-blue-400" />
            </div>

            <div>

              <h2 className="font-semibold text-white">
                Paramètres généraux
              </h2>

              <p className="text-xs text-zinc-500">
                Préférences générales de la plateforme
              </p>

            </div>

          </div>

        </div>

        <div className="space-y-5 p-5">

          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Nom de l'entreprise
              </label>

              <input
                type="text"
                defaultValue="Entreprise Démonstration"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Adresse e-mail
              </label>

              <input
                type="email"
                defaultValue="contact@matelematics.com"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              />

            </div>

          </div>


          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Fuseau horaire
              </label>

              <select
                defaultValue="Africa/Casablanca"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              >
                <option value="Africa/Casablanca">
                  Africa/Casablanca
                </option>

                <option value="Europe/Paris">
                  Europe/Paris
                </option>

                <option value="UTC">
                  UTC
                </option>
              </select>

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Langue
              </label>

              <select
                defaultValue="fr"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              >
                <option value="fr">
                  Français
                </option>

                <option value="ar">
                  العربية
                </option>

                <option value="en">
                  English
                </option>
              </select>

            </div>

          </div>

        </div>

      </section>


      {/* NOTIFICATIONS */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="border-b border-zinc-800 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Bell className="h-5 w-5 text-amber-400" />
            </div>

            <div>

              <h2 className="font-semibold text-white">
                Notifications
              </h2>

              <p className="text-xs text-zinc-500">
                Gérez les notifications et alertes
              </p>

            </div>

          </div>

        </div>


        <div className="divide-y divide-zinc-800">

          <SettingRow
            icon={<Bell className="h-5 w-5 text-zinc-400" />}
            title="Notifications dans la plateforme"
            description="Recevoir les alertes directement dans Matelematics."
            enabled={notifications}
            onChange={setNotifications}
          />

          <SettingRow
            icon={<Mail className="h-5 w-5 text-zinc-400" />}
            title="Alertes par e-mail"
            description="Recevoir les alertes importantes par e-mail."
            enabled={emailAlerts}
            onChange={setEmailAlerts}
          />

          <SettingRow
            icon={<Smartphone className="h-5 w-5 text-zinc-400" />}
            title="Alertes SMS"
            description="Recevoir les alertes critiques par SMS."
            enabled={smsAlerts}
            onChange={setSmsAlerts}
          />

        </div>

      </section>


      {/* SÉCURITÉ */}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950">

        <div className="border-b border-zinc-800 p-5">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-400" />
            </div>

            <div>

              <h2 className="font-semibold text-white">
                Sécurité
              </h2>

              <p className="text-xs text-zinc-500">
                Paramètres de sécurité du compte
              </p>

            </div>

          </div>

        </div>


        <div className="divide-y divide-zinc-800">

          <SettingRow
            icon={<Lock className="h-5 w-5 text-zinc-400" />}
            title="Authentification à deux facteurs"
            description="Ajouter une protection supplémentaire au compte."
            enabled={twoFactor}
            onChange={setTwoFactor}
          />

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
                <User className="h-5 w-5 text-zinc-400" />
              </div>

              <div>

                <p className="text-sm font-medium text-white">
                  Mot de passe
                </p>

                <p className="text-xs text-zinc-500">
                  Dernière modification il y a 30 jours.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                window.alert(
                  "Modification du mot de passe desactivee en mode demo."
                )
              }
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              Modifier
            </button>

          </div>

        </div>

      </section>


      {/* SAUVEGARDE */}

      <section className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <p className="font-semibold text-cyan-300">
            Paramètres de démonstration
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Les modifications sont uniquement simulées dans cette démo.
          </p>

        </div>


        <button
          type="button"
          onClick={handleSave}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
        >

          <Save className="h-4 w-4" />

          {saved ? "Paramètres enregistrés" : "Enregistrer"}

        </button>

      </section>

    </div>
  );
}


/* ============================================================= */
/* COMPOSANT SWITCH                                               */
/* ============================================================= */

function SettingRow({
  icon,
  title,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
          {icon}
        </div>

        <div>

          <p className="text-sm font-medium text-white">
            {title}
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            {description}
          </p>

        </div>

      </div>


      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-cyan-500" : "bg-zinc-700"
        }`}
      >

        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />

      </button>

    </div>
  );
}