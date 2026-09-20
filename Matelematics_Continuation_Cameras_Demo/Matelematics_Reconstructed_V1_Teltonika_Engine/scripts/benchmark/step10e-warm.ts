import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { loadEnvFile } from "node:process";

if (existsSync(".env.local")) loadEnvFile(".env.local");
else if (existsSync(".env")) loadEnvFile(".env");

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase benchmark environment variables.");

const supabase = createClient(url, key, { auth: { persistSession: false } });
const PAGE = 1000;
const MAX_ROWS = Math.max(1000, Number(process.env.WARM_SAMPLE_ROWS ?? 20000));
type Row = Record<string, unknown>;

async function fetchPaged(table: string, columns: string, orderColumn: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const to = Math.min(from + PAGE - 1, MAX_ROWS - 1);
    const { data, error } = await supabase.from(table).select(columns).order(orderColumn,{ascending:true}).range(from,to);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows=(data??[]) as Row[]; out.push(...rows);
    if (rows.length < to-from+1) break;
  }
  return out;
}
function firstNumber(row:Row,keys:string[]):number|null { for(const k of keys){const v=row[k];if(typeof v==="number"&&Number.isFinite(v))return v;if(typeof v==="string"&&v.trim()!==""&&Number.isFinite(Number(v)))return Number(v);}return null;}
function firstString(row:Row,keys:string[]):string|null {for(const k of keys){const v=row[k];if(typeof v==="string"&&v)return v;}return null;}
function ts(row:Row):number|null {const v=firstString(row,["recorded_at","created_at","timestamp"]);if(!v)return null;const n=Date.parse(v);return Number.isFinite(n)?n:null;}
function vehicle(row:Row):string|null{return firstString(row,["vehicle_id"]);}
function compact(row:Row):Row{return Object.fromEntries(Object.entries(row).filter(([,v])=>v!==null&&v!==undefined));}
function jsonlBytes(rows:unknown[]):number{return rows.length?Buffer.byteLength(rows.map(r=>JSON.stringify(r)).join("\n")+"\n"):0;}
function bucketIso(ms:number,bucketMs:number):string{return new Date(Math.floor(ms/bucketMs)*bucketMs).toISOString();}
function gzipBytes(parts:unknown[][]){const text=parts.flat().map(r=>JSON.stringify(r)).join("\n")+"\n";return {raw:Buffer.byteLength(text),gzip:gzipSync(Buffer.from(text),{level:6}).byteLength};}

type Agg={company_id:unknown;vehicle_id:string;bucket:string;count:number;first:number;last:number;speedSum:number;speedCount:number;minSpeed:number|null;maxSpeed:number|null;alerts:number};
function aggregate(rows:Row[],bucketMs:number):Map<string,Agg>{
 const map=new Map<string,Agg>();
 for(const row of rows){const v=vehicle(row),time=ts(row);if(!v||time===null)continue;const bucket=bucketIso(time,bucketMs),k=`${v}|${bucket}`;let a=map.get(k);
 if(!a){a={company_id:row.company_id,vehicle_id:v,bucket,count:0,first:time,last:time,speedSum:0,speedCount:0,minSpeed:null,maxSpeed:null,alerts:0};map.set(k,a);}
 a.count++;a.first=Math.min(a.first,time);a.last=Math.max(a.last,time);const speed=firstNumber(row,["speed","speed_kph","speed_kmh"]);
 if(speed!==null){a.speedSum+=speed;a.speedCount++;a.minSpeed=a.minSpeed===null?speed:Math.min(a.minSpeed,speed);a.maxSpeed=a.maxSpeed===null?speed:Math.max(a.maxSpeed,speed);}}
 return map;
}
function aggRows(map:Map<string,Agg>):Row[]{return [...map.values()].map(a=>compact({company_id:a.company_id,vehicle_id:a.vehicle_id,bucket:a.bucket,first_at:new Date(a.first).toISOString(),last_at:new Date(a.last).toISOString(),point_count:a.count,min_speed:a.minSpeed,max_speed:a.maxSpeed,avg_speed:a.speedCount?Math.round(a.speedSum/a.speedCount*100)/100:null,alert_count:a.alerts}));}

