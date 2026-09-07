"use client";

import { motion } from "framer-motion";
import {
  Truck,
  Radio,
  Database,
  BrainCircuit,
  BellRing,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Installation",
    subtitle: "Votre véhicule devient connecté",
    description:
      "Un dispositif connecté est installé sur votre véhicule afin de collecter les informations essentielles à la gestion de votre flotte.",
    icon: Truck,
    color: "blue",
  },
  {
    number: "02",
    title: "Transmission",
    subtitle: "Les données remontent automatiquement",
    description:
      "Les informations du véhicule sont transmises de manière sécurisée vers votre plateforme Matelematics.",
    icon: Radio,
    color: "cyan",
  },
  {
    number: "03",
    title: "Centralisation",
    subtitle: "Toutes vos données au même endroit",
    description:
      "Positions, trajets, événements et données disponibles du véhicule sont centralisés dans votre espace de gestion.",
    icon: Database,
    color: "indigo",
  },
  {
    number: "04",
    title: "Analyse",
    subtitle: "La donnée devient une information",
    description:
      "Les données collectées sont transformées en indicateurs simples et exploitables pour mieux comprendre votre flotte.",
    icon: BrainCircuit,
    color: "violet",
  },
  {
    number: "05",
    title: "Alertes",
    subtitle: "Vous êtes informé au bon moment",
    description:
      "Les événements importants peuvent déclencher des alertes afin de vous permettre de réagir rapidement.",
    icon: BellRing,
    color: "amber",
  },
  {
    number: "06",
    title: "Décision",
    subtitle: "Vous pilotez votre flotte",
    description:
      "Rapports, historiques et indicateurs vous donnent une vision claire pour améliorer la performance de votre activité.",
    icon: BarChart3,
    color: "emerald",
  },
];

const colorStyles: Record<
  string,
  {
    icon: string;
    number: string;
    line: string;
    glow: string;
  }
