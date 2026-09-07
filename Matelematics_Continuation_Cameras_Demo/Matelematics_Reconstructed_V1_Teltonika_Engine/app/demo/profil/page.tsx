"use client";

import { useState } from "react";
import {
  Camera,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
} from "lucide-react";

export default function DemoProfilPage() {
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
                Compte utilisateur — Démonstration
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Mon profil
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Consultez et modifiez les informations de votre profil.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
            <User className="h-5 w-5 text-cyan-400" />

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


      {/* PROFIL */}

      <section className="grid gap-6 lg:grid-cols-3">

        {/* CARTE PROFIL */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

          <div className="flex flex-col items-center text-center">

            <div className="relative">

              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/20">
                <User className="h-12 w-12 text-white" />
              </div>

              <button
                type="button"
                onClick={() =>
                  window.alert(
                    "Modification de la photo desactivee en mode demo."
                  )
                }
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-4 border-zinc-950 bg-cyan-500 text-white transition hover:bg-cyan-400"
                title="Modifier la photo"
              >
                <Camera className="h-4 w-4" />
              </button>

            </div>

            <h2 className="mt-5 text-xl font-semibold text-white">
              Ali Belgamra
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Administrateur
            </p>

            <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              <span className="text-xs font-medium text-emerald-400">
                Compte actif
              </span>
            </div>

          </div>


          <div className="mt-8 space-y-4 border-t border-zinc-800 pt-6">

            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-zinc-500" />

              <div>
                <p className="text-[11px] text-zinc-600">
                  E-mail
                </p>

                <p className="text-sm text-zinc-300">
                  contact@matelematics.com
                </p>
              </div>
            </div>


            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-zinc-500" />

              <div>
                <p className="text-[11px] text-zinc-600">
                  Téléphone
                </p>

                <p className="text-sm text-zinc-300">
                  +212 6 00 00 00 00
                </p>
              </div>
            </div>


            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-zinc-500" />

              <div>
                <p className="text-[11px] text-zinc-600">
                  Localisation
                </p>

                <p className="text-sm text-zinc-300">
                  Casablanca, Maroc
                </p>
              </div>
            </div>

          </div>

        </div>


        {/* INFORMATIONS */}

        <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-950">

          <div className="border-b border-zinc-800 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <User className="h-5 w-5 text-blue-400" />
              </div>

              <div>

                <h2 className="font-semibold text-white">
                  Informations personnelles
                </h2>

                <p className="text-xs text-zinc-500">
                  Informations du compte administrateur
                </p>

              </div>

            </div>

          </div>


          <div className="space-y-5 p-5">

            <div className="grid gap-5 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Prénom
                </label>

                <input
                  type="text"
                  defaultValue="Ali"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                />
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Nom
                </label>

                <input
                  type="text"
                  defaultValue="Belgamra"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                />
              </div>

            </div>


            <div className="grid gap-5 md:grid-cols-2">

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


              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Téléphone
                </label>

                <input
                  type="tel"
                  defaultValue="+212 6 00 00 00 00"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                />
              </div>

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Fonction
              </label>

              <input
                type="text"
                defaultValue="Administrateur"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              />

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Adresse
              </label>

              <input
                type="text"
                defaultValue="Casablanca, Maroc"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
              />

            </div>

          </div>

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
                Sécurité du compte
              </h2>

              <p className="text-xs text-zinc-500">
                Informations de sécurité
              </p>

            </div>

          </div>

        </div>


        <div className="grid gap-4 p-5 md:grid-cols-2">

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">

            <p className="text-sm font-medium text-white">
              Mot de passe
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Dernière modification il y a 30 jours.
            </p>

            <button
              type="button"
              onClick={() =>
                window.alert(
                  "Modification du mot de passe desactivee en mode demo."
                )
              }
              className="mt-4 rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            >
              Modifier le mot de passe
            </button>

          </div>


          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">

            <div className="flex items-center gap-2">

              <CheckCircle2 className="h-4 w-4 text-emerald-400" />

              <p className="text-sm font-medium text-white">
                Authentification
              </p>

            </div>

            <p className="mt-1 text-xs text-zinc-500">
              Compte protégé et opérationnel.
            </p>

            <span className="mt-4 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              Sécurisé
            </span>

          </div>

        </div>

      </section>


      {/* SAUVEGARDE */}

      <section className="flex flex-col gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="font-semibold text-cyan-300">
            Profil de démonstration
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Les modifications sont simulées et ne sont pas enregistrées.
          </p>
        </div>


        <button
          type="button"
          onClick={handleSave}
          className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
        >
          <Save className="h-4 w-4" />

          {saved ? "Profil enregistré" : "Enregistrer"}
        </button>

      </section>

    </div>
  );
}