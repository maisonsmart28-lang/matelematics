# Step 10E-4 — Production capacity and unit-cost model

Status: BASELINE IN PROGRESS — measured capacity inputs fixed; Object Storage price captured from the Infomaniak calculator; final provider bill still requires production load tests and remaining service costs.

## Fixed measured inputs

- Adaptive traffic baseline: 201,600 telemetry events / vehicle / month (6,720/day).
- Current operational PostgreSQL footprint: ~3,654.49 B per telemetry+position event.
- HOT retention target: 7 days.
- Validated raw archive baseline: JSONL + gzip.
- Validated archive footprint: 248.4 B/event.
- Raw archive retention model: 12 months.
- Parquet + Snappy current representation is not selected (4,192.9 B/event vs 248.4 B/event JSONL+gzip).
- Local 10,000-socket TCP/Codec8E/normalize/ACK test is validated but is not a production infrastructure capacity claim.
- Concurrent PostgREST persistence benchmark is not an absolute Supabase capacity claim; naive concurrency regressed at 8 workers.

## Capacity model

### Traffic
Average adaptive ingestion rate:
- 1,000 vehicles: ~77.78 events/s
- 10,000 vehicles: ~777.78 events/s
- 50,000 vehicles: ~3,888.89 events/s
- 100,000 vehicles: ~7,777.78 events/s

### HOT PostgreSQL — 7 days
Each vehicle produces 47,040 events in 7 days.

At the current combined operational footprint, estimated HOT working-set capacity is approximately:
- 1,000 vehicles: 0.172 TB
- 10,000 vehicles: 1.72 TB
- 50,000 vehicles: 8.60 TB
- 100,000 vehicles: 17.19 TB

These are current-schema capacity extrapolations, not expected invoices. They deliberately expose why schema/index/retention optimization is required before large production scale.

### ARCHIVE — 12 months
Measured JSONL+gzip projections:
- 1,000 vehicles: 0.60 TB
- 10,000 vehicles: 6.01 TB
- 50,000 vehicles: 30.04 TB
- 100,000 vehicles: 60.08 TB

Infomaniak Object Storage calculator price captured 2026-09-20: **EUR 0.000013 / GB / hour**.

For Matelematics commercial planning, MAD is the reference currency. Use **1 EUR = 11 MAD as a conservative planning conversion**, not as a live accounting exchange rate. At 730 h/month this gives ~0.10439 MAD/GB/month (~104.39 MAD/TB/month, using decimal GB/TB for the provider-cost model).

Approximate monthly archive cost once the 12-month retention window is fully populated:
- 1,000 vehicles / 0.60 TB: ~62.63 MAD/month, ~0.063 MAD/vehicle/month
- 10,000 vehicles / 6.01 TB: ~627.38 MAD/month, ~0.063 MAD/vehicle/month
- 50,000 vehicles / 30.04 TB: ~3,135.88 MAD/month, ~0.063 MAD/vehicle/month
- 100,000 vehicles / 60.08 TB: ~6,271.75 MAD/month, ~0.063 MAD/vehicle/month

These figures cover Object Storage capacity only. They exclude compute, HOT/WARM database, queue/workers, observability, backups, HA, taxes and any chargeable egress.

### WARM — 12 months
The read-only Step 10E-4B benchmark is validated for the components that are currently measurable from Supabase.

Observed source sample:
- 20,000 telemetry rows
- 20,000 position rows
- 130 alerts
- 2 distinct vehicles
- 14.91 observed days

Measured optimized WARM representation:
- route samples: 2,081 rows / 440,316 raw bytes
- hourly aggregates: 31 rows / 9,265 raw bytes
- daily aggregates: 9 rows / 2,695 raw bytes
- important events: 130 rows / 28,897 raw bytes
- combined: 481,173 raw bytes -> 35,821 gzip bytes
- compression ratio: 13.43x
- measured unit footprint: ~1,201 gzip bytes / active vehicle-day
- projection for measured components only: ~0.04 MB / vehicle / month, ~0.43 MB / vehicle / 12 months

This projection MUST NOT be treated as the complete WARM footprint. Trips were not synthesized by this benchmark, and the current maintenance/compliance populations contain no representative rows from which to measure their production frequency or storage cost. The validated conclusion is narrower: sampled route history + hourly/daily aggregates + currently observed important events are highly compact compared with the raw operational event stream.

A complete WARM bytes/vehicle/month value remains pending representative trip and business-record measurements.

## 10E-4D measured batch persistence result

The controlled queue/batch persistence benchmark completed successfully with final cleanup verified at 0 remaining benchmark rows.

