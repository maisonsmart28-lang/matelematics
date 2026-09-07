'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function DashboardPreview() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto flex flex-col md:flex-row items-center">
        {/* Left side */}
        <div className="w-full md:w-1/2 mb-6 md:mb-0 md:mr-6">
          <motion.h2
            className="text-3xl font-bold text-gray-800 mb-4 animate-fadeIn"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Aperçu du Dashboard
          </motion.h2>
          <p className="text-gray-600 mb-4">
            Une vue complète et intuitive pour gérer votre flotte en temps réel.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Suivi en temps réel des véhicules</li>
            <li>Gestion des itinéraires</li>
            <li>Analyse de la consommation</li>
            <li>Alertes et notifications</li>
            <li>Rapports détaillés</li>
          </ul>
        </div>

        {/* Right side */}
        <div className="w-full md:w-1/2">
          <motion.img
            src="/images/dashboard-preview.png"
            alt="Dashboard preview"
            className="rounded-2xl shadow-lg"
            style={{ objectFit: 'cover', width: '100%', height: 'auto' }}
            variants={{
              hover: { scale: 1.02, transition: { duration: 0.3 } },
            }}
          />
        </div>
      </div>
    </section>
  );
}