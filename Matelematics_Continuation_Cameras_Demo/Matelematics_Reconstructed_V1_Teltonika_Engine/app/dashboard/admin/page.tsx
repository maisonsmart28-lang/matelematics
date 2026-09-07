"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  supabase,
} from "../../components/supabase";

import {
  useDashboardAccess,
} from "../DashboardAccessContext";

type Role =
  | "matelematics_admin"
  | "partner_admin"
  | "client_admin"
  | "user";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  company_id: string | null;
  partner_id: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

type CompanyRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  partner_id: string | null;
};

type PartnerRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
};

type AdminPayload = {
  users: UserRow[];
  companies: CompanyRow[];
  partners: PartnerRow[];
};

function roleLabel(
  role: Role
) {
  switch (role) {
    case "matelematics_admin":
      return "Matelematics Admin";

    case "partner_admin":
      return "Partner Admin";

    case "client_admin":
      return "Client Admin";

    default:
      return "Utilisateur";
  }
}

export default function AdminPage() {
  const {
    identity,
    isMatelematicsAdmin,
    isPartnerAdmin,
    isClientAdmin,
  } =
    useDashboardAccess();

  const [
    tab,
    setTab,
  ] =
    useState<
      "users" | "companies"
    >("users");

  const [
    data,
    setData,
  ] =
    useState<AdminPayload>({
      users: [],
      companies: [],
      partners: [],
    });

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
      null
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    showUserModal,
    setShowUserModal,
  ] =
    useState(false);

  const [
    showCompanyModal,
    setShowCompanyModal,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    userForm,
    setUserForm,
  ] =
    useState({
      full_name: "",
      email: "",
      password: "",
      role:
        "user" as Role,
      company_id: "",
      partner_id: "",
    });

  const [
    companyForm,
    setCompanyForm,
  ] =
    useState({
      name: "",
      email: "",
      phone: "",
      address: "",
      partner_id: "",
    });

  const apiFetch =
    useCallback(
      async (
        init?: RequestInit
      ) => {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            "Session expirée."
          );
        }

        return fetch(
          "/api/admin",
          {
            ...init,

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,

              ...(init?.headers ??
                {}),
            },
          }
        );
      },
      []
    );

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await apiFetch({
              method: "GET",
              cache: "no-store",
            });

          const payload =
            await response.json();

          if (!response.ok) {
            throw new Error(
              payload.error ??
              "Chargement impossible."
            );
          }

          setData(payload);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Erreur."
          );
        } finally {
          setLoading(false);
        }
      },
      [apiFetch]
    );

  useEffect(() => {
    void load();
  }, [load]);

  const companyName =
    useMemo(
      () =>
        new Map(
          data.companies.map(
            (company) => [
              company.id,
              company.name,
            ]
          )
        ),
      [data.companies]
    );

  const partnerName =
    useMemo(
      () =>
        new Map(
          data.partners.map(
            (partner) => [
              partner.id,
              partner.name,
            ]
          )
        ),
      [data.partners]
    );

  const users =
    useMemo(() => {
      const q =
        query
          .trim()
          .toLowerCase();

      if (!q) {
        return data.users;
      }

      return data.users.filter(
        (user) =>
          (
            user.full_name ??
            ""
          )
            .toLowerCase()
            .includes(q) ||
          (
            user.email ??
            ""
          )
            .toLowerCase()
            .includes(q) ||
          roleLabel(
            user.role
          )
            .toLowerCase()
            .includes(q)
      );
    }, [
      data.users,
      query,
    ]);

  const companies =
    useMemo(() => {
      const q =
        query
          .trim()
          .toLowerCase();

      if (!q) {
        return data.companies;
      }

      return data.companies.filter(
        (company) =>
          company.name
            .toLowerCase()
            .includes(q)
      );
    }, [
      data.companies,
      query,
    ]);

  const availableRoles:
    Role[] =
    isMatelematicsAdmin
      ? [
          "partner_admin",
          "client_admin",
          "user",
        ]
      : isPartnerAdmin
        ? [
            "client_admin",
            "user",
          ]
        : [
            "user",
          ];

  async function createUser() {
    setSubmitting(true);
    setError(null);

    try {
      const response =
        await apiFetch({
          method: "POST",

          body:
            JSON.stringify({
              action:
                "create_user",

              ...userForm,

              company_id:
                userForm.company_id ||
                null,

              partner_id:
                userForm.partner_id ||
                null,
            }),
        });

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ??
          "Création impossible."
        );
      }

      setShowUserModal(
        false
      );

      setUserForm({
        full_name: "",
        email: "",
        password: "",
        role: "user",
        company_id: "",
        partner_id: "",
      });

      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Erreur."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createCompany() {
    setSubmitting(true);
    setError(null);

    try {
      const response =
        await apiFetch({
          method: "POST",

          body:
            JSON.stringify({
              action:
                "create_company",

              ...companyForm,

              partner_id:
                companyForm.partner_id ||
                null,
            }),
        });

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error ??
          "Création impossible."
        );
      }

      setShowCompanyModal(
        false
      );

      setCompanyForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        partner_id: "",
      });

      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Erreur."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            </div>

            <div>

              <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
                Administration réelle
              </p>

              <h1 className="mt-1 text-2xl font-semibold text-white">
                Gestion Matelematics
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Connecté en tant que{" "}
                <span className="font-medium text-white">
                  {identity.fullName}
                </span>{" "}
                · {roleLabel(identity.role)}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={() =>
              void load()
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-slate-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Actualiser
          </button>

        </div>

      </section>


      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}


      <section className="grid gap-4 sm:grid-cols-3">

        <Kpi
          label="Utilisateurs"
          value={
            data.users.length
          }
          icon={Users}
        />

        <Kpi
          label="Entreprises"
          value={
            data.companies.length
          }
          icon={Building2}
        />

        <Kpi
          label="Partenaires"
          value={
            data.partners.length
          }
          icon={ShieldCheck}
        />

      </section>


      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

        <div className="border-b border-slate-800 p-4">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex gap-2">

              <button
                type="button"
                onClick={() => {
                  setTab("users");
                  setQuery("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab === "users"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Utilisateurs
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab(
                    "companies"
                  );
                  setQuery("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  tab ===
                  "companies"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Clients / Entreprises
              </button>

            </div>


            <div className="flex flex-col gap-2 sm:flex-row">

              <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">

                <Search className="h-4 w-4 text-slate-500" />

                <input
                  value={query}
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target.value
                    )
                  }
                  placeholder="Rechercher..."
                  className="w-52 bg-transparent text-sm text-white outline-none"
                />

              </div>


              {tab ===
              "users" ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowUserModal(
                      true
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                >
                  <UserPlus className="h-4 w-4" />

                  Ajouter utilisateur
                </button>
              ) : (
                (
                  isMatelematicsAdmin ||
                  isPartnerAdmin
                ) && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowCompanyModal(
                        true
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                  >
                    <Plus className="h-4 w-4" />

                    Ajouter client
                  </button>
                )
              )}

            </div>

          </div>

        </div>


        {tab === "users" ? (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">

                  <Th>Utilisateur</Th>
                  <Th>Email</Th>
                  <Th>Rôle</Th>
                  <Th>Périmètre</Th>
                  <Th>Dernière connexion</Th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">

                {users.map(
                  (user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-800/40"
                    >

                      <Td>
                        <p className="font-medium text-white">
                          {
                            user.full_name ??
                            "—"
                          }
                        </p>

                        <p className="text-xs text-slate-600">
                          {user.id}
                        </p>
                      </Td>

                      <Td>
                        {user.email ??
                          "—"}
                      </Td>

                      <Td>
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-300">
                          {roleLabel(
                            user.role
                          )}
                        </span>
                      </Td>

                      <Td>
                        {user.company_id
                          ? companyName.get(
                              user.company_id
                            ) ??
                            user.company_id
                          : user.partner_id
                            ? partnerName.get(
                                user.partner_id
                              ) ??
                              user.partner_id
                            : "Global"}
                      </Td>

                      <Td>
                        {user.last_sign_in_at
                          ? new Date(
                              user.last_sign_in_at
                            ).toLocaleString(
                              "fr-FR"
                            )
                          : "Jamais"}
                      </Td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">

                  <Th>Entreprise</Th>
                  <Th>Partenaire</Th>
                  <Th>Email</Th>
                  <Th>Téléphone</Th>
                  <Th>Adresse</Th>

                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">

                {companies.map(
                  (company) => (
                    <tr
                      key={
                        company.id
                      }
                      className="hover:bg-slate-800/40"
                    >

                      <Td>
                        <p className="font-medium text-white">
                          {
                            company.name
                          }
                        </p>

                        <p className="text-xs text-slate-600">
                          {
                            company.id
                          }
                        </p>
                      </Td>

                      <Td>
                        {company.partner_id
                          ? partnerName.get(
                              company.partner_id
                            ) ??
                            company.partner_id
                          : "Matelematics / direct"}
                      </Td>

                      <Td>
                        {
                          company.email ??
                          "—"
                        }
                      </Td>

                      <Td>
                        {
                          company.phone ??
                          "—"
                        }
                      </Td>

                      <Td>
                        {
                          company.address ??
                          "—"
                        }
                      </Td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>


      {showUserModal && (
        <Modal
          title="Ajouter un utilisateur"
          onClose={() =>
            setShowUserModal(
              false
            )
          }
        >

          <div className="grid gap-4 sm:grid-cols-2">

            <Field
              label="Nom complet"
              value={
                userForm.full_name
              }
              onChange={(
                value
              ) =>
                setUserForm(
                  (current) => ({
                    ...current,
                    full_name:
                      value,
                  })
                )
              }
            />

            <Field
              label="Email"
              type="email"
              value={
                userForm.email
              }
              onChange={(
                value
              ) =>
                setUserForm(
                  (current) => ({
                    ...current,
                    email:
                      value,
                  })
                )
              }
            />

            <Field
              label="Mot de passe temporaire"
              type="password"
              value={
                userForm.password
              }
              onChange={(
                value
              ) =>
                setUserForm(
                  (current) => ({
                    ...current,
                    password:
                      value,
                  })
                )
              }
            />

            <label className="space-y-2">

              <span className="text-xs font-medium text-slate-400">
                Rôle
              </span>

              <select
                value={
                  userForm.role
                }
                onChange={(
                  event
                ) =>
                  setUserForm(
                    (current) => ({
                      ...current,
                      role:
                        event.target.value as Role,
                      company_id: "",
                      partner_id: "",
                    })
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
              >

                {availableRoles.map(
                  (role) => (
                    <option
                      key={role}
                      value={role}
                    >
                      {roleLabel(
                        role
                      )}
                    </option>
                  )
                )}

              </select>

            </label>


            {userForm.role ===
            "partner_admin" ? (

              <label className="space-y-2 sm:col-span-2">

                <span className="text-xs font-medium text-slate-400">
                  Partenaire
                </span>

                <select
                  value={
                    userForm.partner_id
                  }
                  onChange={(
                    event
                  ) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        partner_id:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                >

                  <option value="">
                    Sélectionner...
                  </option>

                  {data.partners.map(
                    (partner) => (
                      <option
                        key={
                          partner.id
                        }
                        value={
                          partner.id
                        }
                      >
                        {
                          partner.name
                        }
                      </option>
                    )
                  )}

                </select>

              </label>

            ) : (

              <label className="space-y-2 sm:col-span-2">

                <span className="text-xs font-medium text-slate-400">
                  Entreprise
                </span>

                <select
                  value={
                    userForm.company_id
                  }
                  onChange={(
                    event
                  ) =>
                    setUserForm(
                      (current) => ({
                        ...current,
                        company_id:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                >

                  <option value="">
                    Sélectionner...
                  </option>

                  {data.companies.map(
                    (company) => (
                      <option
                        key={
                          company.id
                        }
                        value={
                          company.id
                        }
                      >
                        {
                          company.name
                        }
                      </option>
                    )
                  )}

                </select>

              </label>
            )}

          </div>


          <div className="mt-6 flex justify-end gap-2">

            <button
              type="button"
              onClick={() =>
                setShowUserModal(
                  false
                )
              }
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={
                submitting
              }
              onClick={() =>
                void createUser()
              }
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Création..."
                : "Créer l'utilisateur"}
            </button>

          </div>

        </Modal>
      )}


      {showCompanyModal && (
        <Modal
          title="Ajouter un client / entreprise"
          onClose={() =>
            setShowCompanyModal(
              false
            )
          }
        >

          <div className="grid gap-4 sm:grid-cols-2">

            <Field
              label="Nom"
              value={
                companyForm.name
              }
              onChange={(
                value
              ) =>
                setCompanyForm(
                  (current) => ({
                    ...current,
                    name:
                      value,
                  })
                )
              }
            />

            <Field
              label="Email"
              type="email"
              value={
                companyForm.email
              }
              onChange={(
                value
              ) =>
                setCompanyForm(
                  (current) => ({
                    ...current,
                    email:
                      value,
                  })
                )
              }
            />

            <Field
              label="Téléphone"
              value={
                companyForm.phone
              }
              onChange={(
                value
              ) =>
                setCompanyForm(
                  (current) => ({
                    ...current,
                    phone:
                      value,
                  })
                )
              }
            />

            <Field
              label="Adresse"
              value={
                companyForm.address
              }
              onChange={(
                value
              ) =>
                setCompanyForm(
                  (current) => ({
                    ...current,
                    address:
                      value,
                  })
                )
              }
            />


            {isMatelematicsAdmin && (
              <label className="space-y-2 sm:col-span-2">

                <span className="text-xs font-medium text-slate-400">
                  Partenaire
                </span>

                <select
                  value={
                    companyForm.partner_id
                  }
                  onChange={(
                    event
                  ) =>
                    setCompanyForm(
                      (current) => ({
                        ...current,
                        partner_id:
                          event.target.value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white"
                >

                  <option value="">
                    Client direct Matelematics
                  </option>

                  {data.partners.map(
                    (partner) => (
                      <option
                        key={
                          partner.id
                        }
                        value={
                          partner.id
                        }
                      >
                        {
                          partner.name
                        }
                      </option>
                    )
                  )}

                </select>

              </label>
            )}

          </div>


          <div className="mt-6 flex justify-end gap-2">

            <button
              type="button"
              onClick={() =>
                setShowCompanyModal(
                  false
                )
              }
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300"
            >
              Annuler
            </button>

            <button
              type="button"
              disabled={
                submitting
              }
              onClick={() =>
                void createCompany()
              }
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Création..."
                : "Créer le client"}
            </button>

          </div>

        </Modal>
      )}

    </div>
  );
}


function Kpi({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">

      <div className="flex items-center justify-between">

        <p className="text-sm text-slate-400">
          {label}
        </p>

        <Icon className="h-5 w-5 text-blue-400" />

      </div>

      <p className="mt-3 text-3xl font-bold text-white">
        {value}
      </p>

    </div>
  );
}


function Th({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}


function Td({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <td className="px-5 py-4 text-sm text-slate-300">
      {children}
    </td>
  );
}


function Field({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange:
    (value: string) =>
      void;
}) {
  return (
    <label className="space-y-2">

      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={(
          event
        ) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500"
      />

    </label>
  );
}


function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

        <div className="flex items-center justify-between border-b border-slate-800 p-5">

          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-slate-400 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>

        </div>

        <div className="p-5">
          {children}
        </div>

      </div>

    </div>
  );
}