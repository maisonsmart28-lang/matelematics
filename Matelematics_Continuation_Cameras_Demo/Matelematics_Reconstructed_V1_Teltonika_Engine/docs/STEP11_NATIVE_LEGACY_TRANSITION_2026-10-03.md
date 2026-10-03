# Legacy Teltonika transition — 2026-10-03

Recovery snapshot inventory: 35,065 Teltonika telemetry rows; 23,203 without fingerprint; 11,862 with valid fingerprint; zero native-v1 markers; zero duplicate fingerprint groups. Missing-fingerprint rows are outside the proposed unique index and are not certified duplicate-free.

Code review: legacy mode inserts position, inserts telemetry with fingerprint, processes alerts, then updates device. These are separate operations. A telemetry row and fingerprint do not establish successful completion of alerts. Existing legacy duplicate handling skips alert processing.

Decision: no automatic native-v1 promotion, historical deletion or invented fingerprint. Current atomic replay rejection LEGACY_INGEST_RECONCILIATION_REQUIRED remains intentional until a reviewed transition is implemented. The quality inventory reads metadata only; position_persisted reports an old operation, not independently verified position consistency or alert completion.

Remaining transition work:
- Reconstruct fingerprints only where the original canonical inputs can be recovered exactly and compare against known fingerprinted samples.
- Specify an explicit handling path for legacy replays and a durable reconciliation record, separate from native-v1 transaction proof.
- Define historical alert handling without replaying old events into the current live alert state.
- Test native, legacy, missing-input and collision cases before enabling atomic mode.
- Repeat inventory on the actual target database before migration; the recovery snapshot is older than production.
No mode change, backfill or remote database mutation performed.
