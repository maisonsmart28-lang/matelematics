"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Quote,
  Star,
  Building2,
} from "lucide-react";

const testimonials = [
  {
    author: "Ahmed Khalid",
    role: "Responsable transport",
    company: "Entreprise de transport",
    initials: "AK",
    text: "Matelematics nous permet d'avoir une vision beaucoup plus claire de notre flotte et de suivre nos véhicules depuis une seule plateforme.",
  },
  {
    author: "Sara Martin",
    role: "Directrice des opérations",
    company: "Transport & logistique",
    initials: "SM",
    text: "La visibilité en temps réel et les alertes nous permettent de réagir rapidement lorsqu'un événement nécessite notre attention.",
  },
  {
    author: "Jean Dupont",
    role: "Gestionnaire de flotte",
    company: "Logistique",
    initials: "JD",
    text: "Le tableau de bord centralise les informations essentielles de notre flotte et facilite le suivi quotidien de nos opérations.",
  },
];

export default function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = testimonials.length;

  const next = () => {
    setCurrent((previous) => (previous + 1) % total);
  };

  const previous = () => {
    setCurrent((previous) => (previous - 1 + total) % total);
  };

  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setCurrent((previous) => (previous + 1) % total);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [isPaused, total]);

  const testimonial = testimonials[current];

  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-24 md:py-32">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
            Témoignages
          </span>

          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-5xl">
            Pensé pour les professionnels{" "}
            <span className="text-blue-400">de la mobilité</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">
            Une plateforme conçue pour apporter davantage de visibilité,
            de contrôle et d'efficacité dans la gestion quotidienne des
            véhicules.
          </p>
        </motion.div>

        {/* CAROUSEL */}
        <div
          className="relative mt-14"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl">
            <div className="grid lg:grid-cols-[1fr_280px]">
              {/* TEMOIGNAGE */}
              <div className="relative min-h-[390px] p-8 md:p-12 lg:p-16">
                <div className="absolute right-8 top-8 md:right-12 md:top-12">
                  <Quote className="h-16 w-16 text-blue-500/10 md:h-24 md:w-24" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={current}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4 }}
                    className="relative flex h-full flex-col"
                  >
                    {/* STARS */}
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className="h-4 w-4 fill-current text-amber-400"
                        />
                      ))}
                    </div>

                    {/* TEXTE */}
                    <blockquote className="mt-8 max-w-3xl text-2xl font-medium leading-relaxed text-white md:text-3xl">
                      “{testimonial.text}”
                    </blockquote>

                    {/* CLIENT */}
                    <div className="mt-auto flex items-center gap-4 pt-10">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/20">
                        {testimonial.initials}
                      </div>

                      <div>
                        <p className="font-semibold text-white">
                          {testimonial.author}
                        </p>

                        <p className="mt-1 text-sm text-slate-400">
                          {testimonial.role}
                        </p>

                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Building2 className="h-3.5 w-3.5" />
                          {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* CÔTÉ DROIT */}
              <div className="border-t border-white/10 bg-white/[0.025] p-8 lg:border-l lg:border-t-0">
                <div className="flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-400">
                      Votre flotte
                    </p>

                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      Une meilleure visibilité pour prendre de meilleures
                      décisions.
                    </p>
                  </div>

                  <div className="mt-8 space-y-4">
                    <Metric label="Visibilité" />
                    <Metric label="Sécurité" />
                    <Metric label="Analyse" />
                    <Metric label="Performance" />
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-6">
                    <p className="text-xs text-slate-500">
                      Témoignage
                    </p>

                    <p className="mt-1 text-2xl font-bold text-white">
                      {String(current + 1).padStart(2, "0")}
                      <span className="text-slate-600">
                        {" "}
                        / {String(total).padStart(2, "0")}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTROLES */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-5 md:px-10">
              {/* INDICATEURS */}
              <div className="flex items-center gap-2">
                {testimonials.map((item, index) => (
                  <button
                    key={item.author}
                    type="button"
                    onClick={() => setCurrent(index)}
                    aria-label={`Afficher le témoignage ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === current
                        ? "w-8 bg-blue-500"
                        : "w-2 bg-slate-700 hover:bg-slate-500"
                    }`}
                  />
                ))}
              </div>

              {/* BOUTONS */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={previous}
                  aria-label="Témoignage précédent"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Témoignage suivant"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* BARRE DE PROGRESSION */}
          {!isPaused && (
            <motion.div
              key={current}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 6, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-blue-500"
            />
          )}
        </div>

        {/* FOOTER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-slate-500">
            La gestion de votre flotte commence par une meilleure visibilité.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/* --------------------------------
   METRIC
--------------------------------- */

function Metric({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />

      <span className="text-sm text-slate-300">{label}</span>

      <div className="ml-auto h-1 w-12 overflow-hidden rounded-full bg-slate-800">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "75%" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full bg-blue-500/60"
        />
      </div>
    </div>
  );
}