# Step 10E-4F Phase B0 — RabbitMQ benchmark architecture

Status: FROZEN FOR B1 IMPLEMENTATION

## Scope

This document freezes the RabbitMQ configuration and message contract for the zero-cost B1 functional failure/replay benchmark. It does not approve RabbitMQ for production and does not modify Supabase schema, RLS or policies.

## Topology

Producer / Teltonika ingestion
-> durable direct exchange `matelematics.telemetry`
-> durable quorum queue `matelematics.telemetry.persist`
-> persistence workers
-> PostgreSQL HOT telemetry path

Failure path:
`matelematics.telemetry.persist`
-> bounded retry / redelivery policy
-> durable dead-letter exchange `matelematics.telemetry.dlx`
-> durable quorum queue `matelematics.telemetry.dlq`

RabbitMQ quorum queues are selected for the production-oriented benchmark because the target semantics require replicated durable queue behavior and explicit acknowledgement. B1 may run a single local RabbitMQ node to validate semantics; that local run is not an HA proof.

## Producer contract

1. Publish persistent telemetry messages.
2. Use publisher confirms.
3. A tracker/ingestion event is considered accepted by the queue layer only after RabbitMQ confirms the publish.
4. A publish failure or confirm timeout is surfaced as an ingestion/queue failure; it must not be silently counted as accepted.
5. Message identity is deterministic and carried end-to-end.

## Message envelope

Required fields:

```json
{
  "message_id": "<deterministic unique id>",
  "schema_version": 1,
  "company_id": "<uuid>",
  "vehicle_id": 123,
  "device_id": "<device id or null>",
  "recorded_at": "<ISO-8601>",
  "received_at": "<ISO-8601>",
  "source": "teltonika",
  "payload": {},
  "attempt": 0
}
```

`message_id` is the idempotency identity for the queue-to-database operation. B1 must prove that a redelivered message does not create a second business event.

## Consumer / ACK contract

Workers use manual acknowledgement.

For each delivery:
1. validate envelope;
2. derive the deterministic persistence/idempotency key;
3. attempt PostgreSQL transaction/write;
4. only after successful commit, send RabbitMQ ACK;
5. if the DB operation fails transiently, do not ACK as successful;
6. retry/redelivery remains bounded;
7. permanent or exhausted failures go to DLQ/quarantine with diagnostic metadata.

ACK-before-commit is forbidden.

## Idempotency requirement

RabbitMQ provides at-least-once delivery semantics for this design; duplicate delivery is expected during crash/recovery scenarios.

B1 must therefore demonstrate application-level idempotency. The benchmark must not add or change the production telemetry schema merely to make the test pass. Use an isolated benchmark persistence target or deterministic benchmark guard appropriate to the harness. Any production schema/index change required later must be separately reviewed.

Required assertion:

`logical events committed == unique message_id values expected`

A worker crash after DB commit but before ACK must redeliver the message and the replay must not create a second logical event.

## Retry and DLQ policy

B1 uses bounded attempts, default maximum 3 delivery attempts for the harness.

Transient examples:
- temporary PostgreSQL connectivity failure;
- worker process termination before ACK;
- temporary queue consumer interruption.

Permanent examples:
- invalid envelope;
- payload that cannot satisfy the persistence contract after bounded attempts.

After the configured limit, route to `matelematics.telemetry.dlq`. DLQ messages are never silently deleted by the benchmark. The test records DLQ depth and message identity.

Do not implement an uncontrolled immediate requeue loop.

## Worker concurrency / prefetch

Initial B1:
- 1 worker for deterministic failure tests;
- manual ACK;
- prefetch 100 for functional tests.

Throughput B2 will benchmark controlled worker/prefetch combinations separately. Increasing concurrency is not assumed to increase capacity; Phase A already demonstrated non-monotonic DB scaling.

## Required B1 scenarios

### B1.1 Normal delivery
Publish a deterministic set, receive, commit, ACK.
Expected: all unique logical events committed; ready=0; unacked=0; DLQ=0.

### B1.2 Worker crash before DB commit
Terminate worker after delivery and before commit/ACK.
Expected: message remains/redelivers after worker restart; exactly one logical event after successful recovery.

### B1.3 Worker crash after DB commit before ACK
Commit, intentionally terminate before ACK.
Expected: RabbitMQ redelivers; idempotency prevents duplicate logical event; final ACK succeeds.

### B1.4 PostgreSQL unavailable
Force benchmark DB write failure while queue remains available.
Expected: producer can continue within configured queue/storage limits; backlog grows visibly; no successful ACK for failed writes; after DB recovery workers drain backlog.

### B1.5 Permanent poison message
Publish deterministic invalid benchmark message.
Expected: bounded attempts then DLQ; healthy messages continue; poison message remains inspectable.

### B1.6 RabbitMQ restart
Publish confirmed durable messages, stop/restart local broker, restart worker.
Expected: durable queued messages remain available and drain after recovery.

## Metrics

Every scenario must report:
- published;
- publisher-confirmed;
- consumed deliveries;
- redeliveries;
- unique logical commits;
- duplicate deliveries detected;
- failed DB attempts;
- ACK count;
- retry count;
- DLQ count/depth;
- ready depth;
- unacked depth;
- peak backlog;
- oldest queued age where available;
- recovery/drain time;
- cleanup status.

## Safety

- B1 is local/development only.
- No production deployment.
- No merge to `main`.
- No Supabase RLS/policy/schema modification.
- Credentials stay server-side.
- Benchmark messages use explicit benchmark markers.
- Database residue cleanup is mandatory.
- RabbitMQ test resources must use Matelematics-specific names.
- Do not weaken TLS verification as a production solution.
- Do not run blind dependency upgrades or `npm audit fix --force`.

## Installation strategy for B1

Prefer an isolated RabbitMQ container for the local benchmark so RabbitMQ/Erlang are not installed into the application runtime and can be removed cleanly. Docker availability must be checked before choosing the exact local command.

The application benchmark client dependency must also be isolated/minimal and security-reviewed before addition. No dependency is added in B0.

## B0 exit decision

B0 is complete when this contract is accepted as the implementation baseline.

Frozen decisions:
- RabbitMQ first candidate;
- direct exchange;
- durable quorum persistence queue;
- persistent messages + publisher confirms;
- manual consumer ACK strictly after DB commit;
- at-least-once delivery with application idempotency;
- bounded retry, default 3 attempts;
- durable DLQ;
- initial functional prefetch 100;
- six mandatory failure/recovery scenarios;
- no production schema/RLS change for the benchmark.

Next: B1 local functional failure/replay implementation, beginning with a local runtime availability check before installing or adding anything.
