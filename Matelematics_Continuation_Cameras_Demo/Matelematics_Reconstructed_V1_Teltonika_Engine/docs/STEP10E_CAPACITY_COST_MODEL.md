# Step 10E-4 — Production capacity and unit-cost model

Status: BASELINE IN PROGRESS — measured capacity inputs fixed; final provider bill requires provider-specific storage pricing and production load tests.

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

### WARM — 12 months
WARM must contain customer-facing historical facts and aggregates rather than duplicate all raw events. Its final bytes/vehicle/month remain TO BE MEASURED after the optimized WARM schema is implemented. Do not invent this value.

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

1. Measure an optimized WARM representation in bytes/vehicle/month.
2. Obtain an authoritative Object Storage CHF/GB-month rate from the provider calculator/account context; do not infer it.
3. Benchmark the candidate Infomaniak production topology with the existing 1k/10k/50k/100k methodology.
4. Measure database write path after durable queue + batching optimization.
5. Add observability/backups/HA and calculate actual monthly CHF totals and CHF/active-vehicle.
6. Define commercial pricing only after infrastructure unit economics include safety margin and support/operations.

## Sources checked 2026-09-20

Infomaniak Public Cloud pricing:
https://www.infomaniak.com/fr/hebergement/public-cloud/tarifs

Infomaniak Public Cloud overview:
https://www.infomaniak.com/fr/hebergement/public-cloud
