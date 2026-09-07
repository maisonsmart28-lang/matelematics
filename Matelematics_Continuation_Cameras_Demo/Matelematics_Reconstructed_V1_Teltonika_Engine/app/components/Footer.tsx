"use client";

import Link from "next/link";
import {
  MapPin,
  Mail,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const technologies = [
  { label: "Géolocalisation", href: "/technologies/geolocalisation" },
  { label: "Télématique", href: "/technologies/telematique" },
  { label: "Vidéo intelligente", href: "/technologies/video-intelligente" },
  { label: "Données véhicules", href: "/technologies/donnees-vehicules" },
  { label: "Sécurité intelligente", href: "/technologies/securite" },
  { label: "Analyse & données", href: "/technologies/analyse" },
];

const solutions = [
  { label: "Flottes automobiles", href: "/solution/flotte-automobile" },
  { label: "Transport scolaire", href: "/solution/transport-scolaire" },
  { label: "Livraison & logistique", href: "/solution/livraison-logistique" },
  { label: "Transport de marchandises", href: "/solution/transport-marchandises" },
  { label: "Construction", href: "/solution/construction" },
  { label: "Entreprises", href: "/solution/entreprise" },
  { label: "Taxis & VTC", href: "/solution/taxi-vtc" },
  { label: "Bus & transport public", href: "/solution/bus" },
];

const navigation = [
  { label: "Accueil", href: "/" },
  { label: "Technologies", href: "/#technologies" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Fonctionnement", href: "/#fonctionnement" },
  { label: "Témoignages", href: "/#temoignages" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/contact" },
];

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors duration-200 hover:text-white"
      >
        <ChevronRight className="h-3.5 w-3.5 -ml-1 opacity-0 transition-all duration-200 group-hover:ml-0 group-hover:opacity-100" />
        <span>{children}</span>
      </Link>
    </li>
  );
}

function SocialIcon({
  type,
}: {
  type: "facebook" | "instagram" | "linkedin";
}) {
  if (type === "facebook") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M13.5 22v-8h2.75l.4-3h-3.15V9.08c0-.87.24-1.46 1.5-1.46h1.77V4.94c-.31-.04-1.37-.14-2.6-.14-2.57 0-4.33 1.57-4.33 4.46V11H7.1v3h2.74v8h3.66Z" />
      </svg>
    );
  }

  if (type === "instagram") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle
          cx="17.3"
          cy="6.7"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.2 8.1H2.8V21h3.4V8.1ZM4.5 3A2 2 0 1 0 4.5 7 2 2 0 0 0 4.5 3ZM21.2 13.6c0-3.9-2.1-5.7-4.9-5.7-2.3 0-3.3 1.3-3.9 2.1V8.1H9V21h3.4v-6.4c0-1.7.3-3.4 2.5-3.4 2.1 0 2.1 2 2.1 3.5V21h3.4l.8-7.4Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-slate-950 text-white">

      {/* Subtle background effect */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-600/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-500/[0.04] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">

        {/* ================================================= */}
        {/* TOP FOOTER */}
        {/* ================================================= */}

        <div className="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-5">

          {/* BRAND */}

          <div className="lg:col-span-1">

            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold shadow-lg shadow-blue-900/30">
                M
              </div>

              <div>
                <div className="text-lg font-bold tracking-tight">
                  Matelematics
                </div>

                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Fleet Intelligence
                </div>
              </div>
            </Link>

            <p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">
              Géolocalisation, télématique, vidéo intelligente et
              analyse pour une gestion plus intelligente de votre flotte.
            </p>

            <div className="mt-6 space-y-3">

              <a
                href="tel:+212669154235"
                className="flex items-center gap-3 text-sm text-slate-400 transition hover:text-white"
              >
                <Phone className="h-4 w-4 text-blue-400" />
                +212 6 69 15 42 35
              </a>

              <a
                href="mailto:contact@matelematics.ma"
                className="flex items-center gap-3 text-sm text-slate-400 transition hover:text-white"
              >
                <Mail className="h-4 w-4 text-blue-400" />
                contact@matelematics.ma
              </a>

              <div className="flex items-center gap-3 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-blue-400" />
                Casablanca, Maroc
              </div>

            </div>

          </div>

          {/* TECHNOLOGIES */}

          <div>
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white">
              Technologies
            </h3>

            <ul className="space-y-3">
              {technologies.map((item) => (
                <FooterLink key={item.href} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* SOLUTIONS */}

          <div>
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white">
              Solutions
            </h3>

            <ul className="space-y-3">
              {solutions.map((item) => (
                <FooterLink key={item.href} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* NAVIGATION */}

          <div>
            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white">
              Navigation
            </h3>

            <ul className="space-y-3">
              {navigation.map((item) => (
                <FooterLink key={item.href} href={item.href}>
                  {item.label}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* ESPACE CLIENT */}

          <div>

            <h3 className="mb-5 text-xs font-bold uppercase tracking-[0.15em] text-white">
              Espace client
            </h3>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <h4 className="mt-4 font-semibold">
                Gérez votre flotte
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Accédez à votre espace de gestion et retrouvez
                vos véhicules, alertes, données et rapports.
              </p>

              <Link
                href="/dashboard"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
              >
                Accéder au dashboard
                <ArrowUpRight className="h-4 w-4" />
              </Link>

            </div>

            {/* SOCIAL */}

            <div className="mt-7">

              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Suivez-nous
              </p>

              <div className="flex gap-2.5">

                <a
                  href="/contact"
                  aria-label="Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-blue-500/40 hover:bg-blue-600 hover:text-white"
                >
                  <SocialIcon type="facebook" />
                </a>

                <a
                  href="/contact"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-blue-500/40 hover:bg-blue-600 hover:text-white"
                >
                  <SocialIcon type="instagram" />
                </a>

                <a
                  href="/contact"
                  aria-label="LinkedIn"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-blue-500/40 hover:bg-blue-600 hover:text-white"
                >
                  <SocialIcon type="linkedin" />
                </a>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================= */}
        {/* BOTTOM */}
        {/* ================================================= */}

        <div className="border-t border-white/[0.08] py-6">

          <div className="flex flex-col gap-4 text-xs md:flex-row md:items-center md:justify-between">

            <p className="text-slate-500">
              © 2026 Matelematics. Tous droits réservés.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2">

              <Link
                href="/contact"
                className="text-slate-500 transition hover:text-white"
              >
                Contact
              </Link>

              <Link
                href="/"
                className="text-slate-500 transition hover:text-white"
              >
                Mentions légales
              </Link>

              <Link
                href="/"
                className="text-slate-500 transition hover:text-white"
              >
                Confidentialité
              </Link>

            </div>

          </div>

        </div>

      </div>
    </footer>
  );
}