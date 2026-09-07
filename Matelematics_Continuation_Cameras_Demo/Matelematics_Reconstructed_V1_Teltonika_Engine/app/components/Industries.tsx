"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Building2,
  Bus,
  Car,
  ChevronRight,
  Construction,
  GraduationCap,
  Package,
  Truck,
} from "lucide-react";

const sectors = [
  {
    title: "Flottes automobiles",
    description:
      "Suivez, gérez et optimisez votre flotte automobile en temps réel.",
    image:
      "https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1200&q=85",
    href: "/solutions/flottes-automobiles",
    icon: Car,
  },

  {
    title: "Transport scolaire",
    description:
      "Améliorez la sécurité, le suivi et la ponctualité de vos transports scolaires.",
    image:
      "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=85",
    href: "/solutions/transport-scolaire",
    icon: GraduationCap,
  },

  {
    title: "Livraison & logistique",
    description:
      "Optimisez vos tournées, vos livraisons et le suivi de vos véhicules.",
    image:
      "https://www.upela.com/uploads/les-services-d-envoi-de-colis.webp",
    fallbackImage:
      "https://public.readdy.ai/ai/img_res/cf7b2eb452a71be4fdca4b4810e57bae.jpg",
    href: "/solutions/livraison-logistique",
    icon: Package,
  },

  {
    title: "Transport marchandises",
    description:
      "Suivez vos poids lourds et maîtrisez vos opérations de transport de marchandises.",
    image:
      "https://mauriweb.info/ar/sites/default/files/723233.jpeg",
    href: "/solutions/transport-marchandises",
    icon: Truck,
  },

  {
    title: "Bus",
    description:
      "Suivez vos bus, leurs trajets et leurs performances en temps réel.",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=85",
    href: "/solutions/bus",
    icon: Bus,
  },

  {
    title: "Taxis & VTC",
    description:
      "Optimisez votre flotte de taxis et VTC, les déplacements et la disponibilité de vos chauffeurs.",
    image:
      "https://www.greentomatocars.com/wp-content/uploads/2020/04/chosen-HiRes-DSC_7397-min.jpg",
    href: "/solutions/taxis-vtc",
    icon: Car,
  },

  {
    title: "Entreprises",
    description:
      "Gérez vos véhicules de transport du personnel et optimisez les déplacements de vos collaborateurs.",
    image:
      "https://www.staffbusrental.com/admin/image/35%20Seater%20Office%20Staff%20Bus%20Rental%20for%20Multiple%20Branches.webp",
    href: "/solutions/entreprises",
    icon: Building2,
  },

  {
    title: "Construction",
    description:
      "Suivez vos bétonnières, camions et véhicules directement sur vos chantiers.",
    image:
      "https://image.garlway.com/images/faqs/2157/main_image_1764685819_692ef7fb60ad1.webp",
    href: "/solutions/construction",
    icon: Construction,
  },
];

export default function Industries() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">

        {/* EN-TÊTE */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-blue-600">
            Secteurs d'activité
          </span>

          <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
            Nos solutions s'adaptent à votre secteur
          </h2>

          <p className="mt-4 text-base leading-7 text-gray-600 md:text-lg">
            Matelematics accompagne les professionnels dans la gestion,
            la sécurité et l'optimisation de leurs véhicules et de leurs
            activités.
          </p>
        </motion.div>

        {/* CARTES */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {sectors.map((sector, index) => {
            const Icon = sector.icon;

            return (
              <motion.article
                key={sector.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.06,
                }}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >

                {/* IMAGE */}
                <div className="relative h-52 overflow-hidden bg-gray-100">

                  <img
                    src={sector.image}
                    alt={sector.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(event) => {
                      const fallback = sector.fallbackImage;

                      if (
                        fallback &&
                        event.currentTarget.src !== fallback
                      ) {
                        event.currentTarget.src = fallback;
                      }
                    }}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                  <div className="absolute bottom-4 left-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                    <Icon className="h-5 w-5" />
                  </div>

                </div>

                {/* CONTENU */}
                <div className="flex min-h-[225px] flex-col p-5">

                  <h3 className="text-xl font-bold text-gray-900">
                    {sector.title}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-6 text-gray-600">
                    {sector.description}
                  </p>

                  <Link
                    href={sector.href}
                    className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    En savoir plus

                    <ChevronRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>

                </div>

              </motion.article>
            );
          })}
        </div>

      </div>
    </section>
  );
}