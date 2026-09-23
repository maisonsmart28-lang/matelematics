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

## Bounded local batch experiment

The optional `--batch-size=20` groups up to 20 messages per worker into
one PostgreSQL transaction. A partial group is flushed after at most 10 ms.
All individual ACKs follow the group's successful commit; a failed or
conflicting insert leaves the group's messages unacknowledged for inspection.
The default `--batch-size=1` preserves all previous cells. The batch option
is restricted to the same four-worker, 10,000-event burst profile so its
measurements can be compared with the previous run:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-batch.selftest.ts
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-pilot.ts --count=10000 --rate=778 --workers=4 --burst-rate=2000 --batch-size=20
```

Run the selftest first. Before starting the pilot, ensure Docker containers
are healthy, the main queue and benchmark table are empty, and DLQ still
contains exactly the retained poison event. If the pilot reports incomplete,
stop and inspect its queue/DB evidence; do not rerun or purge. Compare
post-producer drain, backlog, p95 and producer rate. One successful local
batch run alone cannot establish the sustained 1,556/s gate.

The first local batch run passed on 2026-09-23 (run
`8c0fd910-7f63-436f-8026-776e4f4e85b8`). Its 2,000/s burst was observed
at 1,999.09/s. All 10,000 publications, confirmations, unique commits and
ACKs matched, without redelivery or duplicate delivery. Main ready=0,
DLQ=1, remaining benchmark rows=0. Comparable single-run observations:

| Four workers, same burst | Batch 1 | Batch 20 |
| --- | ---: | ---: |
| Overall producer rate | 1,228.64/s | 1,228.49/s |
| Overall DB drain | 798.09/s | 1,228.28/s |
| Peak pending | 3,676 | 85 |
| Pending at producer completion | 3,612 | 18 |
| Post-producer drain | 4,401 ms | 15 ms |
| Oldest pending | 4,447 ms | 30 ms |
| End-to-end p95 | 4,422.77 ms | 25.49 ms |
| DB p95 | 6.40 ms | 18.19 ms |

Batching improved latency and backlog substantially for this paced local
profile, while each batch took longer to commit than an individual event.
The batch run's 1,195.54/s post-producer rate is based on only 18 pending
events and 15 ms: it is too short to estimate maximum DB drain. Likewise,
the 1,228.28/s overall DB rate is bounded by the test's producer pacing.
Repeat comparable cells and add a bounded capacity test whose input exceeds
1,556/s for long enough to observe sustained drain and backlog behavior.
Verify batch replay after a commit/ACK interruption before treating this
experimental worker as production ready. The twofold capacity gate remains
unproven; no production or HA result follows from the local pilot.

## Bounded sustained input cell — awaiting local result

The next cell sends exactly 20,000 synthetic events at a paced 2,000/s
for about 10 seconds using four workers and batch size 20. This is a
separate controlled configuration; the earlier options remain bounded.
It reports pending events halfway through publication, at the end, and at
peak, plus observed publication/DB rates and the time needed to drain.
Run only after the main queue and benchmark table are empty, no other
consumers exist, and the one retained DLQ event is present:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-pilot.ts --count=20000 --rate=2000 --workers=4 --batch-size=20
```

If the result is incomplete, inspect first and keep all evidence. The
recovery tool now accepts a fully published 20,000-event run with an exact
UUID and `--count=20000`; it refuses a partial publication or inconsistent
DB/queue identities. Never start another load cell over an incomplete run.
Passing this one 10-second cell only qualifies the configuration for
repeated and longer tests of the sustained 1,556/s decision rule.

The first sustained-input local cell passed on 2026-09-23 (run
`04cc67fe-9af1-4d9f-96f0-96a6bb0ed475`): 20,000 published and confirmed
in about 10 seconds, 20,000 unique commits and ACKs, no redeliveries or
duplicates. Observed producer rate was 2,000.08/s and overall DB drain was
1,996.69/s. Pending at halfway was 29, pending at producer completion 39,
peak pending 102, and post-producer drain took 28 ms. Oldest pending was
31 ms, end-to-end p95 was 27.64 ms, main ready=0, DLQ=1 and remaining
benchmark rows=0. The sampled ready peak was 0; pending counts include
unacknowledged deliveries and are the stronger backlog indicator here.

This local 10-second observation exceeds the numerical 1,556/s twofold
target while keeping pending work low. The 1,371.93/s post-producer metric
uses just 39 events and 28 ms, so it is not a useful steady-capacity
estimate. Repeat the same cell under comparable conditions, extend the
duration with a separately bounded protocol, and test batch replay across
commit/ACK interruption before considering the sustained-capacity decision.
It does not establish HA, cloud placement, cost or production readiness.

The repeat cell also passed locally on 2026-09-23 (run
`25462cf5-1c3c-4d06-a4fb-a3d4b7d6d5bb`): 1,999.95/s observed producer
rate, 1,995.38/s observed DB drain, 20,000 unique commits and ACKs, zero
duplicates or redeliveries. Pending at halfway was 43, at producer end 37,
peak 144; post-producer drain took 35 ms. Oldest pending was 65 ms and
end-to-end p95 was 28.98 ms. Main ready=0, DLQ=1, remaining rows=0.
Both 10-second local cells stayed above the 1,556/s numerical target with
small pending work. A longer sustained run and failure/replay validation
remain before any capacity or production decision.

## Batch replay after commit, before ACK — awaiting local result

The isolated 20-event test publishes with confirms, commits one batch in a
separate worker, exits that worker before any ACK, then validates 20 broker
redeliveries and 20 idempotent replay ACKs without new DB rows. It requires
an empty main queue and benchmark table and preserves the retained DLQ item:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-batch-replay.ts
```

If the result is incomplete, stop and inspect retained messages and rows;
do not purge. A passing result covers this one local crash window and does
not establish distributed failover or production reliability.

The first attempt, run `4fc083bf-7ce4-4419-a693-c0beacc86f04`, retained
evidence after its final assertion failed: 20 publisher confirmations and
20 recovery ACKs were reported. Independent read-only inspection then found
main ready=0/unacked=0/consumers=0, DLQ ready=1, and exactly 20 unique
rows for this run. This is **not yet a PASS**: the assertion did not record
which field failed. The script now waits up to 10 seconds for broker queue
and consumer counters to settle and prints each assertion field on failure.
No message was purged. The targeted cleanup script verifies the local DB,
idle queues, retained DLQ and all 20 synthetic row identities before
deleting exactly that run's rows:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b2-batch-replay-cleanup.ts 4fc083bf-7ce4-4419-a693-c0beacc86f04
```

Run cleanup only after verifying the queue and DB evidence above. A new
replay test may be run only if cleanup reports PASS and the benchmark DB is
empty. If any check differs, stop and preserve the evidence.
