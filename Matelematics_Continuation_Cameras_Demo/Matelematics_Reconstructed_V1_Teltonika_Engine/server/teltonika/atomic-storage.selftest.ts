import assert from "node:assert/strict";
import { persistAtomicPacket, type AtomicPacket } from "./atomic-storage";
import { CommitOutcomeUnknown, type TransactionClient } from "./ingest-transaction";
const packet: AtomicPacket={imei:"990000000000001",fingerprint:"a".repeat(64),recordedAt:"2026-10-02T00:00:00Z",position:{latitude:0,longitude:0},telemetry:{codec:"8E",io_values:{},can_payload:{},metadata:{},signal_strength:3}};
async function run(options: {duplicate?: string; failure?: string; ready?: boolean}={}) {
 const calls:string[]=[];let alertCalls=0,released=false,destroyed=false;
 const client:TransactionClient={async query(sql) {
  calls.push(sql);
  if(options.failure&&(options.failure==="COMMIT" ? sql==="COMMIT" : sql.includes(options.failure)))throw Error("injected");
  if(sql.includes("AS ready"))return {rows:[{ready:options.ready!==false}]};
  if(sql.startsWith("SELECT id,company_id"))return {rows:[{id:"device",company_id:"company",vehicle_id:"vehicle"}]};
  if(sql.startsWith("SELECT id FROM public.vehicles"))return {rows:[{id:"vehicle"}]};
  if(sql.startsWith("SELECT metadata"))return {rows:options.duplicate?[{metadata:{atomic_ingest_version:options.duplicate}}]:[]};
  return {rows:[],rowCount:1};
 },release(destroy){released=true;destroyed=destroy===true;}};
 let result,error;
 try {result=await persistAtomicPacket({async connect(){return client;}},packet,async tx=>{
  assert.equal(tx,client);alertCalls++;await tx.query("ALERT_MUTATION");
 });}catch(e){error=e;}
 assert.equal(released,true);return {calls,alertCalls,result,error,destroyed};
}
async function main(){
 const success=await run();assert.equal(success.result?.duplicate,false);assert.equal(success.alertCalls,1);assert.equal(success.calls.at(-1),"COMMIT");
 assert.ok(success.calls.findIndex(s=>s.includes("FROM public.vehicles"))<success.calls.findIndex(s=>s.startsWith("INSERT")));
 const duplicate=await run({duplicate:"native-v1"});assert.equal(duplicate.result?.duplicate,true);assert.equal(duplicate.alertCalls,0);assert.equal(duplicate.calls.some(s=>s.startsWith("INSERT")),false);
 const legacy=await run({duplicate:"lab-v1"});assert.equal((legacy.error as Error).message,"LEGACY_INGEST_RECONCILIATION_REQUIRED");assert.equal(legacy.calls.at(-1),"ROLLBACK");
 const missing=await run({ready:false});assert.equal((missing.error as Error).message,"ATOMIC_INGEST_INDEX_NOT_READY");assert.equal(missing.calls.some(s=>s.startsWith("INSERT")),false);
 for(const failure of ["INSERT INTO public.positions","INSERT INTO public.telemetry","ALERT_MUTATION","UPDATE public.devices"]) {
  const r=await run({failure});assert.equal(r.calls.at(-1),"ROLLBACK");assert.equal(r.calls.includes("COMMIT"),false);
 }
 const uncertain=await run({failure:"COMMIT"});assert.ok(uncertain.error instanceof CommitOutcomeUnknown);assert.equal(uncertain.destroyed,true);
 console.log("ATOMIC STORAGE ORCHESTRATION PASS; synthetic SQL client; PostgreSQL and TCP integration not yet tested");
}
void main();
