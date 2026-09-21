# Step 10E-4F — Durable queue / worker benchmark specification

Status: PHASE A BENCHMARK COMPLETE — Phase B / failure-replay validation pending

## Purpose

Measure the architecture that Matelematics intends to use for scalable telemetry persistence:

Trackers / ingestion -> durable queue -> controlled workers -> PostgreSQL HOT path

10E-4D measured PostgREST batching (best 292.0 rows/s). 10E-4E measured native PostgreSQL batching from the remote benchmark client (best 440.3 rows/s). 10E-4F must isolate queueing, backlog and drain behavior instead of treating the producer and database writer as one synchronous path.

## Safety / scope

- Development/test project only.
- No production deployment.
- No RLS, policy or schema change.
- Database credentials remain server-only.
- Benchmark rows use source marker `benchmark_10e4f`.
- Cleanup is mandatory after every cell and in a final `finally` path.
- Verify zero benchmark rows after cleanup.
- Do not disable TLS certificate verification as a production solution.
- No blind dependency upgrades or `npm audit fix --force`.

## Phase A — dependency-free local durable queue model

Before selecting Redis/RabbitMQ/NATS or a paid managed queue, implement a zero-cost benchmark harness using an append-only JSONL spool on local disk as the durable queue model. This is not the final production queue selection. Its purpose is to validate benchmark semantics and worker/backpressure metrics without introducing another dependency or provider.

Producer:
- generate deterministic queue records from a real telemetry sample;
- append them to a queue spool;
- record enqueue timestamp;
- report enqueue throughput and queue depth.

Workers:
- read queued records in controlled batches;
- persist using PostgreSQL multi-row INSERT;
- acknowledge/remove only after successful DB commit;
- retry transient DB failures within a bounded retry policy;
- preserve unacknowledged records on failure.

Required metrics:
- produced / committed / failed / retried rows;
- enqueue rows/s;
- DB commit rows/s;
- queue depth peak;
- queue depth at end;
- oldest queued message age;
- total drain time after producer stops;
- DB batch latency p50/p95/max;
- cleanup remaining rows.

Initial smoke cell:
- 1,000 total rows;
- producer burst sufficient to create measurable backlog;
- DB batch 500;
- 2 workers.

Validation matrix after smoke:
- target >= 5,000 rows/cell;
- DB batch sizes: 250 / 500 / 1000;
- workers: 1 / 2 / 4;
- producer rate modes: bounded average and burst.

Adaptive average requirements:
- 1k vehicles: 77.78 events/s
- 10k: 777.78 events/s
- 50k: 3,888.89 events/s
- 100k: 7,777.78 events/s

A cell is only a capacity candidate when sustained DB drain throughput is >=2x the target average rate and backlog remains bounded/drains after the producer stops.

## Phase B — production queue candidate

Only after Phase A benchmark semantics are validated, compare actual production candidates on Infomaniak-compatible infrastructure. Candidate selection must include:
- persistence/durability guarantees;
- acknowledgement semantics;
- backpressure;
- replay/recovery;
- HA/failover;
- operational complexity;
- Morocco/CNDP data-location and processor implications;
- MAD/month and MAD/active vehicle/month.

No production queue technology is selected by 10E-4F Phase A alone.

## Exit criteria

10E-4F is complete only when:
1. queue/worker benchmark is reproducible;
2. no benchmark DB residue remains;
3. backlog and drain metrics are captured;
4. failure/retry behavior is demonstrated;
5. results are compared against 1k/10k/50k/100k requirements;
6. production queue candidate testing and compliance/cost gaps are explicitly documented.


## Phase A measured results

### Burst-drain matrix — 5,000 rows/cell

All nine valid cells committed 5,000/5,000 rows, reported zero failures/retries, ended at queue depth zero, removed all benchmark rows, and removed the local spool.

| Batch x workers | DB drain rows/s | Drain time |
|---|---:|---:|
| 250 x 1 | 67.1 | 74.46 s |
| 250 x 2 | 89.5 | 55.86 s |
| 250 x 4 | 189.2 | 26.43 s |
| 500 x 1 | 984.9 | 5.08 s |
| 500 x 2 | 1,282.6 | 3.90 s |
| 500 x 4 | 774.5 | 6.46 s |
| 1000 x 1 | 952.7 | 5.25 s |
| 1000 x 2 | **1,332.6** | **3.75 s** |
| 1000 x 4 | 265.9 | 18.81 s |

