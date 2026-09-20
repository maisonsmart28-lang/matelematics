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
4. 10E-4D direct PostgREST batching measured (best 292 rows/s); next compare server-side/bulk PostgreSQL worker path behind a durable queue.
5. Add observability/backups/HA and calculate actual monthly CHF totals and CHF/active-vehicle.
6. Define commercial pricing only after infrastructure unit economics include safety margin and support/operations.

## Sources checked 2026-09-20

Infomaniak Public Cloud pricing:
https://www.infomaniak.com/fr/hebergement/public-cloud/tarifs

Infomaniak Public Cloud overview:
https://www.infomaniak.com/fr/hebergement/public-cloud
