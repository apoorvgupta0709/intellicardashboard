import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = postgres(process.env.DATABASE_URL!);

async function investigate() {
    try {
        // Check count in device_battery_map
        const mapCount = await client`SELECT count(*) FROM device_battery_map`;
        console.log(`device_battery_map total mapped devices: ${mapCount[0].count}`);

        // Let's get the distinct identifiers in vehicle_can_events
        // We noticed device_no_value or imei_value or battery_serial_number_1_value
        const canDistinctDeviceNo = await client`SELECT count(DISTINCT device_no_value) FROM public.vehicle_can_events`;
        console.log(`Distinct device_no_value in vehicle_can_events: ${canDistinctDeviceNo[0].count}`);

        const canDistinctImei = await client`SELECT count(DISTINCT imei_value) FROM public.vehicle_can_events`;
        console.log(`Distinct imei_value in vehicle_can_events: ${canDistinctImei[0].count}`);

        // Let's see some samples to correlate
        console.log('\n--- Sample device_battery_map rows ---');
        const mapSample = await client`SELECT * FROM device_battery_map LIMIT 3`;
        console.log(mapSample);

        console.log('\n--- Sample vehicle_can_events rows ---');
        const canSample = await client`SELECT device_no_value, imei_value, battery_serial_number_1_value FROM public.vehicle_can_events LIMIT 3`;
        console.log(canSample);

        // Let's check telemetry table
        const telemetryDistinct = await client`SELECT count(DISTINCT device_id) FROM telemetry.battery_readings`;
        console.log(`\nDistinct device_ids in telemetry.battery_readings: ${telemetryDistinct[0].count}`);

        // Wait, let's see why only 111? Are the rest inactive? 
        // Did a script only map a specific subset? Let's check the users or leads or other tables context
        const allTableSizes = await client`
        SELECT relname, n_live_tup
        FROM pg_stat_user_tables
        WHERE relname IN ('device_battery_map', 'users', 'dealers', 'leads', 'vehicle_can_events', 'battery_readings');
    `;
        console.log('\n--- Table Sizes ---');
        console.log(allTableSizes);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

investigate();
