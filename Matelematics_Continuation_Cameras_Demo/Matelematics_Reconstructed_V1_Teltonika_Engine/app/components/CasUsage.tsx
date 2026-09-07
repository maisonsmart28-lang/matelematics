'use client'

import { motion } from 'framer-motion';

const sectors = [
  {
    id: 1,
    title: 'Entreprises',
    description: 'Gestion efficace des véhicules de société.',
    photo: '/images/enterprise.png',
  },
  {
    id: 2,
    title: 'Location de véhicules',
    description: 'Offrez des voitures de luxe ou utilitaires à la demande.',
    photo: '/images/location.png',
  },
  {
    id: 3,
    title: 'Transport scolaire',
    description: 'Assurez la sécurité des élèves sur leurs trajets.',
    photo: '/images/school.png',
  },
  {
    id: 4,
    title: 'Transport de marchandises',
    description: 'Suivez vos cargaisons en temps réel.',
    photo: '/images/freight.png',
  },
  {
    id: 5,
    title: 'Livraison',
    description: 'Optimisez les itinéraires de livraison.',
    photo: '/images/delivery.png',
  },
  {
    id: 6,
    title: 'Bus & transport public',
    description: 'Gérez les trajets de bus et de transport collectif.',
    photo: '/images/bus.png',
  },
  {
    id: 7,
    title: 'Taxis & VTC',
    description: 'Gérez vos services de transport privé.',
    photo: '/images/taxi.png',
  },
  {
    id: 8,
    title: 'Engins de chantier',
    description: 'Suivez les engins sur les chantiers.',
    photo: '/images/construction.png',
  },
];

type CardProps = { title: string; description: string; photo: string };

const Card = ({ title, description, photo }: CardProps) => (
  <motion.div
    className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-all duration-300"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.03 }}
  >
    <div className="h-48 bg-gray-200 rounded-t-2xl mb-4" />
    <div className="flex items-center mb-4">
      <span className="text-4xl mr-2">{'🚚'}</span>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600">{description}</p>
    <motion.a
      href="/services"
      className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition"
    >
      En savoir plus
    </motion.a>
  </motion.div>
);

export default function CasUsage() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Cas d'utilisation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sectors.map((s) => (
            <Card key={s.id} title={s.title} description={s.description} photo={s.photo} />
          ))}
        </div>
      </div>
    </section>
  );
}