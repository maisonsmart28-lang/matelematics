import assert from "node:assert/strict";
import { createSupabaseFetch } from "./supabase-fetch";
async function main(){
 for(const method of ["POST","PATCH","DELETE"]){
  let calls=0;
  const transport=createSupabaseFetch({fetchImpl:async()=>{calls++;throw new TypeError("Connection lost after commit");},wait:async()=>{}});
  await assert.rejects(transport("https://example.invalid",{method}),/write outcome unknown/);
  assert.equal(calls,1);
 }
 console.log("PASS: ambiguous POST/PATCH/DELETE never automatically replayed");
 for(const status of [429,500,503]){
  let calls=0;
  const transport=createSupabaseFetch({fetchImpl:async()=>{calls++;return new Response("",{status});},wait:async()=>{}});
  const response=await transport("https://example.invalid",{method:"POST"});
  assert.equal(response.status,status);assert.equal(calls,1);
 }
 let calls=0;
 const recovered=createSupabaseFetch({fetchImpl:async()=>{calls++;if(calls<3)throw new TypeError("Network failure");return new Response("[]");},wait:async()=>{}});
 assert.equal((await recovered("https://example.invalid")).status,200);assert.equal(calls,3);
 calls=0;
 const exhausted=createSupabaseFetch({fetchImpl:async()=>{calls++;return new Response("",{status:503});},wait:async()=>{}});
 assert.equal((await exhausted("https://example.invalid")).status,503);assert.equal(calls,4);
 calls=0;
 const caller=new AbortController();caller.abort();
 await assert.rejects(recovered("https://example.invalid",{signal:caller.signal}),/cancelled/);
 assert.equal(calls,0);
 let redirect="";
 const checked=createSupabaseFetch({fetchImpl:async(_input,init)=>{redirect=String(init?.redirect);return new Response("[]");}});
 await checked("https://example.invalid");assert.equal(redirect,"error");
 console.log("PASS: mutation HTTP errors not retried, reads recover within four attempts, cancellation and redirect rejection");
 console.log("SUPABASE TRANSPORT RETRY SELF-TEST PASS; mocked HTTP, no DB");
}
main().catch(()=>{console.error("Supabase transport self-test FAIL");process.exitCode=1;});
