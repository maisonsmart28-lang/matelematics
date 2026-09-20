# STEP 10E — COMPLIANCE MAROC (CNDP / ANRT / CYBERSECURITE)

Status: MANDATORY PRE-PRODUCTION GATE
Date opened: 2026-09-21

This workstream is inserted before continuing production infrastructure validation. It does not replace review by Moroccan legal/compliance professionals or decisions/authorizations from competent authorities.

## 1. Legal/data-protection baseline

Matelematics can process information relating directly or indirectly to identifiable natural persons, including vehicle/driver association, GPS positions, routes, timestamps, alerts, account data and operational history. Treat these as potentially personal data unless a documented assessment establishes otherwise.

Under Moroccan Law 09-08, processing includes collection, recording, storage, consultation, use, transmission and deletion. Before production, every personal-data processing purpose must be mapped to the appropriate CNDP formality.

### Required CNDP register

For each processing activity record:
- purpose and legal/business necessity;
- controller and processor roles;
- categories of persons;
- data fields/categories;
- recipients and access roles;
- collection source;
- retention period and deletion/anonymization rule;
- security controls;
- countries and processors involved;
- CNDP declaration/authorization reference;
- foreign-transfer authorization/reference where applicable;
- procedure for access/rectification/opposition requests.

No production launch until required CNDP formalities are documented as completed/approved as applicable.

## 2. International transfers

Current development architecture uses Supabase region eu-west-3, outside Morocco. Any production component outside Morocco that receives/stores personal data must be entered in a transfer inventory: database, object storage, backups, logs, monitoring, email/notification provider, maps/geocoding and support tooling.

CNDP foreign-transfer procedure (including F118 where applicable) must be handled only after/with the underlying processing declaration or authorization as required.

Architecture rule: no new external processor containing personal data may be added without recording country, purpose, data categories, contract/security basis and CNDP transfer impact.

## 3. Data minimization and retention

HOT/WARM/ARCHIVE is now also a compliance control, not only a cost optimization.

Required:
- define retention by data class and purpose;
- avoid indefinite raw GPS retention by default;
- archive only data justified by the declared purpose;
- support verified expiry/deletion/anonymization workflows;
- preserve legally/business-required records only for documented periods;
- keep customer-visible history requirements separate from raw telemetry retention;
- log deletion/archive jobs and restoration access.

No automatic purge is enabled during Step 10 until retention rules and CNDP implications are validated.

## 4. Security and access

Existing tenant isolation/RLS work remains mandatory.

Add/verify before production:
- least privilege by Matelematics/partner/company/user role;
- server-only privileged credentials;
- encryption in transit;
- encryption/storage protections at providers;
- MFA/admin authentication strategy;
- audit trail for privileged access and sensitive exports;
- backup and restore controls;
- incident response procedure;
- processor/subprocessor inventory;
- contractual security requirements and audit/assurance evidence;
- secrets rotation procedure;
- export/download authorization controls.

## 5. Driver/employee geolocation

GPS/route/history features require a dedicated assessment when a vehicle can be associated with a driver or employee.

Before production define:
- exact purposes of geolocation;
- who can view live/history data;
- retention;
- employee/driver information/notice process;
- handling of personal/private-use periods if relevant to customer use cases;
- CNDP notification/formality applicable to the actual deployment.

Do not add covert employee-monitoring features.

## 6. ANRT equipment gate

Every tracker/radio/terminal model intended for importation, sale, distribution, advertising or connection in Morocco must be checked against the applicable ANRT approval/exemption regime before commercial deployment.

Maintain an equipment register:
- manufacturer;
- exact model/hardware revision;
- cellular/radio technologies;
- ANRT approval number or exemption evidence;
- approval status/date;
- importer/distributor;
- supporting certificate/document.

Teltonika or CE certification alone must not be treated in code/docs as proof of Moroccan ANRT approval.

## 7. Cybersecurity / DGSSI scope gate

Assess whether each customer/deployment falls within a category subject to Moroccan cybersecurity obligations, particularly public entities, infrastructures of vital importance, telecommunications/digital-service contexts or other regulated environments.

Regardless of formal scope, use Moroccan cybersecurity requirements/guidance as an input to the production security baseline where applicable.

## 8. Architecture changes required now

1. Keep production blocked until compliance gate is closed.
2. Create a data-flow map from tracker -> ingestion -> queue -> DB -> WARM -> archive -> dashboard/API -> exports/notifications.
3. Classify every stored field as personal/potentially personal/non-personal and assign retention.
4. Inventory all countries/subprocessors before final provider selection.
5. Keep raw telemetry archive partitioned by tenant/company/vehicle/date with access logging.
6. Design deletion/anonymization and data-subject request workflows before enabling retention purge.
7. Preserve tenant isolation and prohibit browser service-role/DB credentials.
8. Add ANRT approval evidence to hardware onboarding/procurement checklist.
9. Add compliance acceptance criteria to Step 14 final production audit.

## 9. Open questions that require evidence, not assumptions

- Exact Matelematics legal entity acting as controller/processor for each offer.
- Customer contract model and whether customers determine geolocation purposes.
- Driver/employee identification model.
- Final production countries for Supabase, Infomaniak, object storage, backups and observability.
- Exact CNDP declaration/authorization classification for each processing activity.
- ANRT approval/exemption status of every tracker model sold/installed.
- Any sector-specific requirements triggered by individual customers.

## 10. Exit criteria

This compliance gate is not closed until:
- data-flow and processing registers exist;
- CNDP required formalities/transfers are identified and production prerequisites documented;
- retention matrix is approved;
- technical deletion/anonymization/access controls are tested;
- subprocessors/countries/contracts are inventoried;
- ANRT status is evidenced for commercial hardware;
- cybersecurity production checklist is passed;
- unresolved legal questions are explicitly marked for CNDP/legal confirmation rather than guessed.

Production remains blocked while mandatory items are unresolved.
