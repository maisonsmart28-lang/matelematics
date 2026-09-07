'use client';

import { motion } from 'framer-motion';

const items = [
  {
    id: 1,
    icon: '📍',
    title: 'Suivi GPS temps réel',
    description: 'Suivez vos véhicules en temps réel avec une précision centimétrique.',
  },
  {
    id: 2,
    icon: '🚧',
    title: 'Géofencing',
    description: 'Définissez des zones virtuelles et recevez des alertes lorsqu\'un véhicule entre ou sort de ces zones.',
  },
  {
    id: 3,
    icon: '⛽',
    title: 'Analyse carburant',
    description: 'Optimisez la consommation de carburant grâce à des rapports détaillés.',
  },
  {
    id: 4,
    icon: '🔧',
    title: 'Maintenance prédictive',
    description: 'Anticipez les pannes grâce à des algorithmes d\'analyse prédictive.',
  },
  {
    id: 5,
    icon: '📊',
    title: 'Rapports intelligents',
    description: 'Générez des rapports automatisés pour une prise de décision éclairée.',
  },
  {
    id: 6,
    icon: '🔔',
    title: 'Alertes instantanées',
    description: 'Soyez informé en temps réel de tout incident ou anomalie.',
  },
];

type CardProps = { icon: string; title: string; description: string };

const Card = ({ icon, title, description }: CardProps) => (
  <motion.div
    className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.03 }}
  >
    <div className="flex items-center mb-4">
      <span className="text-4xl mr-2">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600">{description}</p>
  </motion.div>
);

export default function WhyMatelematics() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Pourquoi Matelematics ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} icon={item.icon} title={item.title} description={item.description} />
          ))}
        </div>
      </div>
    </section>
  );
}