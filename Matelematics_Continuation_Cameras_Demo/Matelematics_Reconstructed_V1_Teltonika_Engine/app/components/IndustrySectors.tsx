"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  MapPinned,
  RadioTower,
  Video,
  Gauge,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const technologies = [
  {
    id: 1,
    title: "Géolocalisation",
    description:
      "Localisez vos véhicules en temps réel, consultez leurs trajets et gardez une vision précise de votre flotte à tout moment.",
    href: "/technologies/geolocalisation",
    icon: MapPinned,
    label: "Position en temps réel",
    background:
      "bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900",
  },
  {
    id: 2,
    title: "Télématique",
    description:
      "Centralisez les informations essentielles de vos véhicules et transformez les données de votre flotte en informations utiles.",
    href: "/technologies/telematique",
    icon: RadioTower,
    label: "Données intelligentes",
    background:
      "bg-gradient-to-br from-cyan-500 via-blue-700 to-slate-900",
  },
  {
    id: 3,
    title: "Vidéo intelligente",
    description:
      "Renforcez la sécurité de vos véhicules grâce à la vidéo embarquée et à l'analyse des événements sur la route.",
    href: "/technologies/video-intelligente",
    icon: Video,
    label: "Sécurité vidéo",
    background:
      "bg-gradient-to-br from-indigo-600 via-blue-800 to-slate-950",
  },
  {
    id: 4,
    title: "CAN & données véhicule",
    description:
      "Exploitez les données disponibles de vos véhicules pour mieux comprendre leur utilisation, leurs performances et leur état.",
    href: "/technologies/donnees-vehicule",
    icon: Gauge,
    label: "Données véhicule",
    background:
      "bg-gradient-to-br from-slate-700 via-blue-800 to-slate-950",
  },
  {
    id: 5,
    title: "Sécurité",
    description:
      "Protégez vos conducteurs et vos véhicules grâce aux alertes, au suivi des comportements et à la surveillance des événements.",
    href: "/technologies/securite",
    icon: ShieldCheck,
    label: "Protection de votre flotte",
    background:
      "bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-950",
  },
  {
    id: 6,
    title: "Analyse",
    description:
      "Transformez les données de votre flotte en indicateurs clairs pour améliorer vos décisions et vos performances.",
    href: "/technologies/analyse",
    icon: BarChart3,
    label: "Performance & décision",
    background:
      "bg-gradient-to-br from-violet-600 via-blue-800 to-slate-950",
  },
];

export default function IndustrySectors() {
  return (
    <section className="bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">

        {/* INTRODUCTION */}

        <div className="mx-auto mb-14 max-w-3xl text-center">

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600"
          >
            Notre technologie
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl lg:text-5xl"
          >
            Une technologie pensée pour votre flotte
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-5 text-base leading-7 text-slate-600 md:text-lg"
          >
            Matelematics réunit les technologies essentielles pour
            géolocaliser, surveiller, sécuriser et analyser votre flotte
            depuis une seule plateforme.
          </motion.p>

        </div>

        {/* TECHNOLOGIES */}

        <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">

          {technologies.map((technology, index) => {
            const Icon = technology.icon;

            return (
              <motion.div
                key={technology.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.06,
                }}
                whileHover={{ y: -6 }}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-2xl"
              >

                {/* VISUEL */}

                <div
                  className={`relative h-56 overflow-hidden ${technology.background}`}
                >

                  {/* Grille décorative */}

                  <div className="absolute inset-0 opacity-10">
                    <div
                      className="h-full w-full"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                      }}
                    />
                  </div>

                  {/* Halo */}

                  <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

                  {/* Icône principale */}

                  <div className="absolute inset-0 flex items-center justify-center">

                    <motion.div
                      whileHover={{ scale: 1.08, rotate: 2 }}
                      transition={{ duration: 0.25 }}
                      className="flex h-28 w-28 items-center justify-center rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md"
                    >
                      <Icon className="h-14 w-14 text-white" strokeWidth={1.5} />
                    </motion.div>

                  </div>

                  {/* Label */}

                  <div className="absolute bottom-4 left-4">

                    <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                      {technology.label}
                    </span>

                  </div>

                </div>

                {/* CONTENU */}

                <div className="p-6">

                  <h3 className="text-xl font-bold text-slate-900">
                    {technology.title}
                  </h3>

                  <p className="mt-3 min-h-[84px] text-sm leading-6 text-slate-600">
                    {technology.description}
                  </p>

                  <Link
                    href={technology.href}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
                  >
                    Découvrir la technologie

                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </Link>

                </div>

              </motion.div>
            );
          })}

        </div>

        {/* BAS DE SECTION */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"
        >

          <h3 className="text-2xl font-bold text-slate-900">
            Une seule plateforme pour piloter votre flotte
          </h3>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Centralisez vos données, améliorez la sécurité de vos véhicules
            et prenez de meilleures décisions grâce à une vision complète
            de votre activité.
          </p>

          <Link
            href="/demo"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Voir la démonstration
            <ArrowRight className="h-4 w-4" />
          </Link>

        </motion.div>

      </div>
    </section>
  );
}