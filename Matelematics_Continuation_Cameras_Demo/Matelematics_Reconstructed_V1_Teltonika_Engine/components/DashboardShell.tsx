"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Menu,
  LogOut,
  User,
  Home,
  Truck,
  Map,
  AlertTriangle,
  Activity,
  ClipboardList,
  Wrench,
  Users,
  Fuel,
  Globe,
  Settings,
  Headphones,
  Search,
  Bell,
  Maximize,
  X,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Video,
} from "lucide-react";

type DashboardShellProps = {
  children: ReactNode;
  basePath: string;
  onLogout?: () => void;
  showLogout?: boolean;
  userName?: string;
  userRole?: "matelematics_admin" | "partner_admin" | "client_admin" | "user";
  userRoleLabel?: string;

};

function buildHref(basePath: string, target: string) {
  if (target === "/") {
    return basePath;
  }

  return `${basePath}${target.startsWith("/") ? target : `/${target}`}`;
}

export default function DashboardShell({
  children,
  basePath,
  onLogout,
  showLogout = true,
  userName = "Utilisateur",
  userRole,
  userRoleLabel = "Utilisateur",
}: DashboardShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allMenuItems = useMemo(
    () => [
      { name: "Vue d'ensemble", href: buildHref(basePath, "/"), icon: Home },
      { name: "Administration", href: buildHref(basePath, "/admin"), icon: ShieldCheck },
      { name: "Véhicules", href: buildHref(basePath, "/vehicles"), icon: Truck },
      { name: "Carte en direct", href: buildHref(basePath, "/map"), icon: Map },
      { name: "Caméras", href: buildHref(basePath, "/cameras"), icon: Video },
      { name: "Historique", href: buildHref(basePath, "/history"), icon: ClipboardList },
      { name: "Alertes", href: buildHref(basePath, "/alerts"), icon: AlertTriangle },
      { name: "Diagnostic", href: buildHref(basePath, "/diagnostics"), icon: Activity },
      { name: "Rapports", href: buildHref(basePath, "/rapports"), icon: ClipboardList },
      { name: "Maintenance", href: buildHref(basePath, "/maintenance"), icon: Wrench },
      { name: "Conducteurs", href: buildHref(basePath, "/conducteurs"), icon: Users },
      { name: "Carburant", href: buildHref(basePath, "/carburant"), icon: Fuel },
      { name: "Géozones", href: buildHref(basePath, "/geozones"), icon: Globe },
      { name: "Paramètres", href: buildHref(basePath, "/parametres"), icon: Settings },
      { name: "Support", href: buildHref(basePath, "/Support"), icon: Headphones },
    ],
    [basePath]
  );

  

  const menuItems = useMemo(() => {
    if (basePath !== "/dashboard") {
      return allMenuItems;
    }

    const canManage =
      userRole === "matelematics_admin" ||
      userRole === "partner_admin" ||
      userRole === "client_admin";

    if (canManage) {
      return allMenuItems;
    }

    return allMenuItems.filter(
      (item) => item.href !== buildHref(basePath, "/admin"),
    );
  }, [allMenuItems, basePath, userRole]);
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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-x-hidden">
      <aside className="hidden lg:flex w-72 shrink-0 bg-slate-900 border-r border-slate-800 flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Menu className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">Matelematics</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {showLogout && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition mt-4"
            >
              <LogOut className="h-5 w-5" />
              <span>Déconnexion</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>

            <div>
              <p className="font-medium">{userName}</p>
              <p className="text-sm text-slate-400">{userRoleLabel}</p>
            </div>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
          />

          <aside className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-72 flex-col border-r border-slate-800 bg-slate-900 shadow-2xl lg:hidden">
            <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                  <Menu className="h-5 w-5" />
                </div>
                <span className="text-lg font-bold">Matelematics</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {showLogout && onLogout && (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className="mt-4 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Déconnexion</span>
                </button>
              )}
            </nav>

            <div className="border-t border-slate-800 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{userName}</p>
                  <p className="truncate text-sm text-slate-400">{userRoleLabel}</p>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      <div className="min-w-0 flex-1 flex flex-col">
        <header className="h-16 shrink-0 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="truncate text-base font-bold sm:text-lg lg:hidden">Matelematics</span>
            <div className="hidden md:flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Recherche</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-5">
            <button
              type="button"
              onClick={async () => {
                if (
                  document.fullscreenElement
                ) {
                  await document.exitFullscreen();
                } else {
                  await document.documentElement.requestFullscreen();
                }
              }}
              className="hidden sm:inline-flex hover:text-blue-400 transition"
              title="Plein ecran"
            >
              <Maximize className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((previous) => !previous)}
                className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition ${
                  notificationsOpen
                    ? "bg-slate-800 text-blue-400"
                    : "text-slate-300 hover:bg-slate-800 hover:text-blue-400"
                }`}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <Bell className="h-5 w-5" />

                {notifications.length > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-slate-900">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed left-3 right-3 top-20 z-50 overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[380px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
                    <div>
                      <h3 className="font-semibold text-white">Notifications</h3>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {notifications.length} notifications récentes
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="max-h-[390px] overflow-y-auto">
                    {notifications.map((notification) => {
                      const Icon = notification.icon;

                      const iconStyle =
                        notification.type === "danger"
                          ? "bg-red-500/10 text-red-400"
                          : notification.type === "warning"
                          ? "bg-amber-500/10 text-amber-400"
                          : notification.type === "success"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-blue-500/10 text-blue-400";

                      return (
                        <div
                          key={notification.id}
                          className="group border-b border-slate-800 px-4 py-4 transition hover:bg-slate-800/60"
                        >
                          <div className="flex gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-white">
                                  {notification.title}
                                </p>
                                <span className="shrink-0 text-[10px] text-slate-500">
                                  {notification.time}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-slate-400">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-800 bg-slate-950/50 p-3">
                    <Link
                      href={`${basePath}/alerts`}
                      onClick={() => setNotificationsOpen(false)}
                      className="flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
                    >
                      Voir toutes les alertes
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden xl:flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="max-w-48 truncate text-sm">{userName}</span>
            </div>

            <Link
              href={`${basePath}/rapports/export`}
              className="hidden md:inline-flex bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition"
            >
              Exporter rapport
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto bg-slate-950 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}




