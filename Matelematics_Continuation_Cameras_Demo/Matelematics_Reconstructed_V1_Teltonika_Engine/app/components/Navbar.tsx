"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemoModal } from "./DemoContext";

export default function Navbar() {
  const { open } = useDemoModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const openDemo = () => {
    setMobileMenuOpen(false);
    open();
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-slate-900 backdrop-blur shadow-lg z-50">
      <div className="max-w-7xl mx-auto h-20 px-5 sm:px-6 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          onClick={closeMobileMenu}
          className="text-2xl font-bold text-white shrink-0"
        >
          Matelematics
        </Link>

        {/* Navigation desktop */}
        <div className="hidden lg:flex items-center gap-6 text-white">

          <Link
            href="/"
            className="hover:text-blue-500 transition"
          >
            Accueil
          </Link>

          <Link
            href="/#solutions"
            className="hover:text-blue-500 transition"
          >
            Solutions
          </Link>

          <Link
            href="/demo"
            className="hover:text-blue-500 transition"
          >
            Dashboard
          </Link>

          <Link
            href="/#contact"
            className="hover:text-blue-500 transition"
          >
            Contact
          </Link>

          <Link
            href="/login"
            className="hover:text-blue-500 transition"
          >
            Connexion client
          </Link>

          <button
            type="button"
            onClick={open}
            className="bg-blue-600 text-white px-6 py-3 rounded-3xl hover:bg-blue-700 transition duration-300 whitespace-nowrap"
          >
            Demander une démo
          </button>
        </div>

        {/* Bouton hamburger mobile/tablette */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-xl text-white hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            /* Croix */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            /* Hamburger */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Menu mobile/tablette */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-700 bg-slate-900 shadow-xl">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-5 flex flex-col gap-1">

            <Link
              href="/"
              onClick={closeMobileMenu}
              className="text-white px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-blue-400 transition"
            >
              Accueil
            </Link>

            <Link
              href="/#solutions"
              onClick={closeMobileMenu}
              className="text-white px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-blue-400 transition"
            >
              Solutions
            </Link>

            <Link
              href="/demo"
              onClick={closeMobileMenu}
              className="text-white px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-blue-400 transition"
            >
              Dashboard
            </Link>

            <Link
              href="/#contact"
              onClick={closeMobileMenu}
              className="text-white px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-blue-400 transition"
            >
              Contact
            </Link>

            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="text-white px-4 py-3 rounded-xl hover:bg-slate-800 hover:text-blue-400 transition"
            >
              Connexion client
            </Link>

            <button
              type="button"
              onClick={openDemo}
              className="mt-3 w-full bg-blue-600 text-white px-6 py-3.5 rounded-2xl hover:bg-blue-700 transition duration-300 font-medium"
            >
              Demander une démo
            </button>

          </div>
        </div>
      )}
    </nav>
  );
}
