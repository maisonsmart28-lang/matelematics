# Step 10E-4F B2 — bounded local RabbitMQ throughput pilot

Status: initial local control passed; baseline rate not yet reached.

On 2026-09-23, the 1,000-event control at 200/s passed: 199.21 published/s,
199.48 committed/s, peak pending 3, p95 end-to-end 10.75 ms, 0 retries,
0 duplicates, main queue empty, DLQ unchanged at 1, and 0 remaining DB rows.
The first 5,000-event attempt requested 778/s and passed integrity checks,
but observed only 199.95 published/s and 200 committed/s. It waited for a
publisher confirmation **after each individual message**, which serialized
the producer and invalidated that run as a 778/s load test. No RabbitMQ
capacity conclusion follows from that run.

The revised script pipelines individual publisher confirmations with a
bounded default window of 128 unconfirmed messages. It still verifies all
5,000 confirmations before reporting PASS. The window can be adjusted with
`--confirm-window=N` (1–512); report it alongside observed producer and
confirmed rates. Rerun the 778/s cell before proceeding to a burst.

This diagnostic pilot defaults to one consumer and PostgreSQL client against
the dedicated local B1 database and the existing RabbitMQ quorum queue. It
does not read Supabase business data or modify production schema/RLS. It
requires the main queue empty, no consumers, no benchmark rows, and exactly
the one retained B1.5 poison message in the DLQ. It never consumes the DLQ.

From the application root, with Docker Desktop and the benchmark containers
healthy, start with the bounded 1,000-event control at 200 events/s:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-pilot.ts
```

Only after the control passes, use the Phase A baseline rate for a local
5,000-event pilot:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-pilot.ts --count=5000 --rate=778
```

The script allows 100–10,000 events and 10–2,000 events/s. It paces the
publisher, processes individual publisher confirms asynchronously, persists each event in
the isolated local PostgreSQL database, and ACKs only after commit. It
reports observed producer and DB drain rates, sampled ready depth,
published-minus-ACKed peak, oldest outstanding message age, post-producer
drain time and p50/p95/max DB and end-to-end latencies. It checks exact
counts, no redelivery/duplicates, an empty main queue and the retained DLQ
depth. Successful rows are deleted by run ID; on failure both rows and
messages are kept for investigation. Never purge the queues or remove the
PostgreSQL volume to recover from a failed run.

Do not interpret this single local process, broker and DB as production
capacity, HA, Infomaniak performance or MAD cost. Later B2 steps must add
the controlled 2,000/s burst and controlled worker/prefetch combinations,
repeat comparable runs, and benchmark NATS JetStream on equivalent semantics.
Cloud B3 work requires explicit authorization and a Morocco/CNDP review.

## Interrupted local run — inspect and recover before any new benchmark

A later run `af93dc2d-a37b-454f-8a62-510245913c3b` was found with
3,584 matching rows in `b1.events` and 1,416 ready RabbitMQ main-queue
messages (0 unacked, 0 consumers); DLQ retained its prior one poison.
The next pilot refused to publish because rows remained. Do not infer the
original target rate or publisher-confirm count from the 5,000 persisted/
queued messages, and do not purge the queue or delete rows manually.

