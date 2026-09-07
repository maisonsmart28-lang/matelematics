"use client";

import { motion } from "framer-motion";
import {
  MapPinned,
  RadioTower,
  ShieldCheck,
  BarChart3,
  Video,
  Gauge,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

const benefits = [
  {
    number: "01",
    icon: MapPinned,
    title: "Géolocalisation",
    description:
      "Visualisez vos véhicules en temps réel, suivez leurs déplacements et consultez leur historique depuis une seule plateforme.",
    label: "Position en temps réel",
  },
  {
    number: "02",
    icon: RadioTower,
    title: "Télématique",
    description:
      "Centralisez les informations disponibles de vos véhicules pour mieux comprendre leur utilisation et leur activité.",
    label: "Données véhicule",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Sécurité intelligente",
    description:
      "Détectez les événements importants et recevez des alertes pour réagir rapidement lorsque votre flotte nécessite votre attention.",
    label: "Alertes & protection",
  },
  {
    number: "04",
    icon: Video,
    title: "Vidéo intelligente",
    description:
      "Associez la télématique à la vidéo embarquée pour disposer d'une vision plus complète des événements sur la route.",
    label: "Vidéo embarquée",
  },
  {
    number: "05",
    icon: Gauge,
    title: "Données véhicule",
    description:
      "Exploitez les informations disponibles du véhicule afin de mieux suivre son utilisation, ses performances et ses événements.",
    label: "Informations techniques",
  },
  {
    number: "06",
    icon: BarChart3,
    title: "Analyse & performance",
    description:
      "Transformez les données collectées en indicateurs et rapports qui vous aident à prendre de meilleures décisions.",
    label: "Rapports & analyse",
  },
];

export default function Benefits() {
  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-24 md:py-32">
      {/* Arrière-plan */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* INTRODUCTION */}
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            Pourquoi Matelematics ?
          </span>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            Une vision complète de{" "}
            <span className="text-blue-400">votre flotte</span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-400 md:text-lg">
            Géolocalisation, télématique, sécurité, vidéo intelligente et
            analyse : Matelematics rassemble les informations essentielles
            pour vous permettre de mieux piloter vos véhicules.
          </p>
        </motion.div>

        {/* BLOC CENTRAL */}
        <motion.div
          className="mx-auto mt-16 max-w-5xl"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
        >
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:p-10">
            {/* Glow central */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-3xl" />

            <div className="relative grid gap-8 md:grid-cols-3 md:items-center">
              {/* Gauche */}
              <div className="space-y-4">
                <MiniFeature
                  icon={<MapPinned className="h-5 w-5" />}
                  title="Géolocalisation"
                  text="Où sont vos véhicules ?"
                />

                <MiniFeature
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="Sécurité"
                  text="Que se passe-t-il ?"
                />
              </div>

              {/* Centre */}
              <div className="flex justify-center">
                <motion.div
                  className="relative flex h-40 w-40 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 shadow-2xl shadow-blue-500/20"
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(59,130,246,0.10)",
                      "0 0 0 20px rgba(59,130,246,0)",
                      "0 0 0 0 rgba(59,130,246,0)",
                    ],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                >
                  <div className="absolute inset-5 rounded-full border border-blue-400/20" />

                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30">
                    <RadioTower className="h-9 w-9 text-white" />
                  </div>

                  {/* Points satellites */}
                  <motion.span
                    className="absolute left-3 top-1/2 h-2 w-2 rounded-full bg-blue-400"
                    animate={{ x: [-4, 4, -4], opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />

                  <motion.span
                    className="absolute right-3 top-1/2 h-2 w-2 rounded-full bg-cyan-400"
                    animate={{ x: [4, -4, 4], opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: 0.5,
                    }}
                  />
                </motion.div>
              </div>

              {/* Droite */}
              <div className="space-y-4">
                <MiniFeature
                  icon={<Gauge className="h-5 w-5" />}
                  title="Données véhicule"
                  text="Que nous disent vos véhicules ?"
                />

                <MiniFeature
                  icon={<BarChart3 className="h-5 w-5" />}
                  title="Analyse"
                  text="Comment améliorer vos performances ?"
                />
              </div>
            </div>

            {/* Flux animé */}
            <div className="relative mt-10 h-px overflow-hidden bg-white/10">
              <motion.div
                className="absolute top-0 h-full w-32 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                animate={{ x: ["-100%", "800%"] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Vos données sont centralisées sur une seule plateforme
            </div>
          </div>
        </motion.div>

        {/* TITRE DES FONCTIONNALITÉS */}
        <motion.div
          className="mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
                Une plateforme complète
              </p>

              <h3 className="mt-2 text-2xl font-bold text-white md:text-3xl">
                Tout ce dont votre flotte a besoin
              </h3>
            </div>

            <p className="max-w-xl text-sm leading-6 text-slate-500">
              Une architecture pensée pour centraliser les données et rendre
              leur utilisation simple au quotidien.
            </p>
          </div>
        </motion.div>

        {/* CARTES */}
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.07,
                }}
                whileHover={{
                  y: -6,
                }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-7 transition-colors duration-300 hover:border-blue-400/30 hover:bg-white/[0.07]"
              >
                {/* Ligne supérieure */}
                <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-400 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className="text-xs font-bold tracking-[0.18em] text-slate-600">
                    {item.number}
                  </span>
                </div>

                <h4 className="mt-6 text-xl font-bold text-white">
                  {item.title}
                </h4>

                <p className="mt-3 text-sm leading-7 text-slate-400">
                  {item.description}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {item.label}
                  </div>

                  <ArrowUpRight className="h-4 w-4 text-slate-600 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-400" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA FINAL */}
        <motion.div
          className="mt-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <a
            href="/demo"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-600/30"
          >
            Découvrir la plateforme
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------
   MINI FEATURE
--------------------------------- */

function MiniFeature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{text}</p>
      </div>
    </motion.div>
  );
}