"use client";

import type { ReactNode } from "react";

import {
  useDashboardAccess,
} from "../DashboardAccessContext";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const {
    canManage,
  } = useDashboardAccess();

  if (!canManage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="font-semibold text-red-300">
            Accès refusé
          </p>

          <p className="mt-2 text-sm text-red-200/70">
            Votre rôle ne permet pas d'accéder à l'administration.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