The targeted recovery script checks the benchmark DB identity, all existing
row identities and envelopes, that DB rows plus ready depth equal exactly
5,000, empty consumer counts and unchanged DLQ depth. It then validates each
queued message before DB commit and ACK, verifies all 5,000 logical IDs and
cleans only this run's rows on success. It publishes nothing:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-recover.ts af93dc2d-a37b-454f-8a62-510245913c3b
```

Only after recovery reports `PASS` should the paced 778/s cell be rerun with
the pipelined-confirm version of the pilot.

That interrupted run was recovered: 1,416 deliveries/ACKs completed the
previous 3,584 rows to 5,000 unique commits, main ready=0, DLQ=1 and
remainingRows=0. It provides no measurement of its original producer rate.

## Pipelined baseline and controlled worker count

A clean 5,000-event run on 2026-09-23 reached 778.09 published/s and
777.29 confirmed/s with 128 maximum unconfirmed (17 observed), all 5,000
unique commits/ACKs, zero retries or duplicates. One worker drained at
255.27 commits/s. Pending messages peaked at 3,470, the ready queue at
3,364; post-producer drain took 13,172 ms, end-to-end p95 was 12,503.35 ms.
Main ready=0, DLQ=1 and remainingRows=0 at completion.

The incoming baseline is demonstrated locally, but one worker cannot sustain
the 778/s input: its DB drain is 255.27/s. The Phase A/B decision rule
requires sustained DB drain >= 2 × 778/s (1,556/s) for this tier, alongside
bounded/draining backlog. Do not run the planned 2,000/s burst as a capacity
claim with the one-worker configuration.

The pilot now supports `--workers=N` with 1–4 isolated PostgreSQL connections
and RabbitMQ consumer channels. The control connection still owns the run
lock and performs final assertions. Compare the same 5,000-event 778/s cell
with **two workers first**, only when the main queue is empty, no other
consumers are active, benchmark rows are absent and the retained DLQ depth is 1:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-pilot.ts --count=5000 --rate=778 --workers=2
```

After inspecting two-worker results, a four-worker cell may be justified.
Increasing concurrency is a measured experiment: it is not assumed to
improve PostgreSQL throughput or the 2× capacity gate. Batch persistence,
repeatability and the controlled burst remain separate B2 work.

Both additional 5,000-event local runs passed all identity/ACK/cleanup checks
on 2026-09-23. These are single observations with the same 778/s input:

| Workers | Published/s | DB observed/s | Peak pending | Post-producer drain | End-to-end p95 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 778.09 | 255.27 | 3,470 | 13,172 ms | 12,503.35 ms |
| 2 | 778.10 | 465.99 | 2,145 | 4,315 ms | 4,151.69 ms |
| 4 | 778.23 | 741.91 | 256 | 324 ms | 322.82 ms |

The four-worker run observed peak ready=0, but published-minus-ACKed pending
reached 256 (including in-flight deliveries); peak ready is sampled every
200 ms and can miss short-lived ready depth. Four workers approached the
778/s input, but the paced test does not measure maximum drain capacity.
The 1,556/s (2×) gate remains unproven.

## Controlled local burst after the four-worker baseline

The next bounded cell reuses Phase A's 778/s base rate and a 2,000/s burst
starting at 3 seconds for 3 seconds, then returns to 778/s until exactly
10,000 events are sent. It requires four workers and 128 unconfirmed-message
window by default. The script refuses arbitrary burst shapes in this pilot:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-pilot.ts --count=10000 --rate=778 --workers=4 --burst-rate=2000
```

The output separates the observed burst publication rate from the overall
producer rate and adds the backlog at producer completion and the DB drain
rate during that post-producer backlog. A `PASS` requires every logical
commit/ACK and at least 95% of the requested burst rate; if publication
misses the rate, it reports `INTEGRITY_PASS_RATE_MISSED` and cleans successful
test rows. The queue must be empty before the run; the existing single
poison message in DLQ remains untouched. Do not treat a local burst as proof
of the 2× sustained-capacity gate or high availability.

The bounded burst passed locally on 2026-09-23 (run
`46bb1bb2-b174-4df7-b78b-8b2d96a17cbb`). The observed burst publication
rate was 1,998.44/s against the requested 2,000/s; 10,000 publications,
confirmations, unique commits and ACKs matched, with zero redeliveries or
duplicate deliveries. The overall producer rate was 1,228.64/s. Peak pending
reached 3,676 and sampled ready depth reached 3,271. At producer completion,
3,612 messages remained pending; draining that backlog took 4,401 ms, or
820.70 commits/s. End-to-end p95 was 4,422.77 ms. Main ready=0, DLQ=1
and benchmark rows=0 after cleanup.

The broker accepted the short publication burst and the backlog drained,
but four workers did not keep pace during it. The measured post-producer
drain of 820.70/s is below the 1,556/s twofold baseline target. These
single-node observations cannot establish sustained DB capacity; the B2
twofold gate remains unmet. Next, measure repeated comparable runs and
investigate bounded transaction batching while preserving unique event IDs,
commit-before-ACK and failure recovery. Keep the retained poison message
in the DLQ; do not purge it.