Best observed cell:
- batch: 500 rows
- workers: 4
- committed: 6,000 rows
- failed batches: 0
- retries: 0
- sustained observed throughput: 292 rows/s
- batch latency p50: 5,987.32 ms
- p95: 8,589 ms
- max: 8,589 ms

Average adaptive-load headroom from that observed path:
- 1,000 vehicles: 3.75x
- 10,000 vehicles: 0.38x
- 50,000 vehicles: 0.08x
- 100,000 vehicles: 0.04x

The 1,000-row / 4-worker cell regressed to 141.1 rows/s, required 2 retries, and reached 31,164.18 ms maximum batch latency. More concurrency/larger batches therefore cannot be assumed to improve throughput.

Interpretation: this benchmark measures the client/network/PostgREST/current-schema path, not pure PostgreSQL capacity. It validates the benchmark method and demonstrates that the current direct write path is not a 10k+ vehicle production architecture. The next capacity experiment must compare a server-side worker/bulk PostgreSQL path located close to the database, behind a durable queue, before production sizing is claimed.

## 10E-4E measured native PostgreSQL persistence result

Status: **VALIDATED 100% for the scoped native PostgreSQL persistence experiment**.

The benchmark used the PostgreSQL protocol through the Supabase shared Session pooler on port 5432, with multi-row parameterized INSERTs, persistent pooling, 5,000+ committed rows per matrix cell, and cleanup after every cell.

Best observed cell:
- batch: 500 rows
- workers: 2
- committed: 5,000 rows
- failed batches: 0
- retries: 0
- sustained observed throughput: 440.3 rows/s
- batch latency p50: 1,987.49 ms
- p95: 2,544.26 ms
- max: 2,544.26 ms

Compared with the best 10E-4D PostgREST cell (292.0 rows/s), the best native PostgreSQL cell improved observed throughput by approximately **50.8%**.

Average adaptive-load headroom from the best observed native PostgreSQL path:
- 1,000 vehicles: 5.66x — candidate at the benchmark's 2x average-load gate
- 10,000 vehicles: 0.57x — insufficient
- 50,000 vehicles: 0.11x — insufficient
- 100,000 vehicles: 0.06x — insufficient

Concurrency did not scale monotonically. The 1,000-row / 4-worker cell collapsed to 51.7 rows/s with p50 33,581.61 ms and p95/max 121,091.63 ms. Increasing batch size or worker count is therefore not a valid scaling strategy by itself.

Integrity/cleanup verification:
- every matrix cell completed with 0 failed batches and 0 retries;
- every per-cell cleanup reported 0 remaining benchmark rows;
- final cleanup reported 0 remaining benchmark rows;
- an independent Supabase SQL verification after the run confirmed 0 rows with source = `benchmark_10e4e`;
- `pg_stat_user_tables` reported 35,838 live rows and 0 dead tuples;
- autovacuum had run after the benchmark and the telemetry relation returned to ~115.28 MB total relation size, confirming that the temporary post-INSERT/DELETE growth was not retained benchmark data.

Dependency/security review:
- native driver: `pg@8.23.0`;
- the post-install `npm audit` still reports 10 project vulnerabilities (2 moderate, 7 high, 1 critical), but none of the reported vulnerable packages is `pg` or its dependency chain;
- no `npm audit fix` or `npm audit fix --force` was applied;
- the existing Next.js and other dependency advisories remain a separate remediation gate before production.

Connection/TLS notes:
- the local benchmark required switching the Windows Wi-Fi resolver from the router DNS to Cloudflare DNS because Node/getaddrinfo intermittently failed to resolve the Supabase Session pooler while direct DNS queries succeeded;
- `rejectUnauthorized:false` was used only as a local diagnostic to establish the connection after a self-signed-certificate-chain error;
- disabling certificate verification is **not approved for production**. Production workers must use a properly validated TLS configuration/certificate chain.

Conclusion: removing PostgREST materially improves the measured write path, but the current remote native PostgreSQL path still does not provide the required average throughput for 10,000+ vehicles. The production candidate remains durable queue + controlled workers close to the database + optimized HOT/WARM/archive design, followed by production-like Infomaniak and database-resource/burst/failover testing.

## Production topology baseline

Trackers
  -> Infomaniak TCP ingestion nodes
  -> durable queue/buffer
  -> batching/normalization workers
  -> Supabase/PostgreSQL HOT + optimized WARM
  -> immutable JSONL+gzip object archive

Human users
  -> Web/CDN
  -> Matelematics API
  -> HOT/WARM PostgreSQL

Normal dashboard requests must not scan the raw archive.

## Compute baseline

Infomaniak's current public pricing page (checked 2026-09-20) displays a general-purpose reference instance of 4 vCPU / 8 GB RAM / 50 GB storage / 1 TB bandwidth at CHF 16.10/month. This is a price reference, not a demonstrated Matelematics capacity.

