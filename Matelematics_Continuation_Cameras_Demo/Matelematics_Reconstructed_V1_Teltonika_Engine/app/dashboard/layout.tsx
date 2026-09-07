"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

import DashboardShell from "../../components/DashboardShell";

import {
  supabase,
} from "../components/supabase";

import {
  DashboardAccessProvider,
  type DashboardIdentity,
  type DashboardRole,
} from "./DashboardAccessContext";


const VALID_ROLES:
  DashboardRole[] = [
    "matelematics_admin",
    "partner_admin",
    "client_admin",
    "user",
  ];


function isDashboardRole(
  value: unknown,
): value is DashboardRole {
  return VALID_ROLES.includes(
    value as DashboardRole,
  );
}


function roleLabel(
  role: DashboardRole,
) {
  switch (role) {
    case "matelematics_admin":
      return "Administrateur Matelematics";

    case "partner_admin":
      return "Administrateur partenaire";

    case "client_admin":
      return "Administrateur client";

    case "user":
      return "Utilisateur";

    default:
      return "Utilisateur";
  }
}


export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router =
    useRouter();

  const [
    identity,
    setIdentity,
  ] =
    useState<DashboardIdentity | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  useEffect(() => {
    let mounted =
      true;


    async function loadIdentity() {
      setLoading(true);
      setError(null);


      const {
        data: {
          session,
        },
        error:
          sessionError,
      } =
        await supabase.auth.getSession();


      if (
        sessionError ||
        !session
      ) {
        router.replace(
          "/login",
        );

        return;
      }


      const {
        data: profile,
        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles",
          )
          .select(
            "id,full_name,role,company_id,partner_id",
          )
          .eq(
            "id",
            session.user.id,
          )
          .single();


      if (!mounted) {
        return;
      }


      if (
        profileError ||
        !profile
      ) {
        console.error(
          "[Dashboard] profile load error",
          profileError,
        );

        setError(
          "Impossible de charger votre profil Matelematics.",
        );

        setLoading(false);

        return;
      }


      if (
        !isDashboardRole(
          profile.role,
        )
      ) {
        setError(
          "Votre rôle utilisateur n'est pas reconnu.",
        );

        setLoading(false);

        return;
      }


      setIdentity({
        id:
          session.user.id,

        email:
          session.user.email ??
          null,

        fullName:
          profile.full_name ||
          session.user.email ||
          "Utilisateur",

        role:
          profile.role,

        companyId:
          profile.company_id,

        partnerId:
          profile.partner_id,
      });


      setLoading(false);
    }


    void loadIdentity();


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          session,
        ) => {
          if (
            event ===
              "SIGNED_OUT" ||
            !session
          ) {
            router.replace(
              "/login",
            );
          }
        },
      );


    return () => {
      mounted =
        false;

      subscription.unsubscribe();
    };
  }, [
    router,
  ]);


  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace(
      "/login",
    );
  }


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />

          <p className="text-sm text-slate-400">
            Chargement de votre espace...
          </p>
        </div>
      </div>
    );
  }


  if (
    error ||
    !identity
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="font-semibold text-red-300">
            Accès impossible
          </p>

          <p className="mt-2 text-sm text-red-200/70">
            {error ??
              "Profil utilisateur indisponible."}
          </p>

          <button
            type="button"
            onClick={
              handleLogout
            }
            className="mt-5 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition hover:bg-slate-700"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }


  return (
    <DashboardAccessProvider
      identity={
        identity
      }
    >
      <DashboardShell
        basePath="/dashboard"
        onLogout={
          handleLogout
        }
        userName={
          identity.fullName
        }
        userRole={
          identity.role
        }
        userRoleLabel={
          roleLabel(
            identity.role,
          )
        }
      >
        {children}
      </DashboardShell>
    </DashboardAccessProvider>
  );
}
