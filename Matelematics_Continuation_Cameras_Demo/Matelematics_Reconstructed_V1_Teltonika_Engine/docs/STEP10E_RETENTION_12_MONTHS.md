# Step 10E-3B — 12-month telemetry retention architecture

Status: DESIGN BASELINE (no production data deletion or schema change)

## Product requirement
Matelematics must provide up to 12 months of useful historical fleet data per customer.

This does not require keeping every decoded raw telemetry row in the operational PostgreSQL tables for 12 months.

## Measured baseline
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
Raw/normalized telemetry older than HOT may be written in compact immutable time-partitioned archive objects (candidate format: Parquet + compression), partitioned by tenant/company/vehicle/date.

Archive is not queried by normal dashboard pages. It is for controlled recovery, audit/debug/export, and future reprocessing when required.

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
10E-3C must benchmark the compact archive representation using representative Matelematics telemetry and measure:
- bytes per message after serialization/compression
- archive write throughput
- archive read/replay throughput
- projected 12-month storage at 1k / 10k / 50k / 100k vehicles

Only measured compression results may be used for the final capacity/cost model.
