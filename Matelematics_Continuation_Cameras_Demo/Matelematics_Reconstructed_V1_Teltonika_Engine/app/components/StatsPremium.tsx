'use client';

import { motion } from 'framer-motion';

const cards = [
  { label: 'Véhicules suivis', value: 1245 },
  { label: 'Disponibilité plateforme', value: 98, suffix: '%' },
  { label: 'Alertes traitées', value: 540 },
  { label: 'Économie carburant', value: 25, suffix: '%' },
];

export default function StatsPremium() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((c, i) => (
          <motion.div
            key={i}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{c.label}</h3>
            <motion.div
              className="text-4xl font-bold text-blue-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {c.value}{c.suffix}
            </motion.div>
            <motion.div
              className="mt-2 text-lg text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {c.label}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}