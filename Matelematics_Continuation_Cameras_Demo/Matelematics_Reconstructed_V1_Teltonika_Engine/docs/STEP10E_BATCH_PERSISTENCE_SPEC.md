# Step 10E-4D — Queue + Batch Persistence Benchmark

Status: SPECIFICATION — no production architecture change.

## Objective

Measure the database write path that Matelematics will use behind a durable queue/buffer and batching workers. The benchmark must establish measured throughput and latency before any production-capacity or MAD/vehicle/month claim is made.

## Existing measured demand baseline

Adaptive telemetry baseline: 201,600 events/vehicle/month.

Average event rates:
- 1,000 vehicles: ~77.78 events/s
- 10,000 vehicles: ~777.78 events/s
- 50,000 vehicles: ~3,888.89 events/s
- 100,000 vehicles: ~7,777.78 events/s

The previous direct PostgREST concurrency benchmark is a comparison baseline only. It is not an absolute Supabase capacity measurement.

## Benchmark design

### Write target

Use the current telemetry persistence shape so the test includes current indexes and row overhead. Benchmark rows must be uniquely identifiable with `source = 'benchmark_10e4d'` and synthetic identifiers/timestamps that cannot collide with production data.

### Batch matrix

Test batch sizes:
- 100 rows
- 250 rows
- 500 rows
- 1,000 rows

For each batch size, test controlled worker counts:
- 1 worker
- 2 workers
- 4 workers

Do not automatically increase concurrency beyond 4. Earlier measurements showed regression at 8 workers.

### Per-cell workload

Default target: at least 5,000 rows per batch/worker cell when practical, with enough repeated batches to calculate useful latency percentiles.

Environment overrides may reduce/increase the workload, but the final report must state the exact row count.

### Metrics

For every cell record:
- rows attempted
- rows committed
- failed rows/batches
- retries
- elapsed time
- rows/s
- batch latency p50
- batch latency p95
- batch latency max
- cleanup result

### Safety

- Development/test project only.
- No schema or RLS changes.
- No retention/deletion policy changes.
- No browser service-role exposure.
- Benchmark data must be tagged and removed after each test/cell.
- Cleanup must be verified by a final count.
- If cleanup fails, stop and report residue before continuing.
- Retry only transient transport/server errors with bounded exponential backoff.
- Do not hide permanent database errors with retries.

## Capacity interpretation

For each fleet tier calculate headroom:

`measured sustained rows/s / required average rows/s`

This is not enough for production approval by itself. Production approval also requires burst headroom, queue-age stability, database CPU/IO/connection headroom, API/dashboard latency and production-like Infomaniak tests.

Initial interpretation targets:
- < 1.0x: insufficient even for average load
- 1.0x–2.0x: insufficient safety margin
- >= 2.0x: candidate for further production-like validation

These are engineering gates, not commercial guarantees.

## Cost interpretation

This benchmark measures capacity, not provider cost. Once a candidate write topology is measured, combine its required compute/database tier with the existing HOT/WARM/ARCHIVE model and normalize provider prices to MAD.

Commercial pricing remains downstream of:
1. infrastructure MAD/active vehicle/month,
2. observability/backups/HA,
3. support/operations,
4. safety margin,
5. commercial margin.

## Validation gate

10E-4D is validated only when:
- the benchmark script runs successfully,
- all benchmark residue is cleaned,
- at least the 100/250/500/1000 batch matrix at 1/2/4 workers is measured or a documented provider limit stops a cell,
- results are compared against 1k/10k/50k/100k adaptive average load,
- limitations are recorded without converting the result into an unsupported production-capacity claim.
