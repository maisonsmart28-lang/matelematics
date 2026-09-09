import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Role =
  | "matelematics_admin"
  | "partner_admin"
  | "client_admin"
  | "user";

const supabaseUrl =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const secretKey =
  process.env.SUPABASE_SECRET_KEY;

function getAdminClient() {
  if (!supabaseUrl || !secretKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SECRET_KEY absentes côté serveur."
    );
  }

  return createClient(
    supabaseUrl,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

async function authenticate(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  const token =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : null;

  if (!token) {
    return {
      error: "Session absente.",
      status: 401,
    } as const;
  }

  const admin =
    getAdminClient();

  const {
    data: userData,
    error: userError,
  } =
    await admin.auth.getUser(token);

  if (
    userError ||
    !userData.user
  ) {
    return {
      error: "Session invalide.",
      status: 401,
    } as const;
  }

  const {
    data: profile,
    error: profileError,
  } =
    await admin
      .from("profiles")
      .select(
        "id,full_name,role,company_id,partner_id"
      )
      .eq(
        "id",
        userData.user.id
      )
      .single();

  if (
    profileError ||
    !profile
  ) {
    return {
      error: "Profil introuvable.",
      status: 403,
    } as const;
  }

  if (
    ![
      "matelematics_admin",
      "partner_admin",
      "client_admin",
      "user",
    ].includes(profile.role)
  ) {
    return {
      error: "Rôle invalide.",
      status: 403,
    } as const;
  }

  return {
    admin,
    user: userData.user,
    profile: profile as {
      id: string;
      full_name: string | null;
      role: Role;
      company_id: string | null;
      partner_id: string | null;
    },
  } as const;
}

function canCreateRole(
  actor: Role,
  target: Role
) {
  if (
    actor ===
    "matelematics_admin"
  ) {
    return (
      target === "partner_admin" ||
      target === "client_admin" ||
      target === "user"
    );
  }

  if (
    actor ===
    "partner_admin"
  ) {
    return (
      target === "client_admin" ||
      target === "user"
    );
  }

  if (
    actor ===
    "client_admin"
  ) {
    return target === "user";
  }

  return false;
}

export async function GET(
  request: NextRequest
) {
  try {
    const auth =
      await authenticate(
        request
      );

    if ("error" in auth) {
      return NextResponse.json(
        {
          error: auth.error,
        },
        {
          status: auth.status,
        }
      );
    }

    if (
      auth.profile.role ===
      "user"
    ) {
      return NextResponse.json(
        {
          error:
            "Accès administration refusé.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      auth.profile.role ===
        "partner_admin" &&
      !auth.profile.partner_id
    ) {
      return NextResponse.json(
        {
          error:
            "Profil partenaire incomplet.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      auth.profile.role ===
        "client_admin" &&
      !auth.profile.company_id
    ) {
      return NextResponse.json(
        {
          error:
            "Profil client incomplet.",
        },
        {
          status: 403,
        }
      );
    }

    let companiesQuery =
      auth.admin
        .from("companies")
        .select(
          "id,name,email,phone,address,partner_id"
        )
        .order("name");

    if (
      auth.profile.role ===
        "partner_admin" &&
      auth.profile.partner_id
    ) {
      companiesQuery =
        companiesQuery.eq(
          "partner_id",
          auth.profile.partner_id
        );
    }

    if (
      auth.profile.role ===
        "client_admin" &&
      auth.profile.company_id
    ) {
      companiesQuery =
        companiesQuery.eq(
          "id",
          auth.profile.company_id
        );
    }

    const {
      data: companies,
      error: companiesError,
    } =
      await companiesQuery;

    if (companiesError) {
      throw companiesError;
    }

    const allowedCompanyIds =
      new Set(
        (companies ?? []).map(
          (company) =>
            company.id
        )
      );

    let partnersQuery =
      auth.admin
        .from("partners")
        .select(
          "id,name,email,phone,address,status"
        )
        .order("name");

    if (
      auth.profile.role ===
      "partner_admin"
    ) {
      partnersQuery =
        partnersQuery.eq(
          "id",
          auth.profile.partner_id
        );
    }

    if (
      auth.profile.role ===
      "client_admin"
    ) {
      const clientPartnerId =
        (companies ?? [])[0]
          ?.partner_id ??
        null;

      partnersQuery =
        clientPartnerId
          ? partnersQuery.eq(
              "id",
              clientPartnerId
            )
          : partnersQuery.is(
              "id",
              null
            );
    }

    const {
      data: partners,
      error: partnersError,
    } =
      await partnersQuery;

    if (partnersError) {
      throw partnersError;
    }

    const {
      data: profiles,
      error: profilesError,
    } =
      await auth.admin
        .from("profiles")
        .select(
          "id,full_name,role,company_id,partner_id,created_at"
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (profilesError) {
      throw profilesError;
    }

    let visibleProfiles =
      profiles ?? [];

    if (
      auth.profile.role ===
      "partner_admin"
    ) {
      visibleProfiles =
        visibleProfiles.filter(
          (profile) =>
            profile.partner_id ===
              auth.profile.partner_id ||
            (
              profile.company_id !==
                null &&
              allowedCompanyIds.has(
                profile.company_id
              )
            )
        );
    }

    if (
      auth.profile.role ===
      "client_admin"
    ) {
      visibleProfiles =
        visibleProfiles.filter(
          (profile) =>
            profile.company_id ===
            auth.profile.company_id
        );
    }

    const {
      data: authUsers,
      error: authUsersError,
    } =
      await auth.admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (authUsersError) {
      throw authUsersError;
    }

    const emailById =
      new Map(
        authUsers.users.map(
          (user) => [
            user.id,
            {
              email:
                user.email ?? null,

              lastSignInAt:
                user.last_sign_in_at ??
                null,
            },
          ]
        )
      );

    const users =
      visibleProfiles.map(
        (profile) => ({
          ...profile,

          email:
            emailById.get(
              profile.id
            )?.email ?? null,

          last_sign_in_at:
            emailById.get(
              profile.id
            )?.lastSignInAt ??
            null,
        })
      );

    return NextResponse.json({
      actor: auth.profile,
      users,
      companies:
        companies ?? [],
      partners:
        partners ?? [],
    });
  } catch (error) {
    console.error(
      "[Admin API GET]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur serveur.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const auth =
      await authenticate(
        request
      );

    if ("error" in auth) {
      return NextResponse.json(
        {
          error: auth.error,
        },
        {
          status: auth.status,
        }
      );
    }

    if (
      auth.profile.role ===
      "user"
    ) {
      return NextResponse.json(
        {
          error:
            "Opération interdite.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      auth.profile.role ===
        "partner_admin" &&
      !auth.profile.partner_id
    ) {
      return NextResponse.json(
        {
          error:
            "Profil partenaire incomplet.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      auth.profile.role ===
        "client_admin" &&
      !auth.profile.company_id
    ) {
      return NextResponse.json(
        {
          error:
            "Profil client incomplet.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await request.json();

    if (
      body.action ===
      "create_company"
    ) {
      if (
        auth.profile.role ===
        "client_admin"
      ) {
        return NextResponse.json(
          {
            error:
              "Un client_admin ne peut pas créer une entreprise.",
          },
          {
            status: 403,
          }
        );
      }

      const name =
        String(
          body.name ?? ""
        ).trim();

      if (!name) {
        return NextResponse.json(
          {
            error:
              "Le nom de l'entreprise est obligatoire.",
          },
          {
            status: 400,
          }
        );
      }

      let partnerId:
        string | null =
        body.partner_id ??
        null;

      if (
        auth.profile.role ===
        "partner_admin"
      ) {
        partnerId =
          auth.profile.partner_id;
      }

      const {
        data: company,
        error: companyError,
      } =
        await auth.admin
          .from("companies")
          .insert({
            name,

            email:
              String(
                body.email ??
                ""
              ).trim() ||
              null,

            phone:
              String(
                body.phone ??
                ""
              ).trim() ||
              null,

            address:
              String(
                body.address ??
                ""
              ).trim() ||
              null,

            partner_id:
              partnerId,
          })
          .select(
            "id,name,email,phone,address,partner_id"
          )
          .single();

      if (companyError) {
        throw companyError;
      }

      return NextResponse.json({
        company,
      });
    }

    if (
      body.action ===
      "create_user"
    ) {
      const email =
        String(
          body.email ?? ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          body.password ?? ""
        );

      const fullName =
        String(
          body.full_name ?? ""
        ).trim();

      const role =
        String(
          body.role ?? ""
        ) as Role;

      if (
        !email ||
        !password ||
        !fullName
      ) {
        return NextResponse.json(
          {
            error:
              "Nom, email et mot de passe sont obligatoires.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        password.length < 8
      ) {
        return NextResponse.json(
          {
            error:
              "Le mot de passe doit contenir au moins 8 caractères.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !canCreateRole(
          auth.profile.role,
          role
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Vous ne pouvez pas attribuer ce rôle.",
          },
          {
            status: 403,
          }
        );
      }

      let companyId:
        string | null =
        body.company_id ??
        null;

      let partnerId:
        string | null =
        body.partner_id ??
        null;

      if (
        role ===
        "partner_admin"
      ) {
        companyId = null;

        if (
          auth.profile.role ===
          "partner_admin"
        ) {
          partnerId =
            auth.profile.partner_id;
        }

        if (!partnerId) {
          return NextResponse.json(
            {
              error:
                "Un partner_admin doit être rattaché à un partenaire.",
            },
            {
              status: 400,
            }
          );
        }
      } else {
        partnerId = null;

        if (
          auth.profile.role ===
          "client_admin"
        ) {
          companyId =
            auth.profile.company_id;
        }

        if (!companyId) {
          return NextResponse.json(
            {
              error:
                "Ce rôle doit être rattaché à une entreprise.",
            },
            {
              status: 400,
            }
          );
        }
      }

      if (
        auth.profile.role ===
          "partner_admin" &&
        companyId
      ) {
        const {
          data: company,
        } =
          await auth.admin
            .from("companies")
            .select(
              "id,partner_id"
            )
            .eq(
              "id",
              companyId
            )
            .single();

        if (
          !company ||
          company.partner_id !==
            auth.profile.partner_id
        ) {
          return NextResponse.json(
            {
              error:
                "Entreprise hors de votre périmètre partenaire.",
            },
            {
              status: 403,
            }
          );
        }
      }

      const {
        data: createdAuth,
        error: createAuthError,
      } =
        await auth.admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,

          user_metadata: {
            full_name:
              fullName,
          },
        });

      if (
        createAuthError ||
        !createdAuth.user
      ) {
        throw (
          createAuthError ??
          new Error(
            "Utilisateur Auth non créé."
          )
        );
      }

      const {
        error: profileError,
      } =
        await auth.admin
          .from("profiles")
          .insert({
            id:
              createdAuth.user.id,

            full_name:
              fullName,

            role,

            company_id:
              companyId,

            partner_id:
              partnerId,
          });

      if (profileError) {
        await auth.admin.auth.admin.deleteUser(
          createdAuth.user.id
        );

        throw profileError;
      }

      return NextResponse.json({
        user: {
          id:
            createdAuth.user.id,
          email,
          full_name:
            fullName,
          role,
          company_id:
            companyId,
          partner_id:
            partnerId,
        },
      });
    }

    return NextResponse.json(
      {
        error:
          "Action inconnue.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "[Admin API POST]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur serveur.",
      },
      {
        status: 500,
      }
    );
  }
}