"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Headphones,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  LifeBuoy,
} from "lucide-react";

const faqs = [
  {
    question: "Comment ajouter un véhicule à ma flotte ?",
    answer:
      "Dans la plateforme, accédez à la section Véhicules puis utilisez l'option d'ajout d'un nouveau véhicule. Vous pourrez ensuite associer votre équipement télématique au véhicule.",
  },
  {
    question: "Comment fonctionne la géolocalisation ?",
    answer:
      "Les véhicules équipés d'un dispositif GPS transmettent leur position à la plateforme. Celle-ci permet ensuite de visualiser les véhicules sur la carte et de consulter leur historique.",
  },
  {
    question: "Puis-je recevoir des alertes en temps réel ?",
    answer:
      "Oui. Les alertes permettent notamment de surveiller les excès de vitesse, les entrées et sorties de géozones, les immobilisations et différents événements liés aux véhicules.",
  },
  {
    question: "Comment consulter les rapports ?",
    answer:
      "La section Rapports permet de consulter les données de votre flotte et de générer des analyses selon les informations disponibles.",
  },
  {
    question: "Que faire si un véhicule apparaît hors ligne ?",
    answer:
      "Vérifiez d'abord l'alimentation du dispositif et la couverture réseau. Si le problème persiste, contactez le support afin que nous puissions vous accompagner dans le diagnostic.",
  },
];

export default function DemoSupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="space-y-8 pb-10">

      {/* EN-TÊTE */}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/30 p-6 shadow-xl sm:p-8">

        <div className="max-w-3xl">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
            <Headphones className="h-4 w-4" />
            Centre de support
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Comment pouvons-nous vous aider ?
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Retrouvez les informations essentielles pour utiliser
            Matelematics et contactez notre équipe si vous avez besoin
            d'assistance.
          </p>

          <div className="mt-6 flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Support disponible
          </div>

        </div>

      </section>


      {/* CONTACT SUPPORT */}

      <section>

        <div className="mb-6">

          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Assistance
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Contactez notre équipe
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Plusieurs moyens sont disponibles pour obtenir de l'aide.
          </p>

        </div>


        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {/* CHAT */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-blue-500/30">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <MessageCircle className="h-5 w-5 text-blue-400" />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">
              Assistance en ligne
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Échangez avec notre équipe pour obtenir une assistance
              concernant votre plateforme.
            </p>

            <button
              type="button"
              onClick={() =>
                alert("Le chat sera disponible dans la version complète.")
              }
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Démarrer une conversation
              <ArrowRight className="h-4 w-4" />
            </button>

          </div>


          {/* EMAIL */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-cyan-500/30">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
              <Mail className="h-5 w-5 text-cyan-400" />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">
              Assistance par e-mail
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Envoyez-nous votre demande et notre équipe vous répondra
              dans les meilleurs délais.
            </p>

            <a
              href="mailto:support@matelematics.com"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300"
            >
              support@matelematics.com
              <ArrowRight className="h-4 w-4" />
            </a>

          </div>


          {/* TELEPHONE */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-emerald-500/30">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <Phone className="h-5 w-5 text-emerald-400" />
            </div>

            <h3 className="mt-5 text-lg font-semibold text-white">
              Assistance téléphonique
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Notre équipe peut vous accompagner pour les demandes
              techniques et opérationnelles.
            </p>

            <a
              href="tel:+212000000000"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              +212 00 00 00 00
              <ArrowRight className="h-4 w-4" />
            </a>

          </div>

        </div>

      </section>


      {/* HORAIRES */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Horaires du support
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Notre équipe vous accompagne pendant les heures ouvrées.
              </p>
            </div>

          </div>

          <div className="text-left sm:text-right">

            <p className="text-sm font-medium text-slate-300">
              Lundi — Vendredi
            </p>

            <p className="mt-1 text-sm text-emerald-400">
              08:30 — 18:00
            </p>

          </div>

        </div>

      </section>


      {/* FAQ */}

      <section>

        <div className="mb-6">

          <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">
            FAQ
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Questions fréquentes
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Quelques réponses aux questions les plus courantes.
          </p>

        </div>


        <div className="space-y-3">

          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70"
              >

                <button
                  type="button"
                  onClick={() =>
                    setOpenFaq(isOpen ? null : index)
                  }
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-800/60"
                  aria-expanded={isOpen}
                >

                  <div className="flex items-center gap-3">

                    <HelpCircle className="h-5 w-5 shrink-0 text-purple-400" />

                    <span className="text-sm font-medium text-white">
                      {faq.question}
                    </span>

                  </div>

                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />

                </button>


                {isOpen && (
                  <div className="border-t border-slate-800 px-5 py-4">

                    <p className="pl-8 text-sm leading-6 text-slate-400">
                      {faq.answer}
                    </p>

                  </div>
                )}

              </div>
            );
          })}

        </div>

      </section>


      {/* GUIDES */}

      <section className="grid gap-5 md:grid-cols-2">

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10">
            <BookOpen className="h-5 w-5 text-purple-400" />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-white">
            Centre de documentation
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Consultez les guides et informations nécessaires pour mieux
            comprendre les fonctionnalités de la plateforme.
          </p>

          <button
            type="button"
            onClick={() =>
              alert("La documentation sera disponible prochainement.")
            }
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300"
          >
            Consulter la documentation
            <ArrowRight className="h-4 w-4" />
          </button>

        </div>


        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-white">
            Problème urgent ?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Si vous rencontrez un problème critique affectant votre flotte,
            contactez directement notre équipe support.
          </p>

          <Link
            href="/demo/contact"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300"
          >
            Contacter l'équipe
            <ArrowRight className="h-4 w-4" />
          </Link>

        </div>

      </section>


      {/* CTA */}

      <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-6 sm:p-8">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 sm:flex">
              <LifeBuoy className="h-5 w-5 text-blue-400" />
            </div>

            <div>

              <h2 className="text-xl font-bold text-white sm:text-2xl">
                Besoin d'une assistance personnalisée ?
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                Notre équipe est là pour vous accompagner dans la découverte
                et l'utilisation de Matelematics.
              </p>

            </div>

          </div>

          <Link
            href="/demo/contact"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Nous contacter
            <ArrowRight className="h-4 w-4" />
          </Link>

        </div>

      </section>

    </div>
  );
}