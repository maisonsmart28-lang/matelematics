# Step 10E-3 — 12-month telemetry retention architecture

Status: VALIDATED BASELINE (no production data deletion or schema change)

## Product requirement
Matelematics must provide up to 12 months of useful historical fleet data per customer.

This does not require keeping every decoded raw telemetry row in the operational PostgreSQL tables for 12 months.

## Measured operational baseline
Current measured total footprint:
- telemetry: 114,024,448 bytes / 35,838 rows ≈ 3,182 B/row
- positions: 16,949,248 bytes / 35,847 rows ≈ 473 B/row
- combined operational footprint ≈ 3,654 B/message

Adaptive traffic planning baseline: 201,600 messages / vehicle / month.

At the current operational row footprint, 12 months of raw telemetry + positions would be approximately:
- 1,000 vehicles: 8.84 TB
- 10,000 vehicles: 88.40 TB
- 50,000 vehicles: 441.99 TB
- 100,000 vehicles: 883.98 TB

These are capacity extrapolations from the current schema, not billing forecasts.

## Retention tiers

### HOT — operational detail
Target: 7 days initially, adjustable after production measurements.
Store recent decoded telemetry and positions in PostgreSQL for fast dashboard, live map, diagnostics and recent trip reconstruction.

### WARM — 12-month customer history
Store optimized historical records required by the product:
- trips and route points at an optimized sampling rate
- trip start/end, distance, duration, driving time
- odometer and fuel summaries
- DTC and diagnostic events
- alerts and safety events
- maintenance/compliance events
- driver/vehicle activity summaries
- daily/hourly aggregates required by reports

The customer-facing 12-month history should query this tier rather than scanning raw telemetry.

### ARCHIVE — raw recoverability
Raw/normalized telemetry older than HOT is archived in compact immutable time-partitioned objects, partitioned by tenant/company/vehicle/date.

The validated baseline archive format for the current telemetry representation is **JSONL + gzip**. Archive is not queried by normal dashboard pages. It is for controlled recovery, audit/debug/export, and future reprocessing when required.

## 10E-3C — JSONL + gzip measured result
Benchmark on 5,000 real telemetry rows:
- compressed bytes: 1,241,808
- compressed bytes/message: 248.4 B
- compression ratio: 17.38x
- reduction vs raw JSONL: 94.25%
- gzip write/compression time: 126.9 ms
- gunzip time: 32.2 ms
- decompression integrity: OK

At 201,600 messages / vehicle / month, the measured 12-month archive projections are:
- 1,000 vehicles: 0.60 TB
- 10,000 vehicles: 6.01 TB
- 50,000 vehicles: 30.04 TB
- 100,000 vehicles: 60.08 TB

## 10E-3D — Parquet + Snappy comparison
Benchmark on the same 5,000 real telemetry rows:
- JSONL + gzip: 1,241,808 bytes, 248.4 B/row, write 127.4 ms
- Parquet + Snappy: 20,964,405 bytes, 4,192.9 B/row, write 540.2 ms, read 100.9 ms
- Parquet integrity: OK
- Parquet size delta vs JSONL + gzip: +1,588.22%

12-month Parquet projections from this measured representation:
- 1,000 vehicles: 10.14 TB
- 10,000 vehicles: 101.43 TB
- 50,000 vehicles: 507.17 TB
- 100,000 vehicles: 1,014.34 TB

Parquet is not rejected as a technology in general. In this benchmark, large JSON telemetry fields are represented as UTF-8 JSON strings, so the columnar format cannot exploit a fully normalized typed schema. A future normalized analytical Parquet schema may be benchmarked separately if required.

**Decision for the current Matelematics raw archive baseline: JSONL + gzip.**

## Non-negotiable rules
1. No production deletion policy is enabled during Step 10.
2. Archive write + integrity verification must succeed before any future raw-row purge.
3. Tenant/company isolation must be preserved in all tiers.
4. Alerts, DTCs, trips, maintenance/compliance and customer-visible historical facts must remain available for the full 12-month requirement.
5. Raw archive retention duration is 12 months by default for the capacity model; legal/customer requirements may extend it later.
6. Dashboard queries must never depend on scanning the raw archive for normal operation.
7. Retention jobs must be idempotent and observable.
8. A restore/replay test is required before production rollout.

## Step 10E next validation
Use the measured HOT/WARM/ARCHIVE baselines to build the production capacity and unit-cost model. Separate:
- active tracker/vehicle traffic
- human dashboard/API traffic
- PostgreSQL HOT/WARM storage
- archive object storage
- ingestion/worker compute
- network/egress and observability

Do not treat the local TCP benchmark or the PostgREST benchmark as proof of absolute production capacity. Final production sizing requires measurement on the selected production infrastructure.
