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

## Local B1 topology — awaiting local result

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
