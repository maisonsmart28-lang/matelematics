"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const features = [
  { icon: "📍", text: "Suivi GPS temps réel" },
  { icon: "🛡️", text: "Géofencing" },
  { icon: "🔧", text: "Diagnostic moteur" },
  { icon: "🗂️", text: "Historique trajets" },
  { icon: "🔔", text: "Alertes instantanées" },
  { icon: "⛽", text: "Analyse carburant" },
];

export default function Platform() {
  return (
    <section className="bg-slate-950 py-24 text-white">
      <div className="container mx-auto px-6">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Partie gauche */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-6">
              Plateforme télématique intelligente
            </h2>

            <p className="text-gray-300 mb-8">
              Centralisez le suivi GPS, les alertes,
              l’analyse carburant et les données véhicules
              dans une seule plateforme.
            </p>

            <div className="space-y-5">

              {features.map((item, index) => (
                <motion.div
                  key={index}
                  className="flex items-center space-x-4"
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.1
                  }}
                  viewport={{ once: true }}
                >
                  <span className="text-2xl">
                    {item.icon}
                  </span>

                  <span className="text-lg">
                    {item.text}
                  </span>
                </motion.div>
              ))}

            </div>

          </motion.div>

          {/* Partie droite */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <Image
              src="/images/dashboard-preview.png"
              alt="Dashboard télématique"
              width={900}
              height={600}
              className="rounded-3xl shadow-2xl"
            />
          </motion.div>

        </div>

      </div>
    </section>
  );
}
