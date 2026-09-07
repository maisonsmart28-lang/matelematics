"use client";

import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Quote,
  Star,
  Building2,
  ShieldCheck,
} from "lucide-react";

const testimonials = [
  {
    name: "Ahmed K.",
    role: "Responsable de flotte",
    company: "Transport & logistique",
    sector: "Transport",
    text: "La visibilité sur nos véhicules nous permet de mieux suivre notre activité et de réagir rapidement lorsqu'une situation nécessite notre attention.",
    initials: "AK",
  },
  {
    name: "Sara M.",
    role: "Directrice des opérations",
    company: "Entreprise de transport",
    sector: "Gestion de flotte",
    text: "Nous recherchions une solution simple pour centraliser les informations de notre flotte. La plateforme nous apporte une vision beaucoup plus claire de nos opérations.",
    initials: "SM",
  },
  {
    name: "Youssef B.",
    role: "Gestionnaire transport",
    company: "Logistique & livraison",
    sector: "Livraison",
    text: "Le suivi des véhicules et l'accès aux informations importantes depuis une seule interface facilitent considérablement notre gestion quotidienne.",
    initials: "YB",
  },
];

export default function Testimonials() {
  return (
    <section className="relative overflow-hidden bg-slate-50 px-6 py-24 md:py-32">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-20 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-blue-600" />

            <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              Témoignages
            </span>
          </div>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Ce que disent nos{" "}
            <span className="text-blue-600">clients</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
            Découvrez comment une meilleure visibilité sur les véhicules
            peut simplifier la gestion quotidienne d'une flotte.
          </p>
        </motion.div>

        {/* TESTIMONIALS */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.article
              key={testimonial.name}
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: 0.6,
                delay: index * 0.12,
              }}
              whileHover={{ y: -8 }}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-xl md:p-8"
            >
              {/* TOP ACCENT */}
              <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* QUOTE ICON */}
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Quote className="h-6 w-6" />
                </div>

                <span className="text-xs font-bold tracking-[0.2em] text-slate-300">
                  0{index + 1}
                </span>
              </div>

              {/* STARS */}
              <div className="mt-6 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="h-4 w-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* TEXT */}
              <blockquote className="mt-6 flex-1 text-[15px] leading-7 text-slate-600">
                “{testimonial.text}”
              </blockquote>

              {/* CLIENT */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                    {testimonial.initials}
                  </div>

                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">
                      {testimonial.name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {testimonial.role}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <Building2 className="h-3.5 w-3.5 text-blue-500" />

                  <span>{testimonial.company}</span>

                  <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {testimonial.sector}
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* TRUST BAR */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm md:px-10"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                Une solution pour chaque flotte
              </p>

              <h3 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">
                Plus de visibilité. Plus de contrôle.
              </h3>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                "Géolocalisation",
                "Sécurité",
                "Analyse",
                "Performance",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 text-center"
        >
          <a
            href="/demo"
            className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Découvrir la plateforme

            <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}