> = {
  blue: {
    icon: "bg-blue-50 text-blue-600 border-blue-100",
    number: "text-blue-600",
    line: "bg-blue-500",
    glow: "shadow-blue-500/20",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-600 border-cyan-100",
    number: "text-cyan-600",
    line: "bg-cyan-500",
    glow: "shadow-cyan-500/20",
  },
  indigo: {
    icon: "bg-indigo-50 text-indigo-600 border-indigo-100",
    number: "text-indigo-600",
    line: "bg-indigo-500",
    glow: "shadow-indigo-500/20",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600 border-violet-100",
    number: "text-violet-600",
    line: "bg-violet-500",
    glow: "shadow-violet-500/20",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 border-amber-100",
    number: "text-amber-600",
    line: "bg-amber-500",
    glow: "shadow-amber-500/20",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 border-emerald-100",
    number: "text-emerald-600",
    line: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
  },
};

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-slate-50 px-6 py-20 md:py-28">
      
      {/* Décorations d'arrière-plan */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute -right-32 bottom-20 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">

        {/* EN-TÊTE */}
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Fonctionnement
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Comment fonctionne{" "}
            <span className="text-blue-600">Matelematics</span> ?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            De votre véhicule à une gestion intelligente de votre flotte.
            Matelematics transforme les données de vos véhicules en
            informations utiles pour votre activité.
          </p>
        </motion.div>

        {/* FLUX CENTRAL DES DONNÉES */}
        <motion.div
          className="mx-auto mt-16 max-w-5xl"
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 px-6 py-8 shadow-2xl md:px-10">
            
            {/* Glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />

            <div className="relative">
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-400">
                    Flux de données
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Du véhicule à votre décision
                  </p>
                </div>

                <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-300 sm:flex">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Système actif
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 md:flex-nowrap md:gap-2">

                {[
                  { icon: Truck, label: "Véhicule" },
                  { icon: Radio, label: "Transmission" },
                  { icon: Database, label: "Données" },
                  { icon: BrainCircuit, label: "Analyse" },
                  { icon: BellRing, label: "Alertes" },
                  { icon: BarChart3, label: "Décision" },
                ].map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                        whileHover={{
                          y: -3,
                          backgroundColor: "rgba(255,255,255,0.10)",
                        }}
                      >
                        <Icon className="h-4 w-4 text-blue-400" />
                        <span className="text-xs font-medium text-slate-200">
                          {item.label}
                        </span>
                      </motion.div>

                      {index < 5 && (
                        <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-600 md:block" />
                      )}
                    </div>
                  );
                })}

              </div>

              {/* Particules animées */}
              <div className="relative mt-7 h-1 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="absolute left-0 top-0 h-full w-24 rounded-full bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                  animate={{ x: ["-100%", "500%"] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* TIMELINE DES ÉTAPES */}
        <div className="relative mt-16">

          {/* Ligne desktop */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-blue-200 via-blue-300 to-emerald-200 lg:block" />

          <div className="space-y-8 lg:space-y-12">

            {steps.map((step, index) => {
              const Icon = step.icon;
              const style = colorStyles[step.color];
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={step.number}
                  className="relative"
                  initial={{
                    opacity: 0,
                    x: isEven ? -35 : 35,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                  }}
                  viewport={{
                    once: true,
                    amount: 0.2,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.08,
                  }}
                >

                  {/* Point central desktop */}
                  <div className="absolute left-1/2 top-10 z-20 hidden h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-4 border-slate-50 bg-blue-600 shadow-lg lg:flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </div>

                  {/* Carte */}
                  <div
                    className={`grid items-center gap-6 lg:grid-cols-2 lg:gap-20 ${
                      isEven ? "" : "lg:[&>*:first-child]:order-2"
                    }`}
                  >

                    {/* Texte */}
                    <div
                      className={`rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-8 ${
                        style.glow
                      }`}
                    >
                      <div className="flex items-start gap-5">

                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${style.icon}`}
                        >
                          <Icon className="h-7 w-7" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs font-bold tracking-[0.18em] ${style.number}`}
                            >
                              {step.number}
                            </span>

                            <span className="h-px flex-1 bg-slate-100" />
                          </div>

                          <h3 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">
                            {step.title}
                          </h3>

                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {step.subtitle}
                          </p>

                          <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                            {step.description}
                          </p>

                        </div>
                      </div>

                      <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs font-medium text-slate-500">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        Intégré à votre plateforme Matelematics
                      </div>
                    </div>

                    {/* Zone visuelle */}
                    <div className="hidden lg:flex lg:items-center lg:justify-center">

                      <motion.div
                        className="relative flex h-48 w-64 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm"
                        whileHover={{
                          scale: 1.03,
                          y: -4,
                        }}
                      >
                        <div
                          className={`absolute inset-8 rounded-full blur-2xl ${style.icon
                            .split(" ")[0]
                            .replace("bg-", "bg-")}/40`}
                        />

                        <div
                          className={`relative flex h-24 w-24 items-center justify-center rounded-3xl border ${style.icon} shadow-lg`}
                        >
                          <Icon className="h-12 w-12" />
                        </div>

                        {/* Petits points décoratifs */}
                        <motion.span
                          className="absolute left-8 top-8 h-2 w-2 rounded-full bg-blue-400"
                          animate={{
                            y: [0, -8, 0],
                            opacity: [0.4, 1, 0.4],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.15,
                          }}
                        />

                        <motion.span
                          className="absolute bottom-8 right-8 h-2 w-2 rounded-full bg-cyan-400"
                          animate={{
                            y: [0, 8, 0],
                            opacity: [0.4, 1, 0.4],
                          }}
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                            delay: index * 0.2,
                          }}
                        />

                        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          {step.title}
                        </span>
                      </motion.div>

                    </div>

                  </div>
                </motion.div>
              );
            })}

          </div>
        </div>

        {/* CONCLUSION */}
        <motion.div
          className="mx-auto mt-20 max-w-4xl"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative overflow-hidden rounded-3xl bg-blue-600 px-7 py-10 text-center text-white shadow-2xl shadow-blue-600/20 md:px-12 md:py-12">

            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-blue-400/20 blur-2xl" />

            <div className="relative">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
                Une plateforme. Une vision.
              </span>

              <h3 className="mt-3 text-2xl font-bold md:text-3xl">
                Vos données travaillent pour vous.
              </h3>

              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-100 md:text-base">
                Matelematics vous donne les informations nécessaires pour
                comprendre votre flotte, anticiper les événements et prendre
                de meilleures décisions.
              </p>

              <a
                href="/demo"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-600 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Découvrir la plateforme
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}