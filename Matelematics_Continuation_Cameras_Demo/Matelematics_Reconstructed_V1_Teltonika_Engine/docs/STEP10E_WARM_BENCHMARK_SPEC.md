# Step 10E-4B.2 — Representative WARM benchmark specification

Status: SPECIFICATION BASELINE — no production schema/data mutation

## Objective

Measure the storage required for 12 months of useful customer-facing fleet history without duplicating every raw telemetry event.

The current test database cannot directly establish WARM bytes/vehicle/month because trips, maintenance, compliance and notifications currently contain no representative historical volume. Therefore the benchmark must derive a deterministic WARM sample from existing real telemetry/positions and existing alert events, without writing into business tables.

## Source data

Read-only inputs:
- public.telemetry
- public.positions
- public.alerts

Maintenance/compliance records are retained as first-class 12-month business records in production, but their current zero-row test populations cannot be used for a measured per-vehicle storage rate yet. They must be accounted for separately once representative data exists.

## WARM representation to benchmark

### 1. Route history
Do not copy every raw GPS point.

Create optimized route points from real positions using deterministic temporal sampling:
- moving: target one point per 30 seconds
- stopped/low-change: target one point per 5 minutes
- always preserve first/last point of a detected activity window where possible

Fields should be limited to customer-history needs:
company_id, vehicle_id, recorded_at, latitude, longitude, speed, heading and optional event marker.

### 2. Hourly vehicle summary
One record per active vehicle/hour containing only available/measurable values:
- first/last timestamp
- point/event count
- distance proxy or measured distance when available
- min/max/avg speed where available
- ignition/activity counts where available
- odometer/fuel/engine values only when source data supports them
- alert count

Do not invent unavailable sensor values.

### 3. Daily vehicle summary
One record per active vehicle/day:
- first/last activity
- telemetry/position counts
- active-hour count
- distance/odometer/fuel aggregates only when source data supports them
- alert count and severity counts

### 4. Important events
Retain normalized customer-visible events rather than all raw messages:
- alerts
- DTC/diagnostic facts when actually present in telemetry
- safety/event markers when actually present

### 5. Trips
If the existing sample permits deterministic trip reconstruction, benchmark compact trip records with start/end, duration and available distance/activity fields.
If it does not, report trips as NOT MEASURABLE from the current sample rather than inventing trip density.

## Measurement method

The benchmark must:
1. fetch a representative bounded sample from Supabase without modifying data;
2. build the WARM representation in memory/local temporary files;
3. serialize each WARM component deterministically;
4. measure uncompressed and gzip-compressed bytes;
5. report source rows, represented vehicles, covered time span, and records by component;
6. calculate bytes per source active vehicle-day from the observed sample;
7. extrapolate bytes/vehicle/month and bytes/vehicle/12 months only when the observed time span and vehicle coverage make that extrapolation meaningful;
8. clearly mark any component whose frequency cannot be measured from current data.

## Required output

- source telemetry rows
- source position rows
- source alert rows
- distinct vehicles
- observed time span
- optimized route-point rows and bytes
- hourly-summary rows and bytes
- daily-summary rows and bytes
- important-event rows and bytes
- trip rows/bytes or NOT MEASURABLE
- total WARM bytes
- gzip bytes
- compression ratio
- observed bytes/active vehicle-day
- projected MB/vehicle/month
- projected MB/vehicle/12 months
- projections for 1k / 10k / 50k / 100k vehicles

## Safety/integrity rules

- Read-only against Supabase.
- No inserts into telemetry, positions, trips, alerts or business tables.
- No schema changes.
- No production retention/deletion jobs.
- Do not fabricate missing fields or event frequencies.
- Keep tenant/company/vehicle identifiers only as needed for deterministic grouping.
- Benchmark artifacts are temporary/local and must not become customer data.

## Validation gate

10E-4B is not validated merely because the script runs.

Validation requires:
- deterministic successful run,
- credible observed coverage,
- no source-data mutation,
- measured component sizes,
- explicit treatment of unmeasurable components,
- a WARM unit-storage baseline that can be defended from the observed sample.

If current data coverage is too short or sparse for a credible annual extrapolation, the result must be recorded as insufficient and a controlled representative dataset must be generated in a later benchmark rather than inventing a cost.
