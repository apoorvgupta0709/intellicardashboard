# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Next.js dev server (uses webpack, not Turbopack)
npm run build        # Production build (also uses webpack)
npm run lint         # Run ESLint

# Database migration (apply telemetry schema to Supabase)
npx tsx scripts/apply-telemetry-schema.ts

# Live data ingestion daemon (polls Intellicar API every 30 min)
npx tsx scripts/ingest-live.ts

# Historical data ingestion
npx tsx scripts/ingest-historical.ts
npx tsx scripts/ingest_historical_csv.ts

# Debug/inspect scripts
npx tsx scripts/check-device-counts.ts
npx tsx scripts/check-can-events.ts
node scripts/check_db.mjs
```

All scripts load from `.env.local` at runtime.

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` — Supabase PostgreSQL connection string (used by both telemetry and Drizzle)
- `INTELLICAR_USERNAME` / `INTELLICAR_PASSWORD` — credentials for `https://apiplatform.intellicar.in/api/standard`

## Architecture

### Purpose
iTarang Battery Monitoring Dashboard — a Samsara-style fleet monitoring system for e-rickshaw batteries, built as a Next.js app. It ingests telemetry from Intellicar IoT devices and displays real-time battery health, GPS location, trips, and alerts.

### Database: Two-Schema PostgreSQL (Supabase)

**Public schema** (managed by Drizzle ORM via `src/lib/db/schema.ts`):
- `device_battery_map` — maps Intellicar device IDs to battery serials, dealers, and customers
- `battery_alerts` — alert records for threshold breaches
- `vehicle_device_map` — vehicle-to-device mapping (CEO fleet overview)

**`telemetry` schema** (raw SQL migration via `scripts/apply-telemetry-schema.ts`, not Drizzle-managed):
- `telemetry.battery_readings` — CAN data: SOC, SOH, voltage, current, temperature, cell arrays, JSONB raw payload
- `telemetry.gps_readings` — GPS with PostGIS `GEOGRAPHY(POINT, 4326)` location column
- `telemetry.trips` — distance/odometer aggregates per trip
- `telemetry.energy_consumption` — kWh usage per session
- `telemetry.rejected_readings` — data quality rejects (sensor anomalies)
- `telemetry.alert_config` — configurable thresholds (single-row JSONB table)

**Key pattern:** Telemetry tables are queried with raw SQL via Drizzle's `sql\`\`` tag because Drizzle doesn't support TimescaleDB hypertables or PostGIS natively. The `src/lib/telemetry/queries.ts` file contains all reusable SQL query functions.

The DB connection lives in `src/lib/telemetry/db.ts` (exports `telemetryDb`). It uses `postgres.js` with `prepare: false` (required for Supabase's pgBouncer).

### Data Ingestion Pipeline

```
Intellicar API → src/lib/intellicar/client.ts → POST /api/telemetry/ingest/* → telemetry schema
                                                        ↓
                                               alert-engine.ts (threshold checks)
                                                        ↓
                                               battery_alerts table
```

Data quality validation (`src/lib/telemetry/data-quality.ts`) filters anomalous CAN readings (voltage > 80V, SOC > 100%, current outside ±300A) before DB insertion. Rejected readings go to `telemetry.rejected_readings`.

The live daemon (`scripts/ingest-live.ts`) calls three Intellicar endpoints per vehicle: `getlastgpsstatus`, `getlatestcan`, and `getdistancetravelled`. It runs on a 30-minute loop.

### Authentication (Mock/Dev)

Auth is role-based with two roles: `ceo` (full fleet) and `dealer` (scoped to their `dealer_id`).

- **Client side**: `AuthContext` (`src/lib/auth/AuthContext.tsx`) stores role in localStorage key `intellicar_mock_auth` and reloads on role change.
- **Server side**: `getServerSession()` (`src/lib/auth/server-auth.ts`) reads from cookie `intellicar_mock_auth` and defaults to CEO if absent.
- All API routes call `getServerSession(req)` and add `AND dealer_id = ${auth.dealer_id}` clauses when role is `dealer`.

### Dashboard Pages (route group `(dashboard)`)

All pages under `src/app/(dashboard)/` share the sidebar layout in `src/app/(dashboard)/layout.tsx` (client component with `RoleSwitcher`).

| Page | Route |
|------|-------|
| Fleet Overview | `/battery-monitoring` |
| Battery Health & Analytics | `/battery-monitoring/health` |
| Trip Analytics | `/battery-monitoring/trips` |
| Alerts & Rules | `/battery-monitoring/alerts` |
| Device Management | `/battery-monitoring/devices` |
| Single Battery Live View | `/battery-monitoring/live/[deviceId]` |
| Database Health | `/system/database` |

### API Routes (`src/app/api/telemetry/`)

- `POST /api/telemetry/ingest/can-data` — bulk CAN data insert with data quality filter + alert engine
- `POST /api/telemetry/ingest/gps-data` — bulk GPS insert with PostGIS point construction
- `POST /api/telemetry/ingest/trips` and `/energy` — trip and energy records
- `GET /api/telemetry/fleet/overview` — KPI aggregates (cached with `revalidate = 60`)
- `GET /api/telemetry/fleet/map` — all device locations + latest SOC for map pins
- `GET /api/telemetry/devices` and `/devices/[deviceId]` — device lists and detail
- `GET /api/telemetry/devices/[deviceId]/readings|gps|trips` — time-range historical data
- `GET /api/telemetry/alerts` + `POST /api/telemetry/alerts/acknowledge` — alert management
- `GET|PUT /api/telemetry/alerts/config` — configurable alert thresholds
- `GET /api/telemetry/analytics/warranty|dealer-comparison|soc-trends` — analytics

### UI Components (`src/components/battery-monitoring/`)

Charts use **Recharts** for time-series data and **Tremor** (`@tremor/react`) for dashboard cards. Maps use **react-leaflet** with `react-leaflet` requiring dynamic imports in Next.js (SSR disabled). Icons come from `@heroicons/react` and `@remixicon/react`.

### Intellicar API Client (`src/lib/intellicar/client.ts`)

Token auth with 1-hour cache. All calls go through `postToIntellicar<T>(endpoint, payload)` which appends the cached token. Key endpoints: `getbatterymetricshistory`, `getgpshistory`, `getdistancetravelled`, `getfuelhistory`, `listvehicledevicemapping`, `getlatestcan`, `getlastgpsstatus`.
