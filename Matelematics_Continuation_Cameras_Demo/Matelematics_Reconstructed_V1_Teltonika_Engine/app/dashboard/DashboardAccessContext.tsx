"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

export type DashboardRole =
  | "matelematics_admin"
  | "partner_admin"
  | "client_admin"
  | "user";

export type DashboardIdentity = {
  id: string;
  email: string | null;
  fullName: string;
  role: DashboardRole;
  companyId: string | null;
  partnerId: string | null;
};

type DashboardAccessValue = {
  identity: DashboardIdentity;

  isMatelematicsAdmin: boolean;
  isPartnerAdmin: boolean;
  isClientAdmin: boolean;
  isUser: boolean;

  canManage: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const DashboardAccessContext =
  createContext<DashboardAccessValue | null>(
    null,
  );

export function DashboardAccessProvider({
  identity,
  children,
}: {
  identity: DashboardIdentity;
  children: ReactNode;
}) {
  const isMatelematicsAdmin =
    identity.role ===
    "matelematics_admin";

  const isPartnerAdmin =
    identity.role ===
    "partner_admin";

  const isClientAdmin =
    identity.role ===
    "client_admin";

  const isUser =
    identity.role ===
    "user";

  const canManage =
    isMatelematicsAdmin ||
    isPartnerAdmin ||
    isClientAdmin;

  return (
    <DashboardAccessContext.Provider
      value={{
        identity,

        isMatelematicsAdmin,
        isPartnerAdmin,
        isClientAdmin,
        isUser,

        canManage,

        canCreate:
          canManage,

        canUpdate:
          canManage,

        canDelete:
          canManage,
      }}
    >
      {children}
    </DashboardAccessContext.Provider>
  );
}

export function useDashboardAccess() {
  const context =
    useContext(
      DashboardAccessContext,
    );

  if (!context) {
    throw new Error(
      "useDashboardAccess must be used inside DashboardAccessProvider",
    );
  }

  return context;
}
