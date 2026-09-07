import { Eye, Truck, Thermometer, Bell } from "lucide-react";

export default function Services() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">
          Nos solutions télématiques
        </h2>

        <div className="grid md:grid-cols-4 gap-6">
          
          {/* GPS temps réel */}
          <div className="p-6 rounded-2xl shadow-lg flex flex-col items-center hover:scale-105 transition-transform duration-300">
            <Eye className="w-12 h-12 text-blue-600 mb-2" />
            <h3 className="font-bold text-xl mb-2">
              GPS temps réel
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              Suivi précis des véhicules en direct.
            </p>
            <a
              href="/services"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              En savoir plus
            </a>
          </div>

          {/* Gestion flotte */}
          <div className="p-6 rounded-2xl shadow-lg flex flex-col items-center hover:scale-105 transition-transform duration-300">
            <Truck className="w-12 h-12 text-blue-600 mb-2" />
            <h3 className="font-bold text-xl mb-2">
              Gestion flotte
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              Analyse complète des véhicules.
            </p>
            <a
              href="/services"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              En savoir plus
            </a>
          </div>

          {/* Capteurs IoT */}
          <div className="p-6 rounded-2xl shadow-lg flex flex-col items-center hover:scale-105 transition-transform duration-300">
            <Thermometer className="w-12 h-12 text-blue-600 mb-2" />
            <h3 className="font-bold text-xl mb-2">
              Capteurs IoT
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              Température, portes, vibrations.
            </p>
            <a
              href="/services"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              En savoir plus
            </a>
          </div>

          {/* Alertes intelligentes */}
          <div className="p-6 rounded-2xl shadow-lg flex flex-col items-center hover:scale-105 transition-transform duration-300">
            <Bell className="w-12 h-12 text-blue-600 mb-2" />
            <h3 className="font-bold text-xl mb-2">
              Alertes intelligentes
            </h3>
            <p className="text-gray-700 text-sm mb-4">
              Notifications automatiques.
            </p>
            <a
              href="/services"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              En savoir plus
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}