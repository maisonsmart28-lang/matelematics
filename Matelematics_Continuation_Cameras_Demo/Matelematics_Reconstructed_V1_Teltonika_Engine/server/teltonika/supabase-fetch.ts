type FetchOptions = {
  fetchImpl?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
  timeoutMs?: number;
};
export function createSupabaseFetch(options: FetchOptions = {}): typeof fetch {
 const fetchImpl=options.fetchImpl ?? fetch;
 const wait=options.wait ?? ((ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms)));
 const timeoutMs=options.timeoutMs ?? 12000;
 return async (input,init)=>{
  const method=(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const readOnly=method==="GET" || method==="HEAD";
  const maxAttempts=readOnly ? 4 : 1;
  const callerSignal=init?.signal ?? (input instanceof Request ? input.signal : undefined);
  for(let attempt=1;attempt<=maxAttempts;attempt++){
   if(callerSignal?.aborted) throw new Error("Supabase request cancelled");
   const controller=new AbortController();
   const abort=()=>controller.abort();
   callerSignal?.addEventListener("abort",abort,{once:true});
   const timer=setTimeout(abort,timeoutMs);
   try {
    const response=await fetchImpl(input,{...init,signal:controller.signal,redirect:"error"});
    const retryable=[408,425,429,500,502,503,504].includes(response.status);
    if(!readOnly || !retryable || attempt===maxAttempts) return response;
    try {await response.body?.cancel();} catch { /* release best effort */ }
   } catch {
    if(callerSignal?.aborted) throw new Error("Supabase request cancelled");
    if(attempt===maxAttempts) {
     throw new Error(readOnly ? "Supabase read unavailable" : "Supabase write outcome unknown; reconcile before replay");
    }
   } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort",abort);
   }
   await wait(500*2**(attempt-1));
  }
  throw new Error("Supabase request failed");
 };
}
