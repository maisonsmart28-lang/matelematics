# Matelematics — Teltonika ingestion engine

This module is deliberately separated from the Next.js dashboard.

## Current scope

- TCP listener for Teltonika devices.
- IMEI handshake and admission control.
- Codec 8 (`0x08`) decoding.
- Codec 8 Extended (`0x8E`) decoding, including variable-length IO elements.
- CRC-16/IBM validation.
- GPS, priority, event ID and IO extraction.
- Normalized telemetry boundary for the future Matelematics API/database.
- Development IMEI registry.
- Local Teltonika simulator so the pipeline can be tested without hardware.

The current implementation does **not** connect to any third-party tracker.

## Start the ingestion engine

```bash
npm install
npm run teltonika:server
```

Default TCP port: `5000`.

## Register a development device

Set:

```text
TELTONIKA_DEV_DEVICES=356307042441234:demo-client:demo-vehicle:Demo Vehicle
```

The format is:

```text
IMEI:clientId:vehicleId:label
```

Multiple devices can be separated with commas.

## Run the simulator

In another terminal:

```bash
npm run teltonika:simulate
```

The simulator performs the Teltonika IMEI handshake, sends one Codec 8 AVL record and closes the connection.

## Production boundary

The TCP service produces normalized telemetry. The next module will persist it through the Matelematics data layer and expose it to the existing dashboard.

The dashboard must not know how Teltonika binary packets are decoded.
