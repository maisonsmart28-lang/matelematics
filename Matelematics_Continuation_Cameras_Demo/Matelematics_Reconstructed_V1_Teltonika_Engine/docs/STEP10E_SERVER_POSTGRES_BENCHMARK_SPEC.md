# Step 10E-4E — Server-side PostgreSQL Bulk Write Benchmark

Status: SPECIFICATION — no production architecture change.

## Why this benchmark exists

10E-4D measured the current client/network/PostgREST/current-schema path. Best observed throughput was 292 rows/s (500-row batches, 4 workers). That is enough to benchmark the 1,000-vehicle average load but is below the adaptive average requirement for 10,000+ vehicles.

10E-4E isolates the effect of removing PostgREST from the telemetry write path. It must not be interpreted as a production capacity guarantee.

## Supported Supabase connection choice

For a long-running Matelematics ingestion/worker service, current Supabase guidance prefers a direct PostgreSQL connection when the backend/network supports it. If the backend is IPv4-only without the IPv4 add-on, shared Supavisor session mode is the alternative. Transaction mode is primarily for serverless/edge workloads and does not support prepared statements.

The actual benchmark connection endpoint must be copied from the project's Supabase Connect panel; pooler hostnames must not be guessed.

## Security constraints

- Database connection string is server-only and must never use a NEXT_PUBLIC_* variable.
- Never commit credentials.
- Never expose the database password in browser code or benchmark output.
- Development/test project only.
- No RLS/schema/policy change for this benchmark.
- Benchmark rows use source = 'benchmark_10e4e'.
- Every test cell must clean its rows and verify remainingRows = 0.
- Stop immediately if cleanup cannot be verified.

## Benchmark paths

A. PostgreSQL protocol multi-row INSERT using a persistent server-side connection/pool.
B. PostgreSQL protocol COPY FROM STDIN, only if the selected Node driver supports it safely and without schema changes.

Path A is mandatory. Path B is optional until its dependency/security impact is reviewed.

## Matrix

Batch rows: 100, 250, 500, 1000.
Workers/connections: 1, 2, 4.
Target: >= 5,000 committed rows per cell by default.

Do not automatically test higher connection counts. Database connection headroom must remain available for Auth, PostgREST and dashboard/API workloads.

## Metrics

For every cell:
- rows attempted/committed
- failed batches
- retries
- elapsed ms
- sustained rows/s
- p50/p95/max batch latency
- cleanup remaining rows
- connection mode (direct/session/transaction) without secrets

Database-side measurements should also record, when available:
- max_connections
- active connections before/during test
- database size / telemetry relation size before and after cleanup
- relevant CPU/IO observations when production-like infrastructure becomes available.

## Capacity gates

Adaptive average demand:
- 1k vehicles: 77.78 rows/s
- 10k: 777.78 rows/s
- 50k: 3,888.89 rows/s
- 100k: 7,777.78 rows/s

Measured throughput / required throughput gives average-load headroom.

A result below 2x average-load headroom is not accepted as a production candidate. A result >=2x only qualifies for the next production-like burst/queue/database-resource validation; it is not itself production approval.

## Implementation gate

Before creating/running the benchmark script:
1. confirm the project connection mode/endpoint from Supabase rather than guessing it;
2. choose and pin the PostgreSQL Node dependency;
3. inspect npm security impact before accepting the dependency;
4. use a server-only environment variable such as DATABASE_URL;
5. verify the benchmark can clean all tagged rows.

No database password is to be requested in chat or committed to GitHub.
