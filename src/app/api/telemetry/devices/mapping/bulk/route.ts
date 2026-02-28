import { NextResponse } from 'next/server';
import { telemetryDb } from '@/lib/telemetry/db';
import { deviceBatteryMap } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        if (!Array.isArray(body)) {
            return NextResponse.json({ error: 'Expected an array of device configurations' }, { status: 400 });
        }

        if (body.length === 0) {
            return NextResponse.json({ message: 'No devices mapped', inserted: 0 }, { status: 200 });
        }

        // We prepare Drizzle values for bulk insertion.
        const mappedValues = body.map((row) => ({
            id: crypto.randomUUID(),
            device_id: String(row.device_id).trim(),
            battery_serial: row.battery_serial ? String(row.battery_serial).trim() : null,
            vehicle_number: row.vehicle_number ? String(row.vehicle_number).trim() : null,
            customer_name: row.customer_name ? String(row.customer_name).trim() : null,
            dealer_id: row.dealer_id ? String(row.dealer_id).trim() : null,
            is_active: row.is_active !== undefined ? (String(row.is_active).toLowerCase() === 'true') : true,
        }));

        // Drizzle handles bulk inserts efficiently with postgres ON CONFLICT updates.
        // Or natively fallback to simple conflict ignoring.
        const result = await telemetryDb.insert(deviceBatteryMap)
            .values(mappedValues)
            .onConflictDoUpdate({
                target: deviceBatteryMap.device_id,
                set: {
                    battery_serial: sql`EXCLUDED.battery_serial`,
                    vehicle_number: sql`EXCLUDED.vehicle_number`,
                    customer_name: sql`EXCLUDED.customer_name`,
                    dealer_id: sql`EXCLUDED.dealer_id`,
                    is_active: sql`EXCLUDED.is_active`,
                    updated_at: new Date()
                }
            })
            .returning();

        return NextResponse.json({
            message: 'Bulk configuration complete',
            inserted_or_updated: result.length
        }, { status: 201 });

    } catch (error) {
        console.error('Error executing bulk device configuration:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
