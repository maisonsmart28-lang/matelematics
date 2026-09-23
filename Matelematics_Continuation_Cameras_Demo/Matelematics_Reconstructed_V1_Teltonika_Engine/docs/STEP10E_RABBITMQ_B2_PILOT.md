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

This diagnostic pilot runs a single consumer and PostgreSQL client against
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
