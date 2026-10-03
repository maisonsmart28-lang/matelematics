# Native ingestion readiness — 2026-10-03

## Verified in the fresh recovery laboratory
- Actual temporary PostgreSQL LOGIN inheriting matelematics_ingest_native, without superuser or RLS bypass.
- Real packet persistence and alert creation/resolution; duplicate replay; late failure rolls back writes.
- Nine forbidden operations rejected with SQLSTATE 42501.
- Fixtures, temporary LOGIN, ingestion role, ten policies and unique index removed.
- Effective SECURITY DEFINER function inventory: zero callable functions in non-system schemas with schema USAGE. Transaction rolled back.

These results apply to the repaired recovery snapshot. They do not certify production ACLs or arbitrary future function grants.

## Versioned migration preparation
Create the filename using Supabase CLI migration new, then copy the reviewed body from scripts/security/teltonika-native-schema-apply.sql into that newly created file.
Do not apply or push it to the linked remote project at this stage.
The migration creates the NOLOGIN ingestion group, ten policies, column grants and fingerprint uniqueness index. It does not create the server LOGIN or enable atomic mode.
The reviewed rollback body is scripts/security/teltonika-native-schema-revert.sql. Before rollback, stop ingestion and remove LOGIN membership and any additional dependencies; the script refuses a group with members. Rollback does not delete telemetry.

## Open gates
- Review actual target database ACLs, PUBLIC grants and function execution surface.
- Validate the versioned migration on a disposable database, including rollback.
- Reconcile historical fingerprint rows and duplicates before creating the unique index.
- Provision server LOGIN and verified TLS connection separately; rotate/store credentials.
- Validate real server deployment, TCP traffic, hardware, load, monitoring and recovery.
- Off-machine encrypted backup copy remains pending.
No production mutation or hosting performed.
