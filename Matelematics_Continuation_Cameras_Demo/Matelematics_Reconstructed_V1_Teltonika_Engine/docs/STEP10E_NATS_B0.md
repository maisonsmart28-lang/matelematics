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

## Crash after DB commit, before ACK — PASS

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

Observed local result on 2026-09-23 (run
`689d2a34-ba3a-46b4-a46c-05d6acf7560c`): one publication/confirmation,
two deliveries including one redelivery, one unique commit, one detected
duplicate delivery and one confirmed ACK. Recovery took 29,990 ms; primary
pending=0, ACK pending=0, quarantine=0 and benchmark rows=0. Together with
the pre-commit test, this demonstrates idempotent replay around both sides
of the DB commit on a single local NATS node. Permanent poison/quarantine
handling, broker restart and a comparable B2 throughput test remain open.

## Dedicated PostgreSQL outage — PASS

Run from the application directory with the dedicated RabbitMQ B1 PostgreSQL
container healthy. This control checks the exact Docker Compose identity,
stops only `matelematics-b1-postgres`, confirms three JetStream publications,
and verifies that no message is ACKed while the database is unavailable.
It restarts the same container in a `finally` block, waits for recovery and
checks three unique commits followed by three confirmed ACKs. One first
delivery is deliberately left unacknowledged, so redelivery may add about
30 seconds. The test removes only its own three rows on a complete pass:

```powershell
node scripts/benchmark/step10e-nats-b1-db-outage.mjs
```

If it reports `incomplete`, record its `runId` and inspect the NATS stream,
durable consumer, dedicated DB and Docker container before recovery. When
the container is healthy and the three messages belong to this run, the
targeted recovery command drains and ACKs them, then deletes only their
three synthetic rows:

```powershell
node scripts/benchmark/step10e-nats-b1-db-outage-recover.mjs <runId>
```

Do not purge the streams, delete the database volume, or repeat the test
over retained evidence.

Observed local result on 2026-09-23 (run
`d497e7d3-6165-4c5f-a72e-7db6b00d886e`): three publications and
confirmations, one failed database connection during the outage, backlog
of three, one redelivery, three unique commits and three confirmed ACKs.
Recovery took 30,039 ms; primary pending=0, ACK pending=0, quarantine=0,
benchmark rows=0 after cleanup. This confirms local database outage recovery
with a durable JetStream consumer; it does not measure HA.

## Poison message and explicit quarantine — PASS

The local poison control publishes a malformed envelope and a healthy one.
The healthy event must commit and receive a confirmed ACK despite the
malformed message. The poison is rejected four times using the durable
consumer's configured maximum delivery count, then copied into the separate
file backed quarantine stream. Publication is confirmed before the original
is ACKed. The script verifies the retained quarantine payload and deletes
only its healthy synthetic database row; the quarantine entry remains for
inspection. Run only when both NATS streams and the benchmark DB are clear:

```powershell
node scripts/benchmark/step10e-nats-b1-poison.mjs
```

If it reports `incomplete`, retain its run ID and inspect both streams and
the local DB before retrying; no stream is purged. The quarantine step is
explicit application logic, not an automatic JetStream DLQ.

Observed local result on 2026-09-23 (run
`d643263c-6936-4d03-b62e-ca5971e6ef6d`): two confirmed publications,
four poison deliveries including three redeliveries, one healthy commit and
one confirmed healthy ACK. Primary pending=0, ACK pending=0, rows=0;
quarantine retains exactly one message with ID
`d643263c-6936-4d03-b62e-ca5971e6ef6d:poison`. Preserve it for the
broker restart comparison.

## Dedicated NATS broker restart — PASS

This control checks the exact Compose container, its named JetStream volume
and the retained quarantine message. It publishes three confirmed messages,
stops and starts only `matelematics-nats`, then verifies the three messages
and the same quarantined payload survived. It commits the three messages to
the isolated database, confirms each ACK and deletes only its own rows.
The quarantined payload remains after the test:

```powershell
node scripts/benchmark/step10e-nats-b1-broker-restart.mjs d643263c-6936-4d03-b62e-ca5971e6ef6d:poison
```

If the control reports `incomplete`, inspect the run ID, database and both
streams before any retry; do not delete the data volume or purge streams.

Observed local result on 2026-09-23 (run
`2a4f7cc8-41d0-434b-a155-6e5c828e31b2`): three confirmed messages
survived the NATS container restart, followed by three unique commits and
three confirmed ACKs. Recovery took 1,144 ms. Primary pending=0,
ACK pending=0 and benchmark rows=0 after cleanup. The quarantine stream
still holds the exact message
`d643263c-6936-4d03-b62e-ca5971e6ef6d:poison`.

The local NATS B1 checks now cover normal processing, crashes on either
side of the DB commit, an actual DB outage, bounded poison retries with
explicit quarantine, and broker restart. The controlled B2 throughput
comparison and longer runs remain open; single-node recovery is not an
availability or HA guarantee.

## B2 batch throughput pilot — ongoing

The local B2 pilot uses four pull workers with at most 20 events per
PostgreSQL transaction, 128 or 512 concurrent publisher confirmations, and the
same synthetic envelope and dedicated database as the RabbitMQ B2 pilot.
It checks all confirmations, deliveries, commits and ACKs, keeps the
quarantine entry for inspection and deletes only its own committed rows.
Start with the bounded 1,000 message / 200 per second diagnostic cell:

```powershell
node scripts/benchmark/step10e-nats-b2-pilot.mjs --count=1000 --rate=200
```

