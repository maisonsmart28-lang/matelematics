"use client";

import Link from "next/link";
import {
  Car,
  Truck,
  BarChart3,
  MapPin,
  ShieldCheck,
  Fuel,
  Users,
  Wrench,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
} from "lucide-react";

const solutions = [
  {
    title: "Gestion de flotte",
    description:
      "Centralisez la gestion de vos véhicules, conducteurs et opérations depuis une seule plateforme.",
    icon: Truck,
    features: [
      "Suivi des véhicules en temps réel",
      "Gestion des conducteurs",
      "État et disponibilité de la flotte",
      "Historique des déplacements",
    ],
  },
  {
    title: "Géolocalisation GPS",
    description:
      "Visualisez la position de vos véhicules et suivez leurs déplacements en temps réel.",
    icon: MapPin,
    features: [
      "Position GPS en temps réel",
      "Carte interactive",
      "Historique des trajets",
      "Géozones personnalisables",
    ],
  },
  {
    title: "Sécurité & Alertes",
    description:
      "Identifiez rapidement les événements importants et améliorez la sécurité de votre flotte.",
    icon: ShieldCheck,
    features: [
      "Excès de vitesse",
      "Entrée et sortie de géozone",
      "Immobilisation prolongée",
      "Alertes personnalisées",
    ],
  },
  {
    title: "Carburant",
    description:
      "Surveillez la consommation et identifiez les comportements susceptibles d'augmenter vos coûts.",
    icon: Fuel,
    features: [
      "Suivi de la consommation",
      "Analyse des tendances",
      "Détection des anomalies",
      "Réduction des coûts",
    ],
  },
  {
    title: "Conducteurs",
    description:
      "Analysez l'activité de vos conducteurs et améliorez la qualité de conduite.",
    icon: Users,
    features: [
      "Activité des conducteurs",
      "Historique des trajets",
      "Analyse des comportements",
      "Identification des risques",
    ],
  },
  {
    title: "Maintenance",
    description:
      "Anticipez les opérations d'entretien et réduisez les immobilisations imprévues.",
    icon: Wrench,
    features: [
      "Suivi des entretiens",
      "Échéances de maintenance",
      "Historique des interventions",
      "Suivi des coûts",
    ],
  },
];

const advantages = [
  {
    title: "Données en temps réel",
    description:
      "Disposez d'une vision instantanée de votre flotte et de ses activités.",
    icon: Zap,
  },
  {
    title: "Gain de temps",
    description:
      "Centralisez vos opérations afin de simplifier le travail quotidien de vos équipes.",
    icon: Clock,
  },
  {
    title: "Meilleure visibilité",
    description:
      "Transformez les données de votre flotte en informations utiles pour décider.",
    icon: BarChart3,
  },
];

export default function DemoSolutionsPage() {
  return (
    <div className="space-y-8 pb-10">

      {/* EN-TÊTE */}

      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/30 p-6 shadow-xl sm:p-8">

        <div className="max-w-3xl">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400">
            <Car className="h-4 w-4" />
            Solutions Matelematics
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Des solutions adaptées à votre flotte
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Matelematics vous permet de centraliser la gestion de vos
            véhicules, conducteurs, déplacements et données opérationnelles
            depuis une plateforme unique.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">

            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Découvrir le dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Nous contacter
            </Link>

          </div>

        </div>

      </section>


      {/* SOLUTIONS */}

      <section>

        <div className="mb-6">

          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Nos solutions
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Tout ce dont vous avez besoin pour gérer votre flotte
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Une suite complète d'outils pour suivre, analyser et optimiser
            vos opérations.
          </p>

        </div>


        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {solutions.map((solution) => {
            const Icon = solution.icon;

            return (
              <div
                key={solution.title}
                className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-slate-900"
              >

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
                  <Icon className="h-5 w-5 text-cyan-400" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-white">
                  {solution.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {solution.description}
                </p>

                <div className="mt-5 space-y-2.5">

                  {solution.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-xs text-slate-400"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </div>
                  ))}

                </div>

              </div>
            );
          })}

        </div>

      </section>


      {/* AVANTAGES */}

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">

        <div className="mb-6">

          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Pourquoi Matelematics
          </p>

          <h2 className="mt-2 text-2xl font-bold text-white">
            Une plateforme pensée pour l'efficacité
          </h2>

        </div>


        <div className="grid gap-5 md:grid-cols-3">

          {advantages.map((advantage) => {
            const Icon = advantage.icon;

            return (
              <div
                key={advantage.title}
                className="rounded-xl border border-slate-800 bg-slate-950 p-5"
              >

                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Icon className="h-5 w-5 text-emerald-400" />
                </div>

                <h3 className="mt-4 font-semibold text-white">
                  {advantage.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {advantage.description}
                </p>

              </div>
            );
          })}

        </div>

      </section>


      {/* CTA */}

      <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-6 sm:p-8">

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>

            <h2 className="text-xl font-bold text-white sm:text-2xl">
              Prêt à découvrir Matelematics ?
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Explorez la démonstration ou contactez notre équipe pour
              découvrir la solution adaptée à votre entreprise.
            </p>

          </div>

          <div className="flex shrink-0 flex-wrap gap-3">

            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Voir la démonstration
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/contact"
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Contact
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}