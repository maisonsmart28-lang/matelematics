"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Headphones,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";

export default function DemoContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSent(true);

    setTimeout(() => {
      setSent(false);
    }, 3000);
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
                Contact — Démonstration
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Contactez-nous
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Une question concernant Matelematics ? Notre équipe est là
              pour vous accompagner.
            </p>

          </div>

          <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">

            <MessageSquare className="h-5 w-5 text-cyan-400" />

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


      {/* CONTACT + FORMULAIRE */}

      <section className="grid gap-6 lg:grid-cols-3">

        {/* INFORMATIONS */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">

          <div className="mb-6">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
              <Headphones className="h-5 w-5 text-cyan-400" />
            </div>

            <h2 className="mt-4 text-xl font-semibold text-white">
              Parlons de votre flotte
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Notre équipe peut vous renseigner sur la télématique,
              le suivi GPS et les solutions de gestion de flotte.
            </p>

          </div>


          <div className="space-y-5">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900">
                <Phone className="h-4 w-4 text-zinc-400" />
              </div>

              <div>

                <p className="text-xs text-zinc-600">
                  Téléphone
                </p>

                <p className="mt-1 text-sm font-medium text-zinc-300">
                  +212 6 00 00 00 00
                </p>

              </div>

            </div>


            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900">
                <Mail className="h-4 w-4 text-zinc-400" />
              </div>

              <div>

                <p className="text-xs text-zinc-600">
                  E-mail
                </p>

                <p className="mt-1 text-sm font-medium text-zinc-300">
                  contact@matelematics.com
                </p>

              </div>

            </div>


            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900">
                <MapPin className="h-4 w-4 text-zinc-400" />
              </div>

              <div>

                <p className="text-xs text-zinc-600">
                  Localisation
                </p>

                <p className="mt-1 text-sm font-medium text-zinc-300">
                  Casablanca, Maroc
                </p>

              </div>

            </div>


            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900">
                <Clock className="h-4 w-4 text-zinc-400" />
              </div>

              <div>

                <p className="text-xs text-zinc-600">
                  Disponibilité
                </p>

                <p className="mt-1 text-sm font-medium text-zinc-300">
                  Lundi — Vendredi
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  09:00 — 18:00
                </p>

              </div>

            </div>

          </div>

        </div>


        {/* FORMULAIRE */}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 lg:col-span-2">

          <div className="border-b border-zinc-800 p-5">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Send className="h-5 w-5 text-blue-400" />
              </div>

              <div>

                <h2 className="font-semibold text-white">
                  Envoyer un message
                </h2>

                <p className="text-xs text-zinc-500">
                  Remplissez le formulaire ci-dessous.
                </p>

              </div>

            </div>

          </div>


          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-5"
          >

            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Nom complet
                </label>

                <input
                  type="text"
                  required
                  placeholder="Votre nom"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Adresse e-mail
                </label>

                <input
                  type="email"
                  required
                  placeholder="votre@email.com"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
                />

              </div>

            </div>


            <div className="grid gap-5 md:grid-cols-2">

              <div>

                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Téléphone
                </label>

                <input
                  type="tel"
                  placeholder="+212 6..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
                />

              </div>


              <div>

                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  Sujet
                </label>

                <select
                  defaultValue="information"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
                >
                  <option value="information">
                    Demande d'information
                  </option>

                  <option value="demo">
                    Demander une démonstration
                  </option>

                  <option value="support">
                    Assistance
                  </option>

                  <option value="commercial">
                    Demande commerciale
                  </option>
                </select>

              </div>

            </div>


            <div>

              <label className="mb-2 block text-sm font-medium text-zinc-300">
                Message
              </label>

              <textarea
                required
                rows={6}
                placeholder="Comment pouvons-nous vous aider ?"
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
              />

            </div>


            {sent && (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">

                <CheckCircle2 className="h-5 w-5 text-emerald-400" />

                <div>

                  <p className="text-sm font-medium text-emerald-300">
                    Message envoyé
                  </p>

                  <p className="text-xs text-zinc-500">
                    Ceci est une simulation dans le mode démonstration.
                  </p>

                </div>

              </div>
            )}


            <div className="flex justify-end border-t border-zinc-800 pt-5">

              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                <Send className="h-4 w-4" />
                Envoyer le message
              </button>

            </div>

          </form>

        </div>

      </section>


      {/* BANDEAU */}

      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">

        <div className="flex items-start gap-3">

          <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />

          <div>

            <h3 className="font-semibold text-cyan-300">
              Page de démonstration
            </h3>

            <p className="mt-1 text-sm text-zinc-400">
              Le formulaire présenté ici est interactif mais n'envoie
              aucun message réel. Dans la version connectée, les demandes
              seront traitées par le système Matelematics.
            </p>

          </div>

        </div>

      </section>

    </div>
  );
}