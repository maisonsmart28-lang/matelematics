# Traccar local compatibility lab

This lab is for local, synthetic-data testing. It is separate from the Matelematics app database and does not connect to the production Supabase project.

## Minimum spend

- New Traccar hosting cost: **0 MAD/month** while running on the existing PC with Docker Desktop.
- Traccar software license: **0 MAD** for self-hosting.
- The compose file creates a separate local PostgreSQL database for Traccar.
- No Vercel deployment, public DNS, public IP, or internet-facing device port is needed for these simulator checks.

Do not put real customer, employee, vehicle plate, or personal route data in this test stack. The Compose credentials are deliberately simple and for local testing only; never reuse them on a public server.

## Start and stop (PowerShell)

From the repository root:

```powershell
docker compose -f scripts/traccar-lab/docker-compose.yml up -d
docker compose -f scripts/traccar-lab/docker-compose.yml ps
```

Open `http://127.0.0.1:8082` and complete the first-run administrator setup. Add a test device with identifier `TEST-OSMAND-0001` before sending the OsmAnd smoke-test position.

Run the smoke test:

```powershell
node scripts/traccar-lab/simulator-osmand.mjs
```

Run the GT06 packet-builder selftest (offline; this does not prove compatibility with Traccar):

```powershell
node scripts/traccar-lab/simulator-gt06.mjs --selftest
```

Add a second Traccar test device with identifier `864180070000001`, then send synthetic GT06 login, position and heartbeat frames:

```powershell
$env:GT06_SIM_HOST = "127.0.0.1"
$env:GT06_SIM_PORT = "5023"
$env:GT06_SIM_IMEI = "864180070000001"
node scripts/traccar-lab/simulator-gt06.mjs
```

The simulator moves a small amount from its starting point near Casablanca every five seconds. Stop it with `Ctrl+C`. It is adapted from the repository's `feature/accurate-gt06` protocol simulator; Traccar interoperability must still be verified against the running local container and must not be inferred from its selftest.

For a bounded synthetic check, after registering the test IMEI in Traccar run `node scripts/traccar-lab/simulator-gt06.mjs --count=3`. This mode requires a GT06 login ACK with matching serial and valid CRC, sends exactly three synthetic position frames, and exits. An ACK confirms the login response only: in Traccar check the test device and its newly saved GPS positions. If no ACK arrives within 10 seconds the command exits with an error. Never use a real vehicle IMEI for this synthetic test.

Run the existing Teltonika simulator against Traccar on its Teltonika TCP port (separate PowerShell window):

```powershell
$env:TELTONIKA_SIM_HOST = "127.0.0.1"
$env:TELTONIKA_SIM_PORT = "5027"
$env:TELTONIKA_SIM_IMEI = "356307042441234"
npm run teltonika:simulate
```

Before sending, add that exact test identifier as a device in the Traccar interface. The simulator in this repository generates Codec 8 Extended frames and performs the Teltonika IMEI handshake. It is a protocol simulator; it does not prove that every Teltonika model or CAN/IO feature behaves identically.

View logs:

```powershell
docker compose -f scripts/traccar-lab/docker-compose.yml logs --tail 100 traccar
docker compose -f scripts/traccar-lab/docker-compose.yml logs --tail 50 database
```

Stop the services but retain test data:

```powershell
docker compose -f scripts/traccar-lab/docker-compose.yml down
```

Erase the lab database and logs only when deliberately resetting all local test data:

```powershell
docker compose -f scripts/traccar-lab/docker-compose.yml down -v
```

## Ports and isolation

The Web UI is bound to `127.0.0.1:8082`. The three protocol ports are also bound only to loopback: Teltonika `5027/TCP`, GT06 `5023/TCP`, and OsmAnd `5055/TCP`. The Compose file does not publish the broad Traccar port range. Only open a port on a public host after the local test and a separate security review.

## Test coverage and remaining work

1. **OsmAnd smoke simulator:** checks that the service is reachable and receives one artificial position. It does not imitate binary tracker protocols.
2. **Teltonika simulator:** uses the existing repository simulator. Check Traccar logs, device online status, position timestamp and coordinates.
3. **GT06 / Accurate simulator:** packet construction and CRC selftest are present. Still verify the login ACK, device online status, decoded positions and heartbeat against Traccar 6.15.3 before treating interoperability as passed. GT06N/Concox support in Traccar does not prove Accurate firmware equivalence. No simulator can certify CAN, J1939 or camera functionality without exact messages or physical hardware.
4. **Matelematics adapter:** still separate work. First confirm the local Traccar records, then implement a server-side adapter with IMEI-to-tenant mapping, de-duplication, bounded retry and test-only destination storage.

Acceptance evidence for each exact device/profile: Traccar version, protocol/port, test identifier, handshake result, valid position, ACK, duplicate behavior, disconnect/reconnect, malformed-frame handling, and a list of decoded fields. Mark unsupported capabilities explicitly.
