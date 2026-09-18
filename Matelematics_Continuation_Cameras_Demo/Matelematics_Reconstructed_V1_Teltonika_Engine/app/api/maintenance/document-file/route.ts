import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "matelematics_admin" | "partner_admin" | "client_admin" | "user";
type Profile = { id:string; role:Role; company_id:string|null; partner_id:string|null };
type ComplianceDocument = { id:string; company_id:string; status:string; storage_path:string|null };

const BUCKET = "compliance-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ["application/pdf","pdf"],
  ["image/jpeg","jpg"],
  ["image/png","png"],
  ["image/webp","webp"],
]);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function adminClient(){
  if(!supabaseUrl || !secretKey) throw new Error("Configuration Supabase serveur absente.");
  return createClient(supabaseUrl,secretKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
function scopedClient(token:string){
  if(!supabaseUrl || !publishableKey) throw new Error("Configuration Supabase publique absente.");
  return createClient(supabaseUrl,publishableKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
function isRole(v:unknown):v is Role{return v==="matelematics_admin"||v==="partner_admin"||v==="client_admin"||v==="user"}
async function authenticate(request:NextRequest){
  const h=request.headers.get("authorization"),token=h?.startsWith("Bearer ")?h.slice(7):null;
  if(!token) throw new Error("AUTH_REQUIRED");
  const admin=adminClient(),{data:u,error:ue}=await admin.auth.getUser(token);
  if(ue||!u.user) throw new Error("AUTH_REQUIRED");
  const{data:p,error:pe}=await admin.from("profiles").select("id,role,company_id,partner_id").eq("id",u.user.id).single();
  if(pe||!p||!isRole(p.role)) throw new Error("FORBIDDEN");
  return {profile:p as Profile,token};
}
function responseError(e:unknown){
  const m=e instanceof Error?e.message:"Erreur serveur.";
  if(m==="AUTH_REQUIRED")return NextResponse.json({error:"Authentification requise."},{status:401});
  if(m==="FORBIDDEN")return NextResponse.json({error:"Accès refusé."},{status:403});
  console.error("[Compliance attachment API]",e);
  return NextResponse.json({error:m},{status:500});
}
async function getDocument(sc:ReturnType<typeof scopedClient>,id:string){
  const{data,error}=await sc.from("vehicle_compliance_documents").select("id,company_id,status,storage_path").eq("id",id).maybeSingle();
  if(error)throw error;
  return data as ComplianceDocument|null;
}
function safeName(name:string){
  const base=name.replace(/\.[^.]+$/,"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Za-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60);
  return base||"document";
}

export async function GET(request:NextRequest){
  try{
    const{token}=await authenticate(request),id=request.nextUrl.searchParams.get("documentId")?.trim()??"";
    if(!id)return NextResponse.json({error:"Le document est obligatoire."},{status:400});
    const sc=scopedClient(token),doc=await getDocument(sc,id);
    if(!doc)return NextResponse.json({error:"Ressource inaccessible dans votre périmètre."},{status:403});
    if(!doc.storage_path)return NextResponse.json({error:"Aucune pièce jointe pour ce document."},{status:404});
    const{data,error}=await sc.storage.from(BUCKET).createSignedUrl(doc.storage_path,60);
    if(error)throw error;
    return NextResponse.json({url:data.signedUrl,expiresIn:60});
  }catch(e){return responseError(e)}
}

export async function POST(request:NextRequest){
  try{
    const{profile,token}=await authenticate(request);
    if(profile.role==="user")return NextResponse.json({error:"Ajout de pièce jointe interdit pour ce rôle."},{status:403});
    const form=await request.formData(),id=String(form.get("documentId")??"").trim(),value=form.get("file");
    if(!id)return NextResponse.json({error:"Le document est obligatoire."},{status:400});
    if(!(value instanceof File))return NextResponse.json({error:"Le fichier est obligatoire."},{status:400});
    if(value.size<=0||value.size>MAX_BYTES)return NextResponse.json({error:"Le fichier doit faire au maximum 10 Mo."},{status:400});
    const ext=ALLOWED.get(value.type);
    if(!ext)return NextResponse.json({error:"Format autorisé : PDF, JPG, PNG ou WEBP."},{status:400});
    const sc=scopedClient(token),doc=await getDocument(sc,id);
    if(!doc)return NextResponse.json({error:"Ressource inaccessible dans votre périmètre."},{status:403});
    if(doc.status!=="active")return NextResponse.json({error:"Une pièce jointe ne peut être modifiée que sur un document actif."},{status:409});
    const path=`${doc.company_id}/${doc.id}/${crypto.randomUUID()}-${safeName(value.name)}.${ext}`;
    const bytes=await value.arrayBuffer();
    const{error:uploadError}=await sc.storage.from(BUCKET).upload(path,bytes,{contentType:value.type,upsert:false});
    if(uploadError)throw uploadError;
    const{error:rpcError}=await sc.rpc("set_vehicle_compliance_document_storage_path",{p_document_id:id,p_storage_path:path});
    if(rpcError){
      await sc.storage.from(BUCKET).remove([path]);
      const detail=`${rpcError.message} ${rpcError.details??""}`;
      if(detail.includes("DOCUMENT_NOT_FOUND")||detail.includes("FORBIDDEN"))return NextResponse.json({error:"Ressource inaccessible dans votre périmètre."},{status:403});
      if(detail.includes("INVALID_STATUS"))return NextResponse.json({error:"Une pièce jointe ne peut être modifiée que sur un document actif."},{status:409});
      throw rpcError;
    }
    if(doc.storage_path&&doc.storage_path!==path){
      const{error:removeOld}=await sc.storage.from(BUCKET).remove([doc.storage_path]);
      if(removeOld)console.error("[Compliance attachment API] ancien fichier non supprimé",removeOld);
    }
    return NextResponse.json({storagePath:path},{status:201});
  }catch(e){return responseError(e)}
}

export async function DELETE(request:NextRequest){
  try{
    const{profile,token}=await authenticate(request);
    if(profile.role==="user")return NextResponse.json({error:"Suppression de pièce jointe interdite pour ce rôle."},{status:403});
    const id=request.nextUrl.searchParams.get("documentId")?.trim()??"";
    if(!id)return NextResponse.json({error:"Le document est obligatoire."},{status:400});
    const sc=scopedClient(token),doc=await getDocument(sc,id);
    if(!doc)return NextResponse.json({error:"Ressource inaccessible dans votre périmètre."},{status:403});
    if(doc.status!=="active")return NextResponse.json({error:"La pièce jointe d’un document historique est conservée."},{status:409});
    if(!doc.storage_path)return NextResponse.json({ok:true});
    const oldPath=doc.storage_path;
    const{error:rpcError}=await sc.rpc("set_vehicle_compliance_document_storage_path",{p_document_id:id,p_storage_path:null});
    if(rpcError)throw rpcError;
    const{error:removeError}=await sc.storage.from(BUCKET).remove([oldPath]);
    if(removeError){
      const{error:restoreError}=await sc.rpc("set_vehicle_compliance_document_storage_path",{p_document_id:id,p_storage_path:oldPath});
      if(restoreError)console.error("[Compliance attachment API] restauration storage_path impossible",restoreError);
      throw removeError;
    }
    return NextResponse.json({ok:true});
  }catch(e){return responseError(e)}
}
