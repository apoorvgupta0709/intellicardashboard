# Intellicar API Endpoint Tracking

All endpoints use **POST** method against base URL: `https://apiplatform.intellicar.in/api/standard`

## Authentication

| Endpoint | Payload | Response | Used In |
|----------|---------|----------|---------|
| `gettoken` | `{ username, password }` | `{ token }` | `src/lib/intellicar/client.ts` |

## Device Mapping

| Endpoint | Payload | Response | Used In |
|----------|---------|----------|---------|
| `listvehicledevicemapping` | `{ token }` | Array of `{ vehicleno, deviceid, ... }` | `src/lib/intellicar/client.ts` |

## Live Data (polled every 30 minutes)

| Endpoint | Payload | Target Table | Used In |
|----------|---------|-------------|---------|
| `getlastgpsstatus` | `{ token, vehicleno }` | `telemetry.gps_readings` | `scripts/ingest-live.ts` |
| `getlatestcan` | `{ token, vehicleno }` | `telemetry.battery_readings` | `scripts/ingest-live.ts` |
| `getdistancetravelled` | `{ token, vehicleno, starttime, endtime }` | `telemetry.trips` | `scripts/ingest-live.ts` |

## Historical Data (from Feb 1, 2026 onward)

| Endpoint | Payload | Target Table | Used In |
|----------|---------|-------------|---------|
| `getgpshistory` | `{ token, vehicleno, starttime, endtime }` | `telemetry.gps_readings` | `scripts/ingest-historical.ts` |
| `getbatterymetricshistory` | `{ token, vehicleno, starttime, endtime }` | `telemetry.battery_readings` | `scripts/ingest-historical.ts` |
| `getdistancetravelled` | `{ token, vehicleno, starttime, endtime }` | `telemetry.trips` | `scripts/ingest-historical.ts` |
| `getfuelhistory` | `{ token, vehicleno, inlitres, starttime, endtime }` | `telemetry.energy_consumption` | `scripts/ingest-historical.ts` |
| `getfuelused` | `{ token, vehicleno, starttime, endtime }` | `telemetry.energy_consumption` | `scripts/ingest-historical.ts` |

## Database Tables

| Table | Schema | Fed By Endpoint(s) | Purpose |
|-------|--------|---------------------|---------|
| `battery_readings` | `telemetry` | `getbatterymetricshistory`, `getlatestcan` | Battery SOC, voltage, current, temp, SOH |
| `gps_readings` | `telemetry` | `getgpshistory`, `getlastgpsstatus` | GPS lat/lon, speed, heading, ignition |
| `trips` | `telemetry` | `getdistancetravelled` | Distance & odometer summaries |
| `energy_consumption` | `telemetry` | `getfuelhistory`, `getfuelused` | Energy/fuel consumption |
| `alert_config` | `telemetry` | Manual config | Alert threshold configuration (singleton) |
| `rejected_readings` | `telemetry` | Validation failures | Invalid readings log |
| `battery_alerts` | `public` | Alert engine (from CAN ingestion) | Alert records |
| `device_battery_map` | `public` | Manual mapping | Device-to-battery-to-customer mapping |

## Ingestion Paths

### Path 1: Live daemon (`scripts/ingest-live.ts`) — every 30 minutes
1. `listVehicles()` → enumerate fleet
2. For each vehicle:
   - `getlastgpsstatus` → `telemetry.gps_readings`
   - `getlatestcan` → `telemetry.battery_readings`
   - `getdistancetravelled` (last 30 min) → `telemetry.trips`

### Path 2: Historical ingestion (`scripts/ingest-historical.ts`) — one-time bulk
- Fetches data from **Feb 1, 2026** to now in 30-day chunks
- Endpoints: `getbatterymetricshistory`, `getgpshistory`, `getdistancetravelled`, `getfuelhistory`, `getfuelused`

### Path 3: n8n workflows → Dashboard API
- `POST /api/telemetry/ingest/can-data` → `telemetry.battery_readings` + alert engine
- `POST /api/telemetry/ingest/gps-data` → `telemetry.gps_readings`
- `POST /api/telemetry/ingest/trips` → `telemetry.trips`
- `POST /api/telemetry/ingest/energy` → `telemetry.energy_consumption`

### Path 4: CSV import
- `POST /api/telemetry/ingest/historical` → reads CSV files → `battery_readings` + `gps_readings`
