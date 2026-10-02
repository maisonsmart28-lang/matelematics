import { AsyncLocalStorage } from "node:async_hooks";
import type { TransactionClient } from "./ingest-transaction";
const scope = new AsyncLocalStorage<TransactionClient>();
export function withAlertTransaction<T>(client: TransactionClient, work: () => Promise<T>): Promise<T> {
  return scope.run(client, work);
}
export function currentAlertTransaction() { return scope.getStore(); }
type Result = { rows: Record<string, unknown>[]; rowCount: number | null };
async function rows(client: TransactionClient, sql: string, values: unknown[]) {
  return (await client.query(sql, values) as Result).rows;
}
export async function transactionAlertSettings(client: TransactionClient, companyId: string, vehicleId: string) {
  return { data: await rows(client,
    "SELECT company_id,vehicle_id,rule_key,enabled,threshold_value,threshold_secondary,severity FROM public.alert_settings WHERE company_id=$1 AND (vehicle_id IS NULL OR vehicle_id=$2) ORDER BY vehicle_id NULLS FIRST,rule_key",
    [companyId,vehicleId]), error: null };
}
export async function transactionLatestAlert(client: TransactionClient, companyId: string, vehicleId: string, alertType: string) {
  const data = await rows(client,
    "SELECT id,alert_type,status,triggered_at::text,resolved_at::text FROM public.alerts WHERE company_id=$1 AND vehicle_id=$2 AND alert_type=$3 AND status IN ('active','resolved') ORDER BY triggered_at DESC,id DESC LIMIT 1",
    [companyId,vehicleId,alertType]);
  return { data: data[0] ?? null, error: null };
}
export async function transactionActiveDiagnostics(client: TransactionClient, companyId: string, vehicleId: string) {
  return { data: await rows(client,
    "SELECT id,alert_type,status,triggered_at::text,resolved_at::text FROM public.alerts WHERE company_id=$1 AND vehicle_id=$2 AND status='active' AND starts_with(alert_type,'diagnostic_dtc_')",
    [companyId,vehicleId]), error: null };
}
export async function transactionInsertAlert(client: TransactionClient, row: Record<string, unknown>) {
  const keys = ["company_id","vehicle_id","device_id","alert_type","severity","title","message","latitude","longitude","triggered_at","status","metadata"];
  await client.query(
    "INSERT INTO public.alerts(company_id,vehicle_id,device_id,alert_type,severity,title,message,latitude,longitude,triggered_at,status,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)",
    keys.map(k => k === "metadata" ? JSON.stringify(row[k]) : row[k]));
  return { error: null };
}
export async function transactionResolveAlert(client: TransactionClient, alertId: string, recordedAt: string) {
  await client.query("UPDATE public.alerts SET status='resolved',resolved_at=$2 WHERE id=$1 AND status='active'", [alertId,recordedAt]);
  return { error: null };
}
