import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "matelematics_admin" | "partner_admin" | "client_admin" | "user";
type Profile = { id: string; role: Role; company_id: string | null; partner_id: string | null };

function isRole(value: unknown): value is Role {
  return value === "matelematics_admin" || value === "partner_admin" || value === "client_admin" || value === "user";
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getAdmin() {
  if (!supabaseUrl || !secretKey) throw new Error("Configuration Supabase serveur absente.");
  return createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) throw new Error("AUTH_REQUIRED");

  const admin = getAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) throw new Error("AUTH_REQUIRED");

  const { data: profile, error: profileError } = await admin
    .from("profiles").select("id,role,company_id,partner_id").eq("id", userData.user.id).single();
  if (profileError || !profile) throw new Error("PROFILE_REQUIRED");
  if (!isRole(profile.role)) throw new Error("FORBIDDEN");
  return { admin, profile: profile as Profile, token };
}

async function allowedCompanyIds(admin: ReturnType<typeof getAdmin>, profile: Profile): Promise<string[] | null> {
  if (profile.role === "matelematics_admin") return null;
  if (profile.role === "client_admin" || profile.role === "user") return profile.company_id ? [profile.company_id] : [];
  if (!profile.partner_id) return [];
  const { data, error } = await admin.from("companies").select("id").eq("partner_id", profile.partner_id);
  if (error) throw error;
  return (data ?? []).map((company) => company.id);
}

function canManage(profile: Profile) {
  return profile.role === "matelematics_admin" || profile.role === "partner_admin" || profile.role === "client_admin";
}

