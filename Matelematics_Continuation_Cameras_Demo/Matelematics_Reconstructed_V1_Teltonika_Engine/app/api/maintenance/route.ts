import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "matelematics_admin" | "partner_admin" | "client_admin" | "user";
type Profile = { id: string; role: Role; company_id: string | null; partner_id: string | null };

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function getAdmin() {
  if (!supabaseUrl || !secretKey) throw new Error("Configuration Supabase serveur absente.");
  return createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
function isRole(v: unknown): v is Role { return v === "matelematics_admin" || v === "partner_admin" || v === "client_admin" || v === "user"; }
function canManage(p: Profile) { return p.role === "matelematics_admin" || p.role === "partner_admin" || p.role === "client_admin"; }
async function authenticate(request: NextRequest) {
  const h = request.headers.get("authorization"), token = h?.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) throw new Error("AUTH_REQUIRED");
  const admin = getAdmin();
  const { data: u, error: ue } = await admin.auth.getUser(token);
  if (ue || !u.user) throw new Error("AUTH_REQUIRED");
  const { data: p, error: pe } = await admin.from("profiles").select("id,role,company_id,partner_id").eq("id", u.user.id).single();
  if (pe || !p) throw new Error("PROFILE_REQUIRED");
  if (!isRole(p.role)) throw new Error("FORBIDDEN");
  return { admin, profile: p as Profile };
}
async function allowedCompanyIds(admin: ReturnType<typeof getAdmin>, p: Profile): Promise<string[] | null> {
  if (p.role === "matelematics_admin") return null;
  if (p.role === "client_admin" || p.role === "user") return p.company_id ? [p.company_id] : [];
  if (!p.partner_id) return [];
  const { data, error } = await admin.from("companies").select("id").eq("partner_id", p.partner_id);
  if (error) throw error;
  return (data ?? []).map((c) => c.id);
}
function caught(error: unknown) {
  console.error("[Maintenance API GET]", error);
  const m = error instanceof Error ? error.message : "Erreur serveur.";
  if (m === "AUTH_REQUIRED") return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (m === "PROFILE_REQUIRED" || m === "FORBIDDEN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  return NextResponse.json({ error: m }, { status: 500 });
}

export async function GET(request: NextRequest) {
  try {
    const { admin, profile } = await authenticate(request);
    const ids = await allowedCompanyIds(admin, profile);
    const manageable = canManage(profile);
    if (ids !== null && ids.length === 0) return NextResponse.json({ maintenance: [], documents: [], vehicles: [], canCreate: manageable, canUpdate: manageable, canDelete: manageable });

    let vq = admin.from("vehicles").select("id,company_id,name,registration,status").order("name");
    let mq = admin.from("vehicle_maintenance_records").select("*").order("created_at", { ascending: false });
    let dq = admin.from("vehicle_compliance_documents").select("*").order("expires_on", { ascending: true });
    if (ids !== null) { vq = vq.in("company_id", ids); mq = mq.in("company_id", ids); dq = dq.in("company_id", ids); }
    const [{ data: vehicles, error: ve }, { data: maintenance, error: me }, { data: documents, error: de }] = await Promise.all([vq, mq, dq]);
    if (ve) throw ve; if (me) throw me; if (de) throw de;
    const vehicleMap = new Map((vehicles ?? []).map((v) => [v.id, v]));
    const attachVehicle = <T extends { vehicle_id: string }>(row: T) => ({ ...row, vehicle: vehicleMap.get(row.vehicle_id) ?? null });
    return NextResponse.json({
      maintenance: (maintenance ?? []).map(attachVehicle),
      documents: (documents ?? []).map(attachVehicle),
      vehicles: vehicles ?? [],
      canCreate: manageable,
      canUpdate: manageable,
      canDelete: manageable,
    });
  } catch (e) { return caught(e); }
}
