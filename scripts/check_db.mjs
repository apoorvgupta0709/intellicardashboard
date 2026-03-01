import postgres from 'postgres';

const sql = postgres('postgresql://postgres:MYsupabase@2026@db.zziynfmqfvchkheqnqqr.supabase.co:5432/postgres');

async function check() {
    try {
        const deviceMap = await sql`SELECT count(*) FROM device_battery_map`;
        console.log('device_battery_map count:', deviceMap[0].count);

        const gps = await sql`SELECT count(*) FROM telemetry.gps_readings`;
        console.log('telemetry.gps_readings count:', gps[0].count);

        const battery = await sql`SELECT count(*) FROM telemetry.battery_readings`;
        console.log('telemetry.battery_readings count:', battery[0].count);

        const trips = await sql`SELECT count(*) FROM telemetry.trips`;
        console.log('telemetry.trips count:', trips[0].count);

    } catch (e) {
        console.error('Error querying:', e.message);
    } finally {
        await sql.end();
    }
}

check();
