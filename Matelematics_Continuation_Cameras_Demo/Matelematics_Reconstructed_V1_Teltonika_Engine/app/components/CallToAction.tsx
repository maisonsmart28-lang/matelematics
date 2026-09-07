'use client'

import { motion } from 'framer-motion';

export default function CallToAction() {
  return (
    <section className="py-12 bg-gray-900 text-white">
      <div className="container mx-auto flex flex-col items-center text-center">
        <h2 className="text-4xl font-bold mb-4 animate-fadeIn">
          Prêt à digitaliser votre flotte ?
        </h2>
        <p className="text-xl text-gray-300 mb-8">
          Découvrez comment Matelematics peut réduire vos coûts, améliorer la sécurité et optimiser vos opérations.
        </p>
        <div className="flex justify-center gap-4">
          <motion.button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            Demander une démo
          </motion.button>
          <motion.button
            className="bg-white hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            Nous contacter
          </motion.button>
        </div>
      </div>
    </section>
  );
}