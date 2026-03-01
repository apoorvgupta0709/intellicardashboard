# iTarang Battery Dashboard — n8n Workflow Guide

This guide details exactly how to configure your n8n workflows to ingest data from the Intellicar APIs into your new TimescaleDB metrics tables. You will build 3 primary scheduled workflows in n8n.

## Prerequisites
1. Open your n8n UI instance.
2. Go to **Credentials** and ensure you have an **HTTP Request** credential for Intellicar (or just use basic auth on the node).
3. Ensure your n8n instance can network to your Next.js application URL (e.g., `https://your-dashboard-url.com/api/telemetry/...`).

---

## Workflow 1: `fetch-can-data` (Every 5 minutes)

**Purpose**: Fetches real-time CAN readings (SOC, Voltage, Current, Temp) and inserts them into the Continuous Aggregate pipeline.

### Nodes Setup:
1. **Schedule Trigger**:
   - Set to run every **5 minutes**.
2. **HTTP Request** (Intellicar Live Data):
   - **Method**: GET
   - **URL**: `https://api.intellicar.in/getcandata`
   - **Auth**: Configure Basic Auth with Intellicar credentials.
3. **HTTP Request** (Send to Dashboard):
   - **Method**: POST
   - **URL**: `https://your-dashboard-url.com/api/telemetry/ingest/can-data`
   - **Body Type**: JSON
   - **Expression**: Send the raw JSON array received from the previous Intellicar node. Our API route will parse, validate, and bulk-insert this to TimescaleDB.

---

## Workflow 2: `fetch-gps-data` (Every 5 minutes)

**Purpose**: Fetches real-time GPS locations and moving status to update the `telemetry.gps_readings` table.

### Nodes Setup:
1. **Schedule Trigger**:
   - Set to run every **5 minutes**.
2. **HTTP Request** (Intellicar GPS Data):
   - **Method**: GET
   - **URL**: `https://api.intellicar.in/getgpshistory` (with appropriately calculated start/end epoch params via expression for the last 5 minutes).
   - **Auth**: Intellicar credentials.
3. **HTTP Request** (Send to Dashboard):
   - **Method**: POST
   - **URL**: `https://your-dashboard-url.com/api/telemetry/ingest/gps-data`
   - **Body**: Send the raw JSON Array of location objects.

---

## Workflow 3: `fetch-daily-trips` (Daily at Midnight)

**Purpose**: Fetches distance, odometer, and "fuel" used (energy) summaries for all fleet devices over the past 24 hours.

### Nodes Setup:
1. **Schedule Trigger**:
   - Set to run every day at **00:05**.
2. **HTTP Request** (Intellicar Distance):
   - **Method**: GET
   - **URL**: `https://api.intellicar.in/getdistance` (Start param = Midnight yesterday, End param = Midnight today).
3. **HTTP Request** (Send to Dashboard Trips):
   - **Method**: POST
   - **URL**: `https://your-dashboard-url.com/api/telemetry/ingest/trips`
   - **Body**: The Array of distance records.
4. **HTTP Request** (Intellicar Energy/Fuel):
   - **Method**: GET
   - **URL**: `https://api.intellicar.in/getfuelused` (Same time range).
5. **HTTP Request** (Send to Dashboard Energy):
   - **Method**: POST
   - **URL**: `https://your-dashboard-url.com/api/telemetry/ingest/energy`
   - **Body**: The Array of energy/fuel records.

---

## Important Tips
* **Note on Alert Engine**: By POSTing the `can-data` to our ingestion route, the database will automatically evaluate the payload against the thresholds mapped out in the `alert_config` table and create a system alert if necessary.
* **Batch Limits**: If you are pushing over 1,000 devices at a time, consider adding a **"Split In Batches"** node in n8n between the Intellicar Request and the Dashboard POST Request to avoid overwhelming the memory buffers.
