"use client";

import { useState } from "react";

export default function Contact() {
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Message envoyé :", formData);

    alert("Votre message a été envoyé");

    setFormData({
      nom: "",
      email: "",
      message: "",
    });
  };

  return (
    <section
      id="contact"
      className="py-20 bg-gradient-to-b from-white to-gray-100"
    >
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900">
            Contactez-nous
          </h2>

          <p className="text-gray-600 mt-4">
            Besoin d'informations sur nos solutions GPS,
            télématique, IoT ou gestion de flotte ?
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            <div className="grid md:grid-cols-2 gap-6">

              <input
                type="text"
                placeholder="Nom"
                value={formData.nom}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nom: e.target.value,
                  })
                }
                className="w-full p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                className="w-full p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

            </div>

            <textarea
              rows={6}
              placeholder="Votre message"
              value={formData.message}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  message: e.target.value,
                })
              }
              className="w-full p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 transition px-8 py-4 rounded-xl text-white font-semibold"
            >
              Envoyer
            </button>

          </form>

          <div className="mt-10 pt-8 border-t">

            <div className="grid md:grid-cols-3 gap-6">

              <div>
                <h3 className="font-bold">
                  Téléphone
                </h3>

                <p className="text-gray-600">
                  +212 669 154 235
                </p>
              </div>

              <div>
                <h3 className="font-bold">
                  Email
                </h3>

                <p className="text-gray-600">
                  contact@matelematics.ma
                </p>
              </div>

              <div>
                <h3 className="font-bold">
                  Adresse
                </h3>

                <p className="text-gray-600">
                  Casablanca, Maroc
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}