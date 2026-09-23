# Step 10E-4F B1 - local functional validation

RabbitMQ topology preflight was observed PASS: both quorum queues empty, prefetch 100,
delivery limit 3. B1.1 passed on the user's Windows PC on 2026-09-23:
5 published/confirmed, 5 unique commits/ACKs, ready=0, DLQ=0, remainingRows=0.
An independent `rabbitmqctl list_queues` check showed 0 ready, 0 unacked and
0 consumers for both queues.

This script uses a disposable, persistent local PostgreSQL 17 volume. It ignores
DATABASE_URL and .env.local, and refuses remote or non-benchmark databases. It creates
only b1.events in matelematics_b1. Successful test rows are deleted by exact run ID;
on failure it retains rows/messages for investigation. No Supabase business data is read.

From the application root, with Docker Desktop running and RabbitMQ already healthy:

```powershell
git pull --ff-only
docker compose -f scripts/benchmark/docker-compose.b1.yml up -d --wait
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-normal.ts
```

The first Docker command can download the official postgres:17 image. The database
binds only 127.0.0.1:55432. Its password is a local, disposable benchmark credential.
The volume allows future restart/replay tests; do not run `docker compose down -v`.

B1.1 expects five published, confirmed, committed and ACKed messages, with empty
main/DLQ, no redelivery and remainingRows=0. Check broker-wide unacked separately:

```powershell
docker exec matelematics-rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
```

The script's `unackedDepth: null` means it has not measured broker-wide unacked count.
B1.2 is ready for local execution after B1.1: it publishes one event, starts a
separate worker process, exits that process after delivery but before any database
write or ACK, then verifies requeue/redelivery and one commit after recovery.
Run it only when both queues are empty and there are no other consumers:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-crash-before-commit.ts
```

The worker exits with code 42 intentionally. On failure, test messages and rows
are retained for inspection; do not purge either queue or remove the Postgres volume.
B1.2 passed locally on 2026-09-23: 1 confirmed publication, 2 deliveries,
1 redelivery, 1 logical commit, 1 ACK, empty queues and 0 remaining rows.

B1.3 tests a separate worker process exiting after its PostgreSQL COMMIT but
before RabbitMQ ACK. The replay must detect the same logical event, ACK it,
and leave exactly one committed row before cleanup. Run from the application root
only when both queues are empty and there are no other consumers:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-crash-after-commit.ts
```

On failure, messages and rows are retained for inspection; do not purge either
queue or remove the PostgreSQL volume. B1.3 passed locally on 2026-09-23:
1 confirmed publication, 2 deliveries, 1 redelivery, 1 unique logical commit,
1 duplicate detected, 1 ACK and empty queues. The independent broker check
showed 0 ready, 0 unacked, 0 consumers for both queues.

B1.4 temporarily stops only the dedicated `matelematics-b1-postgres` container
after checking its Compose labels, image and healthy state. It publishes three
confirmed events during the outage, attempts a database connection, verifies
no ACK and a three-message backlog, then restarts the same container and drains
the queue with one logical commit per event. Its `finally` block attempts to
restart the benchmark database after a failure; inspect retained messages and
rows before retrying. From the application root, with both queues initially
empty and no other consumers:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-db-outage.ts
```

B1.5-B1.6 poison and broker restart scenarios remain pending. A
single local broker is not an HA or production capacity validation.

The first B1.4 run (`0c07ff4d-0ee7-47c1-9bf9-a4b65eaf422f`) on 2026-09-23
completed three confirmed publications, one failed DB connection, three commits
and three ACKs, but failed an unspecified final assertion. Both queues were
observed empty afterward, and exactly three matching rows remained. B1.4 is
**not validated**. The revised script prints each assertion and offers exact
run cleanup after checking the benchmark container identity, empty queues and
exactly the three matching rows. Never purge queues or remove the volume:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-db-outage.ts --cleanup-failed-run 0c07ff4d-0ee7-47c1-9bf9-a4b65eaf422f
```

Only after cleanup reports `PASS` should the B1.4 script be rerun to identify
whether a counter or a transient queue state caused the assertion failure.

Vercel: the `git.deploymentEnabled` branch rule in vercel.json is intended to disable
automatic deploys for this development branch in both linked projects. Check the
projects after publication; do not launch a manual deployment.
