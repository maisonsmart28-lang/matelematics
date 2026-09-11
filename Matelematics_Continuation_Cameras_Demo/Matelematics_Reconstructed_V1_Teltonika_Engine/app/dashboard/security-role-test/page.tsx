"use client";

import { useEffect, useState } from "react";

import { supabase } from "../../components/supabase";

type Role =
  | "matelematics_admin"
  | "partner_admin"
  | "client_admin"
  | "user";

type TestResult = {
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
};

function isRole(value: unknown): value is Role {
  return (
    value === "matelematics_admin" ||
    value === "partner_admin" ||
    value === "client_admin" ||
    value === "user"
  );
}

async function getStatus(
  url: string,
  init?: RequestInit,
) {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });

  return response.status;
}

export default function SecurityRoleTestPage() {
  const [running, setRunning] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      setError("Cette page de test est disponible uniquement en developpement.");
    }
  }, []);

  async function runAudit() {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    setRunning(true);
    setError(null);
    setResults([]);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        throw new Error(
          "Aucune session Supabase active. Connectez-vous d'abord au dashboard.",
        );
      }

      const session = sessionData.session;
      const user = session.user;

      setEmail(user.email ?? null);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile || !isRole(profile.role)) {
        throw new Error(
          "Profil ou role invalide. Le test s'arrete en mode fail-closed.",
        );
      }

      const currentRole = profile.role;
      setRole(currentRole);

      const authorization = {
        Authorization: `Bearer ${session.access_token}`,
      };

      const nextResults: TestResult[] = [];

      const unauthenticatedVehicles = await getStatus("/api/vehicles");
      nextResults.push({
        name: "Vehicles sans token",
        expected: "401",
        actual: String(unauthenticatedVehicles),
        pass: unauthenticatedVehicles === 401,
      });

      const authenticatedReads = [
        ["Vehicles authentifie", "/api/vehicles"],
        ["Alerts authentifie", "/api/alerts"],
        ["Alert settings authentifie", "/api/alert-settings"],
        ["Diagnostics authentifie", "/api/diagnostics"],
      ] as const;

      for (const [name, url] of authenticatedReads) {
        const status = await getStatus(url, {
          headers: authorization,
        });

        nextResults.push({
          name,
          expected: "200",
          actual: String(status),
          pass: status === 200,
        });
      }

      const adminStatus = await getStatus("/api/admin", {
        headers: authorization,
      });

      const expectedAdminStatus = currentRole === "user" ? 403 : 200;
      nextResults.push({
        name: "API Administration",
        expected: String(expectedAdminStatus),
        actual: String(adminStatus),
        pass: adminStatus === expectedAdminStatus,
      });

      const diagnosticsMutationStatus = await getStatus(
        "/api/diagnostics",
        {
          method: "POST",
          headers: {
            ...authorization,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const expectedDiagnosticsMutationStatus =
        currentRole === "user" ? 403 : 400;

      nextResults.push({
        name: "Mutation Diagnostics invalide",
        expected: String(expectedDiagnosticsMutationStatus),
        actual: String(diagnosticsMutationStatus),
        pass:
          diagnosticsMutationStatus === expectedDiagnosticsMutationStatus,
      });

      setResults(nextResults);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Erreur inconnue pendant l'audit.",
      );
    } finally {
      setRunning(false);
    }
  }

  const passed = results.filter((item) => item.pass).length;
  const failed = results.length - passed;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h1 className="text-2xl font-semibold text-white">
          P0 / Etape 4 - Test comportemental des roles
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Page temporaire de validation locale. Aucun test ne realise une
          modification valide en base : la mutation Diagnostics envoie
          volontairement une requete invalide pour verifier uniquement la
          barriere d'autorisation.
        </p>

        <button
          type="button"
          onClick={runAudit}
          disabled={running || process.env.NODE_ENV !== "development"}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? "Test en cours..." : "Lancer le test du role connecte"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error}
        </div>
      )}

      {(role || email) && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200">
          <div>
            Compte : <strong>{email ?? "-"}</strong>
          </div>
          <div>
            Role detecte : <strong>{role ?? "-"}</strong>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div
            className={`rounded-xl border p-4 ${
              failed === 0
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/30 bg-red-500/10 text-red-200"
            }`}
          >
            {failed === 0
              ? `PASS - ${passed}/${results.length} controles valides`
              : `FAIL - ${failed} echec(s), ${passed}/${results.length} controles valides`}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-4 py-3">Controle</th>
                  <th className="px-4 py-3">Attendu</th>
                  <th className="px-4 py-3">Recu</th>
                  <th className="px-4 py-3">Resultat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/70 text-slate-200">
                {results.map((item) => (
                  <tr key={item.name}>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3">{item.expected}</td>
                    <td className="px-4 py-3">{item.actual}</td>
                    <td className="px-4 py-3">
                      {item.pass ? "PASS" : "FAIL"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
