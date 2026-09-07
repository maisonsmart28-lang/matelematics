"use client";
import Image from "next/image";

export default function LiveTracking() {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-blue-600 mb-8">
          Suivi GPS temps réel
        </h2>
        <div className="flex justify-center">
          <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-5 bg-red-500 rounded-full">
                  <span className="text-white">#204</span>
                </div>
                <p className="ml-2 text-sm text-gray-600">Casablanca → Rabat</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-red-500 rounded-full">
                  <span className="text-white">⚠️</span>
                </div>
                <p className="text-sm text-gray-600">Carburant : 74%</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full">
                  <span className="text-white">68 km/h</span>
                </div>
                <p className="text-sm text-gray-600">Vitesse : 68 km/h</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-green-600 rounded-full">
                  <span className="text-white">✓</span>
                </div>
                <p className="ml-2 text-sm text-green-600">Statut : En circulation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}