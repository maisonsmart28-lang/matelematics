# Step 10E-4F — local queue comparison, 2026-09-23

## Completed local controls

RabbitMQ quorum queues and NATS JetStream file-backed streams both passed
the isolated B1 normal, crash before/after PostgreSQL commit, database
outage, permanent invalid message, broker restart and no-duplicate logical
commit controls. RabbitMQ routed the poison to a broker DLQ; the NATS
harness explicitly published and confirmed a quarantine record before
ACKing the source. Both retained entries remain available for inspection.

Each B2 result below used the same dedicated local PostgreSQL 17 database,
four workers, batches of 20 synthetic events, 2,000 paced publications/s
and confirmed publishing. Brokers and clients differ, so these are local
harness results rather than a broker-only comparison. NATS used a 512
publication confirmation window; RabbitMQ used 128. NATS confirmed
JetStream ACKs per batch, whereas the RabbitMQ harness issued manual ACKs
after each committed batch without synchronous broker ACK confirmation.

| Bounded local control | RabbitMQ | NATS JetStream |
| --- | ---: | ---: |
| 20,000 messages, other broker stopped: producer | 1,999.85/s | 1,999.65/s |
| 20,000 messages, other broker stopped: commit/ACK drain | 1,998.99/s | 1,999.01/s |
| 20,000 messages, other broker stopped: peak pending | 5,405 | 696 |
| 20,000 messages, other broker stopped: end to end p95 | 2,946.16 ms | 319.07 ms |
| 60,000 messages: producer | 1,999.99/s, earlier control | 1,999.95/s, isolated control |
| 60,000 messages: commit/ACK drain | 1,999.47/s, earlier control | 1,933.90/s, isolated control |
| 60,000 messages: pending checkpoints at 20k/40k/60k | 33 / 45 / 55 | 60 / 60 / 60 |
| 60,000 messages: peak pending | 140 | 1,993 |

RabbitMQ's 60,000-message cell ran before the NATS local setup was added;
its end to end p95 was 29.89 ms. It therefore reflects a different
local load condition from the later isolated NATS run. Running both brokers during
later 20,000-message cells coincided with lower measured drains (RabbitMQ
1,632.38/s and NATS about 1,125/s). Stopping the other broker coincided
with recovery toward 2,000/s. This supports testing resource contention
and does not identify the exact shared host or PostgreSQL bottleneck.

## Local conclusion and remaining gates

- **B1 reliability controls: PASS** for both local single-node harnesses.
- **B2 10,000-vehicle numerical gate of 1,555.56/s: met** by bounded local
  runs for both. The isolated NATS 30-second run's overall commit rate
  was 1,934.59/s, below its 2,000/s producer pace but above this gate.
- **2,000/s with low latency and bounded peaks: conditional.** Both
  isolated pilots showed transient backlog in later controls; the local
  results vary with host conditions and are not a fleet capacity rating.
- **Production selection: pending.** No multi-node HA/failover, Swiss
  production-like network/storage test, cost in MAD, encryption/storage
  configuration audit, or Morocco/CNDP transfer review has been completed.
  The 50k and 100k vehicle capacity gates remain untested.

Detailed scripts, run IDs, recovery rules and complete output metrics:
`STEP10E_RABBITMQ_B1.md`, `STEP10E_RABBITMQ_B2_PILOT.md`,
`STEP10E_NATS_B0.md` and `STEP10E_QUEUE_PHASE_B.md`.

The next engineering decision is whether to profile shared local CPU,
disk and PostgreSQL contention further or advance the selected candidate
to authorized production-like HA and cost validation. Neither local
broker is approved for production from these measurements alone.
