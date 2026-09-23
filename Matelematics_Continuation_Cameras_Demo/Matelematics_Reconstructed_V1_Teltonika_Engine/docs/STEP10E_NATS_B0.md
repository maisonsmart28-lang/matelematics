# Step 10E-4F — NATS JetStream local B0 comparison setup

Status: local server preflight PASS on 2026-09-23. B0 creates no stream,
consumer, publisher, PostgreSQL connection or production resource.

The dedicated Compose project uses NATS Server 2.14.7 with JetStream enabled,
file data at `/data` on a named volume, and loopback-only client and
monitoring ports. It does not touch the existing RabbitMQ or PostgreSQL
containers or their volumes. Start from the application root on Windows:

```powershell
docker compose -f scripts/benchmark/docker-compose.nats-b0.yml up -d
```

Then run the read-only HTTP monitoring preflight:

```powershell
node scripts/benchmark/step10e-nats-b0-preflight.mjs
```

Expected result: `status: "ok"`, `serverVersion: "2.14.7"`, and a JetStream
store directory under `/data`. If another process owns localhost ports 4222
or 18222, stop and inspect instead of replacing any existing container.
Preserve the named volume between runs; do not use `down -v`.

Observed B0 result: NATS 2.14.7, JetStream enabled, file store directory
`/data/jetstream`, initially 0 memory bytes and 0 stored bytes, monitoring
on 127.0.0.1:18222 and client port 127.0.0.1:4222.

## Local B1 topology — PASS

Install the two pinned official NATS JavaScript packages from the committed
package lock, then run the topology script from the application root:

```powershell
npm install --no-audit --no-fund
node scripts/benchmark/step10e-nats-b1-topology.mjs
```

The script creates two local file-backed streams if absent: a work-queue
stream for `matelematics.local.telemetry.persist`, and an independent
quarantine stream for `matelematics.local.telemetry.failed`. It also creates
one durable pull consumer with explicit ACK, a 30-second ACK wait, a
four-delivery maximum and 100 maximum outstanding ACKs. Stream limits reject
new messages when full rather than evict existing work. It checks existing
resources and stops on an incompatible configuration; it never purges,
deletes or silently updates them. The quarantine stream currently has no
automatic handoff; it is reserved for a later, explicitly tested procedure.

Observed local topology result on 2026-09-23: primary stream on file storage,
work-queue retention and one replica; durable consumer with explicit ACK
and max-deliver 4. Primary pending=0, ACK pending=0 and quarantine stored=0.
No publish, DB commit, retry, quarantine transfer or restart has been tested
by this topology result.

## Local B1 normal flow — PASS

The next control publishes five synthetic telemetry envelopes to the local
JetStream stream and requires five publisher acknowledgements. It uses the
dedicated `matelematics_b1` PostgreSQL database, commits each unique event,
then requests a server-confirmed JetStream ACK. It checks empty stream and
consumer state before publishing; on success it removes only this run's
five DB rows. On failure it retains DB rows and unacknowledged messages:

```powershell
node scripts/benchmark/step10e-nats-b1-normal.mjs
```

Do not repeat an incomplete run or purge streams. Inspect the durable
consumer, stream and local DB first; a dedicated recovery path will follow.

Observed local B1 normal result on 2026-09-23 (run
`6c0f7ca4-cbb0-45ef-af4a-96a688dcc2f4`): five published/confirmed,
five deliveries, five unique commits and server-confirmed ACKs. Primary
pending=0, ACK pending=0, quarantine=0 and benchmark rows=0 after cleanup.

## Crash before DB commit — PASS

The next isolated control publishes one synthetic message with a JetStream
confirmation. A separate worker receives it, then exits before any DB
query or ACK. The durable consumer must redeliver it after its configured
30-second ACK wait; the parent commits once and requests a confirmed ACK:

```powershell
node scripts/benchmark/step10e-nats-b1-crash-before-commit.mjs
```

This test can wait about 30 seconds for redelivery. If it reports
`incomplete`, stop and inspect the stream, consumer state and rows for its
run ID. The message remains in JetStream; do not purge or repeat blindly.

Observed local result on 2026-09-23 (run
`b000a267-5e96-4be5-8da2-e2988e7c03ef`): one publication/confirmation,
two deliveries including one redelivery, one unique commit and one
confirmed ACK after recovery in 30,057 ms. Primary pending=0, ACK
pending=0, quarantine=0 and benchmark rows=0 after cleanup. The Node
module-type warning in the output did not affect this result.

## Crash after DB commit, before ACK — awaiting local result

The complementary control commits one message inside a separate worker,
then exits before JetStream receives an ACK. The parent checks that the row
already exists, waits for the durable consumer's redelivery and verifies
that the replay detects the existing row and ACKs it without a second
logical commit:

```powershell
node scripts/benchmark/step10e-nats-b1-crash-after-commit.mjs
```

The ACK wait again makes this test take about 30 seconds. If it reports
`incomplete`, inspect the stream, consumer and local DB before any repeat;
do not purge the message or remove the database volume.

## Contract for B1 and B2 implementation

- File-backed stream and durable pull consumer; declare exact subjects,
  retention, resource limits, replicas=1 for the local control, explicit
  ACK policy, bounded max-deliver and ACK wait/backoff.
- Use an idempotent `message_id` with the same synthetic envelope as
  RabbitMQ. Confirm publish before counting ingress. Commit to the
  dedicated `matelematics_b1` PostgreSQL database before ACKing JetStream.
- Compare crash-before-commit, crash-after-commit, DB outage, permanent
  validation failure, broker restart, and controlled throughput with the
  RabbitMQ measurements. Preserve evidence on failures.
- JetStream max-deliver does not automatically move a poison message to a
  DLQ; a separate explicit quarantine procedure and validation are needed.
  Do not assume that the RabbitMQ DLX/DLQ semantics apply.
- Keep monitoring local: the NATS monitoring endpoint does not require
  authentication in this control setup. Single-node B0/B1 is not HA.

Upstream references:

- https://docs.nats.io/learn/monitoring/monitoring-endpoints
- https://docs.nats.io/reference/system/monitor/jsz
- https://docs.nats.io/using-nats/developer/develop_jetstream/consumers
- https://github.com/nats-io/nats-server/releases/tag/v2.14.7