Production scaling must be driven by measured:
- CPU/RAM
- concurrent tracker sockets
- ACK p50/p95/p99
- queue depth and oldest-message age
- worker write throughput
- PostgreSQL CPU/IOPS/locks/connections
- API p95/p99
- dashboard latency
- object archive write/read/replay throughput

## Network baseline

Infomaniak states general Public Cloud incoming/outgoing traffic is normally free. For Object Storage, 10 TB/month of outgoing traffic per organisation is included before additional billing applies. Archive retrieval must therefore be exceptional/controlled rather than a normal dashboard path.

## Unit-cost formula

Monthly infrastructure cost per active vehicle must be calculated as:

(compute ingestion + queue/workers + HOT/WARM database + object archive + network/egress + observability + backups) / active vehicles

Human-user cost must be tracked separately:

(web/API compute + auth/MAU + dashboard/API egress attributable to human usage) / monthly active human users

Do not blend the two metrics.

## Scale gates

No fleet tier is production-approved merely from extrapolation.

For each target tier (1k, 10k, 50k, 100k), approve only after production-like infrastructure tests demonstrate acceptable headroom. Initial alert/gate targets:
- sustained CPU < 70%
- sustained RAM < 75%
- no persistent queue growth
- no ACK loss
- database connection/IO headroom
- stable API/dashboard p95
- restore/replay verified

## Remaining work before 10E-4 closure

1. Complete WARM measurement with representative trips and maintenance/compliance business-record volumes; the route/aggregate/event subset is validated at ~0.04 MB/vehicle/month.
2. Object Storage rate obtained from the Infomaniak calculator (EUR 0.000013/GB/hour) and normalized to MAD for planning; refresh the exchange-rate assumption before final commercial pricing.
3. Benchmark the candidate Infomaniak production topology with the existing 1k/10k/50k/100k methodology.
4. 10E-4D PostgREST batching (best 292 rows/s) and 10E-4E native PostgreSQL batching (best 440.3 rows/s) are validated. Next benchmark the durable-queue worker path on production-like infrastructure close to the database; current native remote path is still below the 10k average-load requirement.
5. Resolve production TLS certificate validation for the native PostgreSQL worker path; diagnostic `rejectUnauthorized:false` is not acceptable in production.
6. Remediate/revalidate the existing npm security advisories separately, especially the critical Next.js advisory, without blind `npm audit fix --force` upgrades.
7. Add observability/backups/HA and calculate actual monthly MAD totals and MAD/active-vehicle.
8. Define commercial pricing only after infrastructure unit economics and measurable compliance costs include safety margin and support/operations.

## Sources checked 2026-09-20

Infomaniak Public Cloud pricing:
https://www.infomaniak.com/fr/hebergement/public-cloud/tarifs

Infomaniak Public Cloud overview:
https://www.infomaniak.com/fr/hebergement/public-cloud


## Mandatory Morocco compliance dimension in the benchmark

The Step 10E benchmark is not considered complete if it measures only technical throughput and infrastructure cost. Moroccan compliance is a first-class benchmark dimension and must be evaluated together with capacity, storage, latency and MAD/vehicle/month.

Every candidate production topology (Supabase, Infomaniak, queue, workers, HOT/WARM/archive, backups, observability, maps, notifications and any future processor) must therefore be scored factually against:
- physical processing/storage country and international-transfer impact;
- CNDP processing/transfer formalities applicable to the actual data flow;
- data minimization and retention feasibility;
- verified deletion/anonymization capability and cost;
- tenant isolation and privileged-access controls;
- auditability of sensitive access/exports;
- backup/restore retention and deletion propagation;
- encryption/security controls and processor/subprocessor evidence;
- ANRT approval evidence for deployed tracker/radio models;
- Moroccan cybersecurity/DGSSI scope and controls where applicable.

### Benchmark outputs

For each fleet tier (1k / 10k / 50k / 100k), the final benchmark must report both:
1. technical/economic metrics: ingestion capacity, DB throughput, HOT/WARM/archive footprint, latency, resilience and MAD/active vehicle/month;
2. compliance-operational metrics: retained personal-data volume by tier, retention/deletion workload, archive/backup implications, countries/processors, required compliance controls and their infrastructure/operational cost where measurable.

A topology that is fast or inexpensive but cannot satisfy mandatory Moroccan legal/regulatory requirements is not an eligible production candidate.

Compliance costs that cannot yet be measured must be shown as pending/unknown rather than treated as zero.

Reference implementation checklist: `docs/STEP10E_COMPLIANCE_MOROCCO.md`.