Observed local 1,000 message / 200 per second result on 2026-09-23 (run
`0ac9c489-a690-41e2-8801-93033d0eef9b`): PASS, 1,000 confirmed and
uniquely committed, 1,000 ACKs, producer 200.18/s, DB drain 167.78/s,
end to end p95 391.43 ms and 969 ms of drain after production.
Primary pending=0, ACK pending=0, quarantine=1, benchmark rows=0.

The initial 20,000 message / 2,000 per second local run (run
`e8b52231-7d05-42c3-b9aa-c569e139620c`) returned
`INTEGRITY_PASS_RATE_MISSED`: all 20,000 publications confirmed, 20,000
unique commits and ACKs, primary pending=0, ACK pending=0, quarantine=1,
rows=0; observed producer 1,861.72/s, confirmed 1,859.34/s, DB drain
1,428.69/s, 3,261 ms of drain after production. Peak unconfirmed reached
the configured 128; peak pending=10,680. This is an integrity pass and a
rate miss. The producer confirmation window may contribute to the missed
rate, but the database also trailed production. Treat these as separate
measurements rather than inferring a capacity limit from one run.

The second local run (run `b11edaad-24e9-4599-ae10-04466e1e214e`)
increased only the confirmation window to 512. It returned PASS for
producer rate and integrity: 20,000 confirmed and uniquely committed,
20,000 ACKs, producer 1,999.76/s, confirmations 1,998.58/s, and
commit plus ACK drain 1,182.12/s. Post producer drain took 6,923 ms,
peak pending reached 12,368, end to end p95 was 7,569.45 ms; main and
ACK pending=0, quarantine=1, database rows=0. The faster producer grew
the backlog. The reported `observedDbDrainPerSec` in these earlier runs
includes ACK confirmation and therefore does not isolate DB performance.

The instrumented diagnostic run (run
`49fe298e-63f8-4f59-8a6e-e5bfa7427244`) retained the same 20,000
events, 2,000/s target, four workers, batches of 20 and 512 window.
It returned PASS for producer rate and integrity: 20,000 confirmed,
committed uniquely and ACKed; producer 1,997.24/s, commit drain
1,103.47/s and commit plus ACK drain 1,103.21/s. Transaction p50/p95
was 9.82/109.19 ms and batch ACK confirmation p50/p95 was
3.19/48.14 ms. Peak pending=12,203, end to end p95=7,163.71 ms,
post producer drain=8,120 ms; primary pending=0, ACK pending=0,
quarantine=1 and rows=0. Commit throughput was already below ingress;
confirmed ACKs did not account for most of that gap in this run.

| Local 20,000 message control | RabbitMQ, 4 workers, batch 20 | NATS, 4 workers, batch 20, window 512 |
| --- | ---: | ---: |
| Producer observed | 2,000.08/s | 1,997.24/s |
| DB commit / drain observed | 1,996.69/s | 1,103.47/s |
| Peak pending | 102 | 12,203 |
| End to end p95 | 27.64 ms | 7,163.71 ms |

The RabbitMQ pilot's reported drain window and NATS commit window use
different ACK timing, so these measurements compare the local harnesses,
not an intrinsic broker limit. NATS B1 reliability controls passed; the
current NATS B2 harness does not sustain the 2,000/s goal without backlog.
A 60,000 message NATS run is deferred while its 20,000 message backlog
grows. Profile the local PostgreSQL transactions and JetStream consumer
pull/batch scheduling before changing architecture or making a production
capacity claim. The RabbitMQ 60,000 message run did sustain 2,000/s in
the same local test setup.

To reproduce the instrumented NATS diagnostic run:

```powershell
node scripts/benchmark/step10e-nats-b2-pilot.mjs --count=20000 --rate=2000 --confirm-window=512
```

The pull profiling run (run `231fe610-aa2b-481d-a7d8-1fbebb8d4ad0`)
passed integrity and producer pacing: 20,000 confirmed, committed once
and ACKed; producer 1,999.87/s, commit drain 1,125.20/s, commit plus ACK
drain 1,123.30/s. Across 1,001 batches, average size was 19.98/20;
only five pulls were empty. Pull time to first message p50/p95 was
2.30/17.97 ms, batch completion p50/p95 was 0.74/29.21 ms, and peak ACK
pending reached 80 of 100. Transaction p50/p95 was 11.35/109.43 ms;
ACK confirmation p50/p95 was 3.87/43.66 ms. Peak pending=12,177,
post producer drain=7,810 ms, end to end p95=7,456.44 ms; stream and DB
cleared, quarantine=1. Almost full pull batches and ACK pending below the
configured limit argue against a simple batch fill or ACK pending cap.
They do not isolate local CPU, disk, broker, or PostgreSQL contention.

A same machine RabbitMQ 20,000 message control immediately afterward
(run `671eb5bb-9d1d-488b-ba3f-d67d2f0cc6fe`) also slowed relative to
its earlier near 2,000/s runs: producer 1,981.39/s, DB drain 1,632.38/s,
peak pending 5,088, post producer drain 2,174 ms, end to end p95
2,819.88 ms. All 20,000 confirmed, uniquely committed and ACKed;
main ready=0, DLQ=1, DB rows=0. This supports investigating shared
local load and test interference before attributing the entire difference
to NATS. The runs were sequential, so it does not prove which resource
caused the slowdown. Recheck under controlled container and host load.

These are single node diagnostics, not production capacity claims. If the
script reports `incomplete`, inspect its run ID, both streams and the
benchmark rows before another test; do not purge retained messages.

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
