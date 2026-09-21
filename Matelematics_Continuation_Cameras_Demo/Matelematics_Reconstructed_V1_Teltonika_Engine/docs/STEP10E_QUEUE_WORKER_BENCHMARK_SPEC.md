# Step 10E-4F — Durable queue / worker benchmark specification

Status: READY FOR IMPLEMENTATION

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
