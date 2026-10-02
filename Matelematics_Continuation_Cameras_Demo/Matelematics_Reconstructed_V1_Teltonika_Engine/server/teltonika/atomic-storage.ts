import { withIngestTransaction, type TransactionClient, type TransactionPool } from "./ingest-transaction";
export type AtomicPacket = {
  imei: string; fingerprint: string; recordedAt: string;
  position: Record<string, unknown> | null;
  telemetry: Record<string, unknown>;
};
type Device = { id: string; company_id: string; vehicle_id: string | null };
type Rows<T> = { rows: T[] };
async function select<T>(client: TransactionClient, sql: string, values: unknown[] = []) {
  return (await client.query(sql, values) as Rows<T>).rows;
}
export async function persistAtomicPacket(pool: TransactionPool, packet: AtomicPacket,
  alerts: (client: TransactionClient, device: Device & { vehicle_id: string }) => Promise<void>) {
  if (!/^[0-9]{10,20}$/.test(packet.imei) || !/^[0-9a-f]{64}$/.test(packet.fingerprint)) throw Error("INVALID_INGEST_IDENTITY");
  return withIngestTransaction(pool, async client => {
    const indexes = await select<{ ready: boolean }>(client,
      "SELECT EXISTS(SELECT 1 FROM pg_index i WHERE i.indexrelid=to_regclass('public.telemetry_teltonika_fingerprint_unique') AND i.indrelid='public.telemetry'::regclass AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=3 AND pg_get_indexdef(i.indexrelid,1,true)='company_id' AND pg_get_indexdef(i.indexrelid,2,true)='device_id' AND pg_get_indexdef(i.indexrelid,3,true)=$1 AND pg_get_expr(i.indpred,i.indrelid)=$2) AS ready",
      ["(metadata ->> 'ingest_fingerprint'::text)", "((source = 'teltonika'::text) AND (device_id IS NOT NULL) AND (metadata ? 'ingest_fingerprint'::text))"]);
    if (!indexes[0]?.ready) throw Error("ATOMIC_INGEST_INDEX_NOT_READY");
    const devices = await select<Device>(client, "SELECT id,company_id,vehicle_id FROM public.devices WHERE imei=$1 FOR UPDATE", [packet.imei]);
    const device = devices[0];
    if (!device?.vehicle_id) throw Error("INGEST_DEVICE_UNASSIGNED");
    const vehicleId = device.vehicle_id;
    const vehicles = await select<{ id: string }>(client, "SELECT id FROM public.vehicles WHERE id=$1 AND company_id=$2 FOR UPDATE", [vehicleId,device.company_id]);
    if (!vehicles.length) throw Error("INGEST_TENANT_MISMATCH");
    const previous = await select<{ metadata: Record<string, unknown> }>(client,
      "SELECT metadata FROM public.telemetry WHERE company_id=$1 AND device_id=$2 AND source='teltonika' AND metadata->>'ingest_fingerprint'=$3 LIMIT 1",
      [device.company_id,device.id,packet.fingerprint]);
    if (previous.length && previous[0].metadata.atomic_ingest_version !== "native-v1") throw Error("LEGACY_INGEST_RECONCILIATION_REQUIRED");
    if (!previous.length) {
      const p = packet.position;
      if (p) await client.query("INSERT INTO public.positions(company_id,vehicle_id,device_id,recorded_at,latitude,longitude,altitude,speed,heading) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [device.company_id,vehicleId,device.id,packet.recordedAt,p.latitude,p.longitude,p.altitude,p.speed,p.heading]);
      const t = packet.telemetry;
      await client.query("INSERT INTO public.telemetry(company_id,vehicle_id,device_id,recorded_at,source,codec,raw_payload,io_values,can_payload,metadata,signal_strength,battery_voltage,ignition) VALUES($1,$2,$3,$4,'teltonika',$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12)",
        [device.company_id,vehicleId,device.id,packet.recordedAt,t.codec,t.raw_payload,JSON.stringify(t.io_values),JSON.stringify(t.can_payload),
          JSON.stringify({ ...(t.metadata as Record<string, unknown>), ingest_fingerprint: packet.fingerprint, atomic_ingest_version: "native-v1" }),t.signal_strength,t.battery_voltage,t.ignition]);
      await alerts(client, { ...device, vehicle_id: vehicleId });
    }
    await client.query("UPDATE public.devices SET status='online',last_seen_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1", [device.id]);
    return { deviceId:device.id,companyId:device.company_id,vehicleId,recordedAt:packet.recordedAt,duplicate:previous.length>0,positionPersisted:!previous.length&&packet.position!==null };
  });
}
