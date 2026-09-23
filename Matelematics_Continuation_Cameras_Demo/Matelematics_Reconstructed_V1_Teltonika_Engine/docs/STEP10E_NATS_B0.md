# Step 10E-4F — NATS JetStream local B0 comparison setup

Status: local server preflight prepared, not yet run. No stream, consumer,
publisher, PostgreSQL connection or production resource is created by B0.

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
