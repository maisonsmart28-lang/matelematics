"use client";

import Link from "next/link";
import { useDemoModal } from "./DemoContext";

export default function Navbar() {
  const { open } = useDemoModal();

  return (
    <nav className="fixed top-0 left-0 w-full h-20 bg-slate-900 backdrop-blur shadow-lg z-50">
      <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold text-white"
        >
          Matelematics
        </Link>

        {/* Navigation */}
        <div className="flex items-center space-x-6 text-white">

          {/* Accueil */}
          <Link
            href="/"
            className="hover:text-blue-600 transition"
          >
            Accueil
          </Link>

          {/* Solutions */}
          <Link
            href="#solutions"
            className="hover:text-blue-600 transition"
          >
            Solutions
          </Link>

          {/* Dashboard démonstratif */}
          <Link
            href="/demo"
            className="hover:text-blue-600 transition"
          >
            Dashboard
          </Link>

          {/* Contact */}
          <Link
            href="#contact"
            className="hover:text-blue-600 transition"
          >
            Contact
          </Link>

          {/* Connexion client */}
          <Link
            href="/login"
            className="hover:text-blue-600 transition"
          >
            Connexion client
          </Link>

          {/* Demander une démo */}
          <button
            type="button"
            onClick={open}
            className="mt-2 inline-block bg-blue-600 text-white px-6 py-3 rounded-3xl hover:bg-blue-700 transition duration-300"
          >
            Demander une démo
          </button>

        </div>
      </div>
    </nav>
  );
}