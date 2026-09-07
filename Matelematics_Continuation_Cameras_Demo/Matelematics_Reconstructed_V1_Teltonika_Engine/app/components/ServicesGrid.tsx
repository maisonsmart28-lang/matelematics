import {
  MapPin,
  BatteryCharging,
  ShieldCheck,
  Wifi,
  BarChart3,
  Bell
} from 'lucide-react';

export default function ServicesGrid() {
  const services = [
    {
      title: 'GPS temps réel',
      description: 'Suivi précis avec localisation en direct',
      icon: MapPin
    },
    {
      title: 'Gestion carburant',
      description: 'Analyse de consommation',
      icon: BatteryCharging
    },
    {
      title: 'Maintenance prédictive',
      description: 'Détection précoce des pannes',
      icon: ShieldCheck
    },
    {
      title: 'Capteurs IoT',
      description: 'Température, portes, vibrations',
      icon: Wifi
    },
    {
      title: 'Alertes intelligentes',
      description: 'Notifications instantanées',
      icon: Bell
    },
    {
      title: 'Rapports avancés',
      description: 'Rapports détaillés et exports PDF',
      icon: BarChart3
    }
  ];

  return (
    <section className='py-12'>
      <h2 className='text-3xl font-bold text-center mb-10'>
        Nos Services
      </h2>
      <div className='grid gap-8 px-4 sm:px-6 lg:grid-cols-3'>
        {services.map((service) => (
          <div
            key={service.title}
            className='group bg-white rounded-3xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 p-8'
          >
            <service.icon
              size={42}
              className='text-blue-600 mb-2 transition-transform duration-300 group-hover:scale-105'
            />
            <h3 className='text-xl font-bold text-gray-800'>
              {service.title}
            </h3>
            <p className='text-gray-600 mt-1'>
              {service.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}