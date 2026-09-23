# Step 10E-4F B2 — bounded local RabbitMQ throughput pilot

Status: ready for local execution; no throughput measurements recorded yet.

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
publisher, waits for individual publisher confirms, persists each event in
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
