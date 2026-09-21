# Step 10E-4F Phase B — Production queue candidate benchmark

Status: READY FOR CANDIDATE VALIDATION

## Objective

Select and validate a real durable telemetry queue for the production architecture:

Trackers / ingestion -> durable queue -> controlled workers -> PostgreSQL HOT path

Phase A proved the queue/backpressure benchmark semantics but did not select a production queue. Phase B must add real durability, acknowledgement/replay, recovery and HA evidence, then measure performance and MAD cost on infrastructure compatible with the intended Infomaniak production target.

## Hard gates

A production candidate must be evaluated against all of these gates:

1. Durable persistence before producer acknowledgement.
2. Explicit consumer acknowledgement only after PostgreSQL commit.
3. Redelivery/replay after worker crash or transient database failure.
4. Bounded retry policy plus dead-letter/quarantine strategy.
5. Backpressure visibility: ready, in-flight/unacked, oldest age and drain time.
6. Horizontal worker scaling without silent loss or duplicate business effects.
7. HA/failover path appropriate to the fleet tier.
8. Encryption in transit and at rest, secrets kept server-side.
9. Documented data-processing/storage country and subprocessors.
10. Morocco Law 09-08 / CNDP foreign-transfer review before production approval.
11. Measured infrastructure cost in MAD/month and MAD/active vehicle/month.
12. Sustained persistence capacity target >= 2x the fleet's adaptive average ingestion rate.

Adaptive average rates:
- 1k vehicles: 77.78 events/s; 2x gate 155.56/s
- 10k: 777.78 events/s; 2x gate 1,555.56/s
- 50k: 3,888.89 events/s; 2x gate 7,777.78/s
- 100k: 7,777.78 events/s; 2x gate 15,555.56/s

## Candidate shortlist

### Candidate A — RabbitMQ on Infomaniak Public Cloud VM(s)

Role: primary Phase B benchmark candidate.

Why benchmark it:
- mature durable queues, publisher confirms, consumer acknowledgements and redelivery;
- dead-letter exchanges/queues and explicit retry topology;
- portable open-source deployment with no dependency on a proprietary managed queue;
- can be placed on Infomaniak Public Cloud compute in Switzerland.

Validation required:
- quorum/durable queue configuration;
- persistent messages and publisher confirms;
- manual consumer ack after PostgreSQL commit;
- worker crash/redelivery;
- PostgreSQL outage/recovery;
- bounded retry + DLQ;
- single-node development benchmark first, then HA topology/cost separately.

### Candidate B — NATS JetStream on Infomaniak Public Cloud VM(s)

Role: comparison candidate.

Why benchmark it:
- durable streams/consumers, explicit ack/redelivery and replay;
- lightweight footprint and strong telemetry/event-stream fit;
- portable open-source deployment.

Validation required:
- file-backed JetStream;
- explicit ack after DB commit;
- durable consumer;
- max-deliver / dead-letter or quarantine design;
- crash/restart/replay;
- HA cluster topology and storage sizing.

### Candidate C — Redis Streams

Role: conditional candidate, not the first implementation target.

Infomaniak publicly lists Redis as a managed-database capability but the current product page marks Redis as “available soon”. Therefore managed Redis must not be assumed available for Matelematics today. Self-hosted Redis Streams could still be benchmarked later if RabbitMQ/NATS results justify it.

Required if tested:
- AOF persistence policy and durability trade-off;
- consumer groups / pending-entry recovery;
- explicit reclaim/replay behavior;
- memory + disk sizing;
- HA topology;
- proof that the chosen persistence settings meet telemetry durability requirements.

### Not selected as the primary queue

PostgreSQL itself remains the HOT persistence target, not the shock absorber. Phase A already showed remote DB throughput variability and backlog formation at the 10k adaptive-average load. Object Storage is the archive layer, not the low-latency work queue.

Kafka-compatible infrastructure is deferred unless RabbitMQ/NATS cannot satisfy measured 50k/100k tiers or replay/stream-retention requirements. Its additional operational footprint is not justified before that evidence exists.

## Infomaniak infrastructure facts to verify during provisioning

Current public Infomaniak information describes Public Cloud as OpenStack infrastructure operated in Switzerland, with multiple Swiss regions/availability zones, private networking, instances, block/object storage and managed Kubernetes.

The public reference price shown for a general-purpose instance is CHF 16.10/month for 4 CPU, 8 GB RAM, 50 GB storage and 1 TB bandwidth. This is only a sizing reference; final queue nodes, block storage, IPv4, load balancers, backups and HA resources must be priced from the actual selected configuration.

Infomaniak's managed Kubernetes control plane has a free shared tier without SLA and paid dedicated tiers with SLA, while worker instances/storage/network are billed separately. Kubernetes is therefore an optional orchestration path, not a zero-cost production assumption.

Infomaniak states its Public Cloud infrastructure/data are managed in Switzerland. For Matelematics this does not itself close Moroccan compliance: foreign processing/storage remains subject to the Morocco/CNDP compliance gate already documented for Step 10E.

## Benchmark stages

### B0 — architecture/configuration review
No paid resource required.
- freeze RabbitMQ and NATS configurations to benchmark;
- define message envelope and idempotency key;
- define ACK-after-DB-commit contract;
- define retry/DLQ/replay semantics;
- define queue metrics and cleanup.

### B1 — local functional failure benchmark
Zero-cost.
For each implemented candidate:
- enqueue deterministic telemetry;
- kill/restart worker before ack;
- force DB failure;
- verify unacked redelivery;
- recover DB and drain;
- prove no silent loss;
- measure duplicates and idempotency handling;
- verify DLQ/quarantine for permanent failure.

### B2 — controlled throughput benchmark
Use the same adaptive workload model as Phase A:
- baseline 778/s;
- controlled 2,000/s burst;
- then 1k/10k/50k/100k capacity tiers as infrastructure permits.
Record producer rate, queue ingress, DB commits/s, queue peak/end depth, oldest age, recovery/drain, p50/p95/max, failures, retries/redeliveries and duplicates.

### B3 — Infomaniak production-like benchmark
Only when the candidate/configuration is ready and the user authorizes use of cloud resources/credits.
- queue and workers colocated in the intended Swiss region/network;
- PostgreSQL placement/latency explicitly documented;
- repeated runs, not single best run;
- HA/failover test for production tiers;
- compute/storage/network/backup/observability costs converted to MAD.

## Cost model

For each fleet tier:

queue MAD/month
+ worker MAD/month
+ persistent block storage
+ backup/snapshot
+ network/load-balancer/public IP where applicable
+ observability
+ measurable compliance operational costs
= queue/worker subsystem MAD/month

Then divide by active vehicles.

Unknown compliance or provider costs remain PENDING/UNKNOWN, never zero.

## Phase B decision rule

Do not choose a production queue from feature comparison alone.

A candidate advances only after:
- failure/replay semantics are demonstrated;
- no silent loss is observed;
- duplicates are handled/idempotent;
- the target fleet tier meets the 2x sustained capacity gate or has a documented scaling topology that is then benchmarked;
- HA/recovery is demonstrated for the intended production tier;
- Morocco/CNDP transfer and processor review is acceptable;
- MAD cost is measured sufficiently to feed the final per-vehicle price.

## Immediate next action

Implement B0/B1 for RabbitMQ first, dependency-isolated from the application runtime. Do not modify production schema/RLS and do not merge to main. NATS JetStream remains the comparison candidate after RabbitMQ's functional failure/replay benchmark.