async function main():Promise<void>{
 console.log(JSON.stringify({event:"warm-benchmark-start",maxRowsPerSource:MAX_ROWS,readOnly:true}));
 const [telemetry,positions,alerts]=await Promise.all([fetchPaged("telemetry","*","recorded_at"),fetchPaged("positions","*","recorded_at"),fetchPaged("alerts","*","created_at")]);
 const allTimed=[...telemetry,...positions,...alerts].map(ts).filter((v):v is number=>v!==null);
 const startMs=allTimed.length?Math.min(...allTimed):null,endMs=allTimed.length?Math.max(...allTimed):null;
 const vehicleIds=new Set([...telemetry,...positions,...alerts].map(vehicle).filter((v):v is string=>Boolean(v)));
 const lastRoute=new Map<string,number>(),routePoints:Row[]=[];
 for(const row of positions){const v=vehicle(row),time=ts(row);if(!v||time===null)continue;const speed=firstNumber(row,["speed","speed_kph","speed_kmh"]),interval=speed!==null&&speed>3?30000:300000,prev=lastRoute.get(v);if(prev!==undefined&&time-prev<interval)continue;lastRoute.set(v,time);routePoints.push(compact({company_id:row.company_id,vehicle_id:v,recorded_at:new Date(time).toISOString(),latitude:firstNumber(row,["latitude","lat"]),longitude:firstNumber(row,["longitude","lng","lon"]),speed,heading:firstNumber(row,["heading","course"])}));}
 const hourlyMap=aggregate(positions.length?positions:telemetry,3600000),dailyMap=aggregate(positions.length?positions:telemetry,86400000);
 for(const row of alerts){const v=vehicle(row),time=ts(row);if(!v||time===null)continue;for(const [map,bucketMs] of [[hourlyMap,3600000],[dailyMap,86400000]] as const){const a=map.get(`${v}|${bucketIso(time,bucketMs)}`);if(a)a.alerts++;}}
 const hourly=aggRows(hourlyMap),daily=aggRows(dailyMap);
 const importantEvents:Row[]=alerts.map(r=>compact({company_id:r.company_id,vehicle_id:r.vehicle_id,occurred_at:firstString(r,["occurred_at","recorded_at","created_at"]),type:firstString(r,["type","alert_type","event_type","rule_key"]),severity:r.severity,status:r.status}));
 for(const r of telemetry){const hasDiagnostic=["dtc","dtcs","diagnostics","diagnostic","fault_codes"].some(k=>{const v=r[k];return v!==null&&v!==undefined&&v!==""&&(!Array.isArray(v)||v.length>0)&&(typeof v!=="object"||Array.isArray(v)||Object.keys(v as object).length>0);});if(hasDiagnostic)importantEvents.push(compact({company_id:r.company_id,vehicle_id:r.vehicle_id,occurred_at:firstString(r,["recorded_at","created_at"]),type:"diagnostic",dtc:r.dtc??r.dtcs??r.diagnostics??r.diagnostic??r.fault_codes}));}
 const components={route:{rows:routePoints.length,bytes:jsonlBytes(routePoints)},hourly:{rows:hourly.length,bytes:jsonlBytes(hourly)},daily:{rows:daily.length,bytes:jsonlBytes(daily)},importantEvents:{rows:importantEvents.length,bytes:jsonlBytes(importantEvents)},trips:{status:"NOT_MEASURED_BY_THIS_BENCHMARK"}};
 const packed=gzipBytes([routePoints,hourly,daily,importantEvents]),spanDays=startMs!==null&&endMs!==null?Math.max((endMs-startMs)/86400000,1/24):null,activeVehicleDays=spanDays&&vehicleIds.size?spanDays*vehicleIds.size:null,gzipBytesPerActiveVehicleDay=activeVehicleDays?packed.gzip/activeVehicleDays:null,projectedMonth=gzipBytesPerActiveVehicleDay?gzipBytesPerActiveVehicleDay*30:null,projectedYear=projectedMonth?projectedMonth*12:null;
 console.log(JSON.stringify({event:"warm-benchmark",readOnly:true,source:{telemetryRows:telemetry.length,positionRows:positions.length,alertRows:alerts.length,distinctVehicles:vehicleIds.size,startAt:startMs===null?null:new Date(startMs).toISOString(),endAt:endMs===null?null:new Date(endMs).toISOString(),observedSpanDays:spanDays===null?null:Math.round(spanDays*100)/100},components,total:{rawBytes:packed.raw,gzipBytes:packed.gzip,compressionRatio:packed.gzip?Math.round(packed.raw/packed.gzip*100)/100:null},unit:{gzipBytesPerActiveVehicleDay:gzipBytesPerActiveVehicleDay===null?null:Math.round(gzipBytesPerActiveVehicleDay),projectedMBPerVehicleMonth:projectedMonth===null?null:Math.round(projectedMonth/1e6*100)/100,projectedMBPerVehicle12Months:projectedYear===null?null:Math.round(projectedYear/1e6*100)/100},limitations:["Trips are not synthesized in this benchmark.","Maintenance/compliance frequency is not measurable from current zero-row test populations.","Projection is credible only if observed vehicle/time coverage is representative."]}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