async function getAvailableVehicles(admin: ReturnType<typeof getAdmin>, companyIds: string[] | null) {
  let vehicleQuery = admin.from("vehicles").select("id,company_id,name,registration,status").neq("status", "inactive").order("name");
  if (companyIds !== null) vehicleQuery = vehicleQuery.in("company_id", companyIds);
  const { data: vehicles, error: vehicleError } = await vehicleQuery;
  if (vehicleError) throw vehicleError;
  if (!vehicles?.length) return [];

  const vehicleIds = vehicles.map((vehicle) => vehicle.id);
  const { data: assignments, error: assignmentError } = await admin
    .from("vehicle_driver_assignments").select("vehicle_id").in("vehicle_id", vehicleIds).eq("status", "active").is("unassigned_at", null);
  if (assignmentError) throw assignmentError;
  const assigned = new Set((assignments ?? []).map((row) => row.vehicle_id));

  const companyIdSet = Array.from(new Set(vehicles.map((vehicle) => vehicle.company_id)));
  const { data: companies, error: companyError } = await admin.from("companies").select("id,name").in("id", companyIdSet);
  if (companyError) throw companyError;
  const companyById = new Map((companies ?? []).map((company) => [company.id, company.name]));

  return vehicles.filter((vehicle) => !assigned.has(vehicle.id)).map((vehicle) => ({
    id: vehicle.id,
    companyId: vehicle.company_id,
    companyName: companyById.get(vehicle.company_id) ?? "Client",
    name: vehicle.name,
    registration: vehicle.registration,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { admin, profile } = await authenticate(request);
    const companyIds = await allowedCompanyIds(admin, profile);
    const manageable = canManage(profile);
    const availableVehicles = manageable ? await getAvailableVehicles(admin, companyIds) : [];

    if (companyIds !== null && companyIds.length === 0) {
      return NextResponse.json({ drivers: [], canCreate: manageable, availableVehicles });
    }

    let driverQuery = admin.from("drivers")
      .select("id,company_id,full_name,license_number,phone,status,created_at,updated_at")
      .order("full_name", { ascending: true });
    if (companyIds !== null) driverQuery = driverQuery.in("company_id", companyIds);
    const { data: drivers, error: driverError } = await driverQuery;
    if (driverError) throw driverError;

    const driverRows = drivers ?? [];
    if (!driverRows.length) return NextResponse.json({ drivers: [], canCreate: manageable, availableVehicles });

    const driverIds = driverRows.map((driver) => driver.id);
    const companyIdSet = Array.from(new Set(driverRows.map((driver) => driver.company_id)));
    const [{ data: assignments, error: assignmentError }, { data: companies, error: companyError }] = await Promise.all([
      admin.from("vehicle_driver_assignments").select("id,company_id,vehicle_id,driver_id,assigned_at,status").in("driver_id", driverIds).eq("status", "active").is("unassigned_at", null),
      admin.from("companies").select("id,name").in("id", companyIdSet),
    ]);
    if (assignmentError) throw assignmentError;
    if (companyError) throw companyError;

    const activeAssignments = assignments ?? [];
    const vehicleIds = Array.from(new Set(activeAssignments.map((assignment) => assignment.vehicle_id)));
    const { data: vehicles, error: vehicleError } = vehicleIds.length
      ? await admin.from("vehicles").select("id,name,registration,status").in("id", vehicleIds)
      : { data: [], error: null };
    if (vehicleError) throw vehicleError;

    const assignmentByDriver = new Map(activeAssignments.map((assignment) => [assignment.driver_id, assignment]));
    const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));
    const companyById = new Map((companies ?? []).map((company) => [company.id, company.name]));

    const result = driverRows.map((driver) => {
      const assignment = assignmentByDriver.get(driver.id) ?? null;
      const vehicle = assignment ? vehicleById.get(assignment.vehicle_id) ?? null : null;
      return {
        id: driver.id, companyId: driver.company_id, companyName: companyById.get(driver.company_id) ?? "Client",
        fullName: driver.full_name, licenseNumber: driver.license_number, phone: driver.phone, status: driver.status,
        createdAt: driver.created_at, updatedAt: driver.updated_at,
        activeAssignment: assignment ? { id: assignment.id, assignedAt: assignment.assigned_at, vehicle: vehicle ? { id: vehicle.id, name: vehicle.name, registration: vehicle.registration, status: vehicle.status } : null } : null,
      };
    });
    return NextResponse.json({ drivers: result, canCreate: manageable, availableVehicles });
  } catch (error) {
    console.error("[Drivers API]", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    if (message === "AUTH_REQUIRED") return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    if (message === "PROFILE_REQUIRED" || message === "FORBIDDEN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profile, token } = await authenticate(request);
    if (!canManage(profile)) return NextResponse.json({ error: "Modification interdite pour ce rôle." }, { status: 403 });
    if (!supabaseUrl || !publishableKey) throw new Error("Configuration Supabase publique absente.");

    const body = (await request.json()) as { fullName?: unknown; licenseNumber?: unknown; phone?: unknown; vehicleId?: unknown; companyId?: unknown };
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const vehicleId = typeof body.vehicleId === "string" ? body.vehicleId : "";
    const companyId = typeof body.companyId === "string" ? body.companyId : "";
    const licenseNumber = typeof body.licenseNumber === "string" ? body.licenseNumber.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!fullName) return NextResponse.json({ error: "Le nom du conducteur est obligatoire." }, { status: 400 });
    if (!vehicleId || !companyId) return NextResponse.json({ error: "La sélection d’un véhicule est obligatoire." }, { status: 400 });

    const scoped = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await scoped.rpc("create_driver_with_assignment", {
      p_company_id: companyId,
      p_vehicle_id: vehicleId,
      p_full_name: fullName,
      p_license_number: licenseNumber || null,
      p_phone: phone || null,
    });
    if (error) {
      const detail = `${error.message} ${error.details ?? ""}`;
      if (detail.includes("VEHICLE_ALREADY_ASSIGNED")) return NextResponse.json({ error: "Ce véhicule possède déjà un conducteur actif." }, { status: 409 });
      if (detail.includes("VEHICLE_NOT_ACCESSIBLE") || detail.includes("FORBIDDEN")) return NextResponse.json({ error: "Ce véhicule n’est pas accessible dans votre périmètre." }, { status: 403 });
      throw error;
    }
    return NextResponse.json({ driverId: data }, { status: 201 });
  } catch (error) {
    console.error("[Drivers API POST]", error);
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    if (message === "AUTH_REQUIRED") return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    if (message === "PROFILE_REQUIRED" || message === "FORBIDDEN") return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
