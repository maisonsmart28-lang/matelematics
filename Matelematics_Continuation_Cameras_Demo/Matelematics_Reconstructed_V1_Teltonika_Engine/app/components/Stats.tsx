"use client";
import { motion } from "framer-motion";

export default function Stats() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 text-blue-600">
          Prenez des décisions avec vos données
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div className="bg-white rounded-2xl shadow-lg p-6 animate-bounce">
            <motion.h3 className="font-bold text-2xl text-blue-600" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }}>
              1500+
            </motion.h3>
            <p className="text-xl text-blue-600">véhicules connectés</p>
          </motion.div>

          <motion.div className="bg-white rounded-2xl shadow-lg p-6 animate-bounce">
            <motion.h3 className="font-bold text-blue-600 text-2xl" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }}>
              99.8%
            </motion.h3>
            <p className="text-sm text-blue-600">disponibilité système</p>
          </motion.div>

          <motion.div className="bg-white rounded-2xl shadow-lg p-6 animate-bounce">
            <motion.h3 className="font-bold text-blue-600 text-2xl" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }}>
              42000+
            </motion.h3>
            <p className="text-sm text-blue-600">alertes traitées</p>
          </motion.div>

          <motion.div className="bg-white rounded-2xl shadow-lg p-6 animate-bounce">
            <motion.h3 className="font-bold text-blue-600 text-2xl" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }}>
              18%
            </motion.h3>
            <p className="text-sm text-blue-600">économie carburant</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}