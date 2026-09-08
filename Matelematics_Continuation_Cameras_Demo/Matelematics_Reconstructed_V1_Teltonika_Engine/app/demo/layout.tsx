"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Menu,
  User,
  Home,
  Truck,
  Map,
  Camera,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ClipboardList,
  Wrench,
  Users,
  Fuel,
  Globe,
  Settings,
  Headphones,
  Bell,
  Maximize,
  Minimize,
  X,
  CheckCircle2,
  MapPin,
  BarChart3,
  UserCircle,
  Briefcase,
} from "lucide-react";

export default function DemoLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const notifications = [
    {
      id: 1,
      type: "danger",
      title: "Excès de vitesse",
      message: "Renault Express • Casablanca",
      time: "Il y a 5 min",
      icon: AlertTriangle,
    },
    {
      id: 2,
      type: "warning",
      title: "Batterie faible",
      message: "Ford Transit • Rabat",
      time: "Il y a 12 min",
      icon: AlertTriangle,
    },
    {
      id: 3,
      type: "info",
      title: "Entrée en géozone",
      message: "Dacia Dokker • Tanger",
      time: "Il y a 18 min",
      icon: MapPin,
    },
    {
      id: 4,
      type: "success",
      title: "Trajet terminé",
      message: "Ford Transit • Casablanca",
      time: "Il y a 26 min",
      icon: CheckCircle2,
    },
  ];

  const menuItems = [
    {
      name: "Vue d'ensemble",
      href: "/demo",
      icon: Home,
    },
    {
      name: "Administration",
      href: "/demo/admin",
      icon: ShieldCheck,
    },
    {
      name: "Véhicules",
      href: "/demo/vehicles",
      icon: Truck,
    },
    {
      name: "Carte en direct",
      href: "/demo/map",
      icon: Map,
    },
    {
      name: "Caméras",
      href: "/demo/cameras",
      icon: Camera,
    },
    {
      name: "Historique",
      href: "/demo/history",
      icon: ClipboardList,
    },
    {
      name: "Alertes",
      href: "/demo/alerts",
      icon: AlertTriangle,
    },
    {
      name: "Diagnostic",
      href: "/demo/diagnostics",
      icon: Activity,
    },
    {
      name: "Rapports",
      href: "/demo/rapports",
      icon: BarChart3,
    },
    {
      name: "Maintenance",
      href: "/demo/maintenance",
      icon: Wrench,
    },
    {
      name: "Conducteurs",
      href: "/demo/conducteurs",
      icon: Users,
    },
    {
      name: "Carburant",
      href: "/demo/carburant",
      icon: Fuel,
    },
    {
      name: "Géozones",
      href: "/demo/geozones",
      icon: Globe,
    },
    {
      name: "Paramètres",
      href: "/demo/parametres",
      icon: Settings,
    },
    {
      name: "Profil",
      href: "/demo/profil",
      icon: UserCircle,
    },
    {
      name: "Contact",
      href: "/demo/contact",
      icon: Briefcase,
    },
    {
      name: "Solutions",
      href: "/demo/solutions",
      icon: BarChart3,
    },
    {
      name: "Support",
      href: "/demo/support",
      icon: Headphones,
    },
  ];

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Impossible d'activer le plein écran :", error);
    }
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-950 text-white">

      {/* ========================================================= */}
      {/* SIDEBAR                                                   */}
      {/* ========================================================= */}

      <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">

        {/* LOGO */}

        <div className="flex h-16 items-center border-b border-slate-800 px-6">

          <Link
            href="/demo"
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/20">
              <Menu className="h-5 w-5" />
            </div>

            <span className="text-xl font-bold tracking-tight">
              Matelematics
            </span>
          </Link>

        </div>

        {/* ======================================================= */}
        {/* BANDEAU DEMONSTRATION                                   */}
        {/* ======================================================= */}

        <div className="mx-4 mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-3">

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

            <p className="text-xs font-semibold tracking-wide text-cyan-400">
              MODE DÉMONSTRATION
            </p>

          </div>

          <p className="mt-1 text-[11px] text-slate-500">
            Données fictives pour présentation
          </p>

        </div>

        {/* ======================================================= */}
        {/* NAVIGATION                                               */}
        {/* ======================================================= */}

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-all duration-200 hover:bg-slate-800 hover:text-white"
              >

                <Icon className="h-5 w-5 shrink-0 text-slate-500 transition-colors group-hover:text-cyan-400" />

                <span>{item.name}</span>

              </Link>
            );
          })}

        </nav>

        {/* ======================================================= */}
        {/* ACTIONS BAS SIDEBAR                                     */}
        {/* ======================================================= */}

        <div className="border-t border-slate-800 p-4">

          <Link
            href="/login"
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium shadow-lg shadow-blue-600/10 transition-all hover:bg-blue-700 hover:shadow-blue-600/20"
          >
            <User className="h-4 w-4" />
            Connexion client
          </Link>

          <Link
            href="/"
            className="flex w-full items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-xs text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
          >
            Retour au site
          </Link>

        </div>

      </aside>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
            aria-label="Fermer le menu"
          />

          <aside className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-72 flex-col border-r border-slate-800 bg-slate-900 shadow-2xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
              <Link href="/demo" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                  <Menu className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold">Matelematics</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mx-4 mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <p className="text-xs font-semibold tracking-wide text-cyan-400">MODE DÉMONSTRATION</p>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Données fictives pour présentation</p>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-cyan-400" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-800 p-4">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium">
                <User className="h-4 w-4" /> Connexion client
              </Link>
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex w-full items-center justify-center rounded-xl border border-slate-700 px-4 py-2.5 text-xs text-slate-400">
                Retour au site
              </Link>
            </div>
          </aside>
        </>
      )}

      {/* ========================================================= */}
      {/* CONTENU PRINCIPAL                                         */}
      {/* ========================================================= */}

      <div className="flex min-w-0 flex-1 flex-col">

        {/* ======================================================= */}
        {/* HEADER                                                   */}
        {/* ======================================================= */}

        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-3 sm:px-4 lg:px-6">

          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-base font-bold sm:text-lg lg:hidden">Matelematics</span>

            <div className="hidden items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 md:flex">

              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />

              <span className="text-sm text-slate-400">
                Démonstration Matelematics
              </span>

            </div>

          </div>

          <div className="flex items-center gap-3">

            {/* ================================================= */}
            {/* PLEIN ÉCRAN                                       */}
            {/* ================================================= */}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-cyan-400"
              title={
                isFullscreen
                  ? "Quitter le plein écran"
                  : "Activer le plein écran"
              }
              aria-label={
                isFullscreen
                  ? "Quitter le plein écran"
                  : "Activer le plein écran"
              }
            >

              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}

            </button>

            {/* ================================================= */}
            {/* NOTIFICATIONS                                      */}
            {/* ================================================= */}

            <div className="relative">

              <button
                type="button"
                onClick={() =>
                  setNotificationsOpen((value) => !value)
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 hover:text-cyan-400"
                aria-label="Notifications"
              >

                <Bell className="h-5 w-5" />

                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notifications.length}
                </span>

              </button>

              {notificationsOpen && (

                <div className="fixed left-3 right-3 top-20 z-50 overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[380px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">

                  {/* HEADER NOTIFICATIONS */}

                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">

                    <div>

                      <h3 className="font-semibold text-white">
                        Notifications
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        Données de démonstration
                      </p>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setNotificationsOpen(false)
                      }
                      className="rounded-lg p-1 transition hover:bg-slate-800"
                      aria-label="Fermer les notifications"
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </button>

                  </div>

                  {/* LISTE */}

                  <div className="max-h-[390px] overflow-y-auto">

                    {notifications.map((notification) => {

                      const Icon = notification.icon;

                      return (
                        <div
                          key={notification.id}
                          className="border-b border-slate-800 px-4 py-4 transition hover:bg-slate-800/40"
                        >

                          <div className="flex gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800">

                              <Icon className="h-4 w-4" />

                            </div>

                            <div className="min-w-0">

                              <p className="text-sm font-medium text-white">
                                {notification.title}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {notification.message}
                              </p>

                              <p className="mt-1 text-[10px] text-slate-600">
                                {notification.time}
                              </p>

                            </div>

                          </div>

                        </div>
                      );
                    })}

                  </div>

                </div>

              )}

            </div>

            {/* ================================================= */}
            {/* PROFIL DEMONSTRATION                                */}
            {/* ================================================= */}

            <div className="hidden items-center gap-2 sm:flex">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 shadow-lg shadow-blue-600/20">

                <User className="h-4 w-4" />

              </div>

              <div>

                <p className="text-sm font-medium text-white">
                  Démonstration
                </p>

                <p className="text-[11px] text-slate-500">
                  Visiteur
                </p>

              </div>

            </div>

            {/* ================================================= */}
            {/* CONNEXION                                          */}
            {/* ================================================= */}

            <Link
              href="/login"
              className="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-700 sm:inline-flex"
            >
              Connexion
            </Link>

          </div>

        </header>

        {/* ======================================================= */}
        {/* PAGE                                                     */}
        {/* ======================================================= */}

        <main className="min-w-0 flex-1 overflow-auto bg-slate-950 p-0 sm:p-2 lg:p-6">

          {children}

        </main>

      </div>

    </div>
  );
}