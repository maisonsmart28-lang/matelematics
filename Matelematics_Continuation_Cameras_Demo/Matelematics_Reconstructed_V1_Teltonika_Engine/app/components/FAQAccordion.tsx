"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  HelpCircle,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

const questions = [
  {
    id: 1,
    question: "Comment fonctionne Matelematics ?",
    answer:
      "Matelematics centralise les informations de votre flotte sur une plateforme unique. Les données remontées par les véhicules permettent de visualiser leur position, suivre leur activité, consulter les événements importants et analyser les performances de votre flotte.",
  },
  {
    id: 2,
    question: "Comment se déroule l'installation d'un véhicule ?",
    answer:
      "L'installation dépend du type de véhicule et des fonctionnalités souhaitées. Nos équipes peuvent vous accompagner pour identifier le matériel adapté et assurer une installation propre et professionnelle.",
  },
  {
    id: 3,
    question: "Quelles informations puis-je suivre ?",
    answer:
      "Selon votre configuration, vous pouvez notamment suivre la position des véhicules, les trajets, les arrêts, les événements de conduite, certaines données techniques du véhicule ainsi que les alertes définies pour votre flotte.",
  },
  {
    id: 4,
    question: "Puis-je gérer plusieurs véhicules sur la même plateforme ?",
    answer:
      "Oui. Matelematics est pensée pour centraliser la gestion de plusieurs véhicules depuis un même espace. Vous pouvez ainsi disposer d'une vue globale de votre flotte tout en consultant les informations propres à chaque véhicule.",
  },
  {
    id: 5,
    question: "Est-ce adapté à différents secteurs d'activité ?",
    answer:
      "Oui. La plateforme peut répondre aux besoins de différents secteurs utilisant des véhicules ou des engins : transport, livraison, logistique, transport scolaire, taxis et VTC, entreprises, construction et autres activités professionnelles.",
  },
  {
    id: 6,
    question: "Puis-je recevoir des alertes en cas d'événement important ?",
    answer:
      "Oui. Les alertes permettent d'attirer votre attention sur différents événements selon la configuration de votre flotte. L'objectif est de vous permettre d'identifier rapidement les situations nécessitant une intervention.",
  },
  {
    id: 7,
    question: "Puis-je consulter mes données depuis un ordinateur ?",
    answer:
      "Oui. La plateforme web est conçue pour être accessible depuis un navigateur moderne sur ordinateur, tablette ou autre appareil compatible.",
  },
  {
    id: 8,
    question: "La vidéo embarquée peut-elle être intégrée à la solution ?",
    answer:
      "Oui. La télématique peut être associée à des solutions de vidéo embarquée afin de disposer d'une vision plus complète des événements et de renforcer la sécurité de votre flotte.",
  },
];

export default function FAQAccordion() {
  const [activeId, setActiveId] = useState<number | null>(null);

  const toggleQuestion = (id: number) => {
    setActiveId((current) => (current === id ? null : id));
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-24 md:py-32">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div
          className="absolute inset-0 opacity-[0.025]"
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
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2">
            <HelpCircle className="h-4 w-4 text-blue-400" />

            <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
              Centre d'aide
            </span>
          </div>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Questions{" "}
            <span className="text-blue-400">fréquentes</span>
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">
            Retrouvez les réponses aux principales questions concernant
            Matelematics, son fonctionnement et la gestion de votre flotte.
          </p>
        </motion.div>

        {/* FAQ */}
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="space-y-3">
            {questions.map((item, index) => {
              const isOpen = activeId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.45,
                    delay: index * 0.05,
                  }}
                  className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                    isOpen
                      ? "border-blue-500/30 bg-white/[0.07] shadow-lg shadow-blue-950/20"
                      : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.05]"
                  }`}
                >
                  {/* QUESTION */}
                  <button
                    type="button"
                    onClick={() => toggleQuestion(item.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-4 px-5 py-5 text-left md:px-7 md:py-6"
                  >
                    {/* NUMBER */}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                        isOpen
                          ? "bg-blue-600 text-white"
                          : "bg-white/[0.06] text-slate-500"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>

                    {/* QUESTION */}
                    <span
                      className={`flex-1 text-sm font-semibold transition-colors md:text-base ${
                        isOpen ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {item.question}
                    </span>

                    {/* ARROW */}
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
                        isOpen
                          ? "bg-blue-600 text-white"
                          : "bg-white/[0.06] text-slate-400"
                      }`}
                    >
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.span>
                    </span>
                  </button>

                  {/* ANSWER */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: {
                            duration: 0.35,
                            ease: [0.4, 0, 0.2, 1],
                          },
                          opacity: {
                            duration: 0.25,
                          },
                        }}
                      >
                        <div className="border-t border-white/10 px-5 pb-6 pt-5 md:px-7 md:pb-7 md:pt-6">
                          <div className="flex gap-4">
                            <div className="mt-1 hidden h-8 w-px shrink-0 bg-blue-500/50 sm:block" />

                            <p className="text-sm leading-7 text-slate-400 md:text-[15px]">
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM INFO */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mt-12 max-w-4xl"
        >
          <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-7 md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                <MessageCircle className="h-6 w-6" />
              </div>

              <div>
                <p className="font-semibold text-white">
                  Vous avez une autre question ?
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Notre équipe est disponible pour vous accompagner.
                </p>
              </div>
            </div>

            <a
              href="/contact"
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-blue-400/30 hover:bg-blue-500/10"
            >
              Nous contacter
            </a>
          </div>
        </motion.div>

        {/* TRUST */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          Une plateforme pensée pour une gestion professionnelle de votre flotte
        </div>
      </div>
    </section>
  );
}