Best observed cell: 1000 x 2 at 1,332.6 rows/s. This is about 1.71x the 10k adaptive average requirement (777.78/s), below the 2x capacity-candidate gate (1,555.56/s). Four-worker cells demonstrate non-monotonic scaling and concurrency saturation. Results also show substantial remote DB/network variability, so the best single burst-drain result is not a production capacity claim.

### Paced producer harness validation

The first paced implementation exposed two harness defects and those affected runs are excluded from capacity conclusions:

1. Worker cursor advanced by the configured batch size instead of rows actually claimed. A 2,000-row control produced 2,000 but committed only 4. Fixed by commit `26c6ec0`.
2. Per-event sleeping limited a requested 500/s producer to about 74/s. Replaced with monotonic target-rate pacing by commit `d9820d3`.
3. Burst phase targets initially reset against a global row counter, producing artificial pauses. Fixed with cumulative phase targets by commit `a89df67`.

After the pacing fix, the 500/s control produced 2,000/2,000 with an observed 499.3/s enqueue rate, zero failures/retries, peak depth 699, final depth zero, and zero DB residue. This validates producer-rate accuracy and concurrent producer/worker operation for the subsequent paced tests.

### 10k adaptive-average baseline — three repeated runs

Configuration: 5,000 rows, batch 1000, 2 workers, requested producer 778/s.

| Run | Enqueue rows/s | DB drain rows/s | Peak depth | Post-producer drain | p95 |
|---|---:|---:|---:|---:|---:|
| 1 | 776.3 | 471.4 | 2,480 | 4.17 s | 3.43 s |
| 2 | 776.5 | 430.1 | 1,545 | 5.19 s | 2.96 s |
| 3 | 775.7 | 758.8 | 701 | 0.145 s | 0.387 s |

All three runs committed 5,000/5,000 with zero failures/retries, final depth zero, and cleanup residue zero. Mean observed producer rate was about 776.2/s, demonstrating stable load generation. DB drain varied materially (430.1–758.8 rows/s). None of these repeated paced runs reached the 777.78/s 10k average requirement, and none approached the 2x gate.

### Controlled burst — valid corrected run

Configuration: 10,000 rows, batch 1000, 2 workers, base 778/s, burst 2,000/s beginning at 3 s for 3 s, then return to base rate.

Measured:
- produced / committed: 10,000 / 10,000;
- failed / retries: 0 / 0;
- average enqueue: 1,226.1 rows/s;
- DB drain: 378.4 rows/s;
- peak queue depth: 6,004;
- final depth: 0;
- producer duration: 8.16 s;
- post-producer drain: 18.27 s;
- DB latency p50 / p95 / max: 1.66 s / 7.90 s / 14.32 s;
- cleanup remaining rows: 0.

The queue model absorbed the controlled overload without data loss and eventually drained completely. This demonstrates backpressure buffering behavior, not sufficient database capacity: persistence remained substantially below both the burst input and the 10k average target on this run.

## Phase A conclusion

The benchmark harness now reproduces bounded producer rates and controlled bursts, captures backlog/drain behavior, and cleans benchmark data reliably. Queue buffering protects ingestion from temporary persistence slowdowns in the tested no-failure path.

Current PostgreSQL persistence on the tested remote development path is **not a 10k production-capacity candidate** under the defined 2x safety gate. The strongest burst-drain observation (1,332.6 rows/s) is below 1,555.56 rows/s, while repeated paced 10k-average runs were 430.1–758.8 rows/s. The observed variability requires production-like infrastructure testing before sizing.

Phase A is not the final production queue implementation. The current JSONL spool plus in-memory worker claims does not yet prove crash recovery, durable acknowledgement/replay, HA, or permanent-failure retention. Therefore exit criterion 4 (failure/retry behavior demonstrated end-to-end) and Phase B production-candidate/compliance/cost work remain open.

## Next gate

Proceed to Phase B architecture/candidate evaluation rather than repeating the same remote-development throughput cells. Candidate testing must preserve the measured queue semantics while adding real durability/ack/replay behavior, then benchmark on the intended Infomaniak-compatible infrastructure. Production selection remains blocked on performance, Morocco/CNDP data-location/processor review, reliability/HA, and MAD cost per active vehicle.
