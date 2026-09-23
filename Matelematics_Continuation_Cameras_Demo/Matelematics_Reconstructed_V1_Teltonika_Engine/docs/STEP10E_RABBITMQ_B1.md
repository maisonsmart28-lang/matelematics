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

B1.4 passed locally on 2026-09-23 after awaiting broker consumer removal:
3 published/confirmed, 1 failed DB attempt, peak backlog 3, 4 deliveries,
1 redelivery, 3 unique commits/ACKs, ready=0, DLQ=0, remainingRows=0.
An independent `rabbitmqctl list_queues` check showed 0 ready, 0 unacked,
0 consumers for both queues.

B1.5 publishes one invalid synthetic envelope and one healthy event to the
local quorum queue. The invalid event is retried within a hard bound; the
broker's delivery limit must move it into the DLQ with a `delivery_limit`
reason. The healthy event must commit and ACK. The script checks the DLQ
message identity and requeues it after inspection; **it intentionally leaves
the poison message in the DLQ**. Run with initially empty queues and no
other consumers:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-poison.ts
```

Inspect the result before any explicit DLQ cleanup. Do not purge the queue.
B1.6 broker restart remains pending.

The first B1.5 run (`8234335e-7e64-48d5-bbc4-3367a1dcb98d`) stopped safely
after six poison deliveries with 0 commits/ACKs. Both confirmed events remain
ready in the main queue; DLQ is empty. RabbitMQ's current quorum documentation
states that AMQP 0-9-1 `basic.nack` with requeue does not increment the
delivery-failure count, whereas `basic.reject` does. The revised script uses
bounded rejects, holds both initial messages to process the healthy event
without starvation, and offers a resume mode that checks exactly these two
messages and republishes nothing:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-poison.ts --resume-failed-run 8234335e-7e64-48d5-bbc4-3367a1dcb98d
```

The resume result is `RECOVERY_PASS` only if the healthy event commits/ACKs,
the poison reaches the DLQ with a delivery-limit reason, and the healthy row
is cleaned. Leave the poison message available for inspection.

B1.5 recovery passed on 2026-09-23: the healthy event committed and ACKed,
the poison reached the DLQ with reason `delivery_limit`, main ready=0,
DLQ ready=1, and remainingRows=0. The independent broker check showed
main ready=0/unacked=0/consumers=0 and DLQ ready=1/unacked=0/consumers=0.
The original two publications were confirmed in the earlier run; a new clean
single-run B1.5 execution was not performed. Keep the DLQ evidence intact.

B1.6 publishes three durable confirmed events, stops and starts only the
`matelematics-rabbitmq` Docker container, then verifies that all three events
and the retained B1.5 DLQ message survive. It commits/ACKs the healthy events,
checks the exact DLQ identity and leaves the poison untouched. It requires
the main queue empty and exactly this one DLQ message before starting. Run
from the application root while the local benchmark PostgreSQL is healthy:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-broker-restart.ts 8234335e-7e64-48d5-bbc4-3367a1dcb98d:poison
```

On failure, the script attempts to restart the broker and retains messages
and benchmark DB rows. Do not purge either queue or remove any Docker volume.
A single local broker restart does not demonstrate high availability.

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

The second run (`2b73b7f6-e59b-4d7c-8e16-a7fda9a111c4`) confirmed three
publications and a failed DB connection, then stopped at the immediate backlog
assertion before any commit or ACK. RabbitMQ subsequently showed all three
messages ready, with zero unacked/consumers; the benchmark DB was healthy.
This is consistent with an asynchronous broker requeue, but the immediate
queue count was not printed. The revised script waits up to ten seconds and
prints backlog counters if the assertion still fails. Recover ONLY this retained
run, without republishing, after confirming three ready messages and no other
consumers:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-db-outage.ts --recover-failed-run 2b73b7f6-e59b-4d7c-8e16-a7fda9a111c4
```

The recovery command verifies message IDs, persistence, benchmark DB identity,
empty prior rows and exact queue depth before consuming. It deletes only its
three rows after successful commits/ACKs and empty queue checks. A successful
recovery is evidence for draining this backlog; the full B1.4 run must still
pass independently.

Recovery of that run passed: 3 commits, 3 ACKs, empty queues, 3 rows cleaned.
The subsequent full run (`816a3ada-b87b-43a6-bdd5-0ef62ea065f5`) recorded
3 confirmed publications, 1 failed DB attempt, 4 deliveries, 1 redelivery,
3 commits and 3 ACKs. Its final check found ready=0, DLQ=0 and all 3 rows,
but `consumers=1` immediately after channel close. This is the sole failed
assertion. The revised script waits up to ten seconds for ready=0 and
consumers=0; it still fails and retains evidence if a consumer remains.
After separately verifying both queues have no ready/unacked messages or
consumers, remove only that run's matching rows with:

```powershell
npx --no-install tsx scripts/benchmark/step10e-rabbitmq-b1-db-outage.ts --cleanup-failed-run 816a3ada-b87b-43a6-bdd5-0ef62ea065f5
```

Vercel: the `git.deploymentEnabled` branch rule in vercel.json is intended to disable
automatic deploys for this development branch in both linked projects. Check the
projects after publication; do not launch a manual deployment.
