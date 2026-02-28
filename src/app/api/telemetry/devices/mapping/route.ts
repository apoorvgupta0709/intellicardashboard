import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { telemetryDb } from '@/lib/telemetry/db';
import { deviceBatteryMap } from '@/lib/db/schema';
import { getServerSession } from '@/lib/auth/server-auth';

export async function GET(req: Request) {
    try {
        const auth = await getServerSession(req);
        let query = telemetryDb.select().from(deviceBatteryMap);

        if (auth.role === 'dealer') {
            query = query.where(eq(deviceBatteryMap.dealer_id, auth.dealer_id || '')) as any;
        }

        const devices = await query.orderBy(deviceBatteryMap.created_at);
        return NextResponse.json(devices, { status: 200 });
    } catch (error) {
        console.error('Error fetching device mappings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { device_id, battery_serial, vehicle_number, customer_name, dealer_id } = body;

        if (!device_id) {
            return NextResponse.json({ error: 'device_id is required' }, { status: 400 });
        }

        const newMapping = await telemetryDb.insert(deviceBatteryMap).values({
            id: crypto.randomUUID(),
            device_id,
            battery_serial: battery_serial || null,
            vehicle_number: vehicle_number || null,
            customer_name: customer_name || null,
            dealer_id: dealer_id || null,
        }).returning();

        return NextResponse.json(newMapping[0], { status: 201 });
    } catch (error) {
        console.error('Error creating device mapping:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, device_id, battery_serial, vehicle_number, customer_name, dealer_id, is_active } = body;

        if (!id) {
            return NextResponse.json({ error: 'id is required for update' }, { status: 400 });
        }

        const updatedMapping = await telemetryDb.update(deviceBatteryMap)
            .set({
                device_id,
                battery_serial: battery_serial || null,
                vehicle_number: vehicle_number || null,
                customer_name: customer_name || null,
                dealer_id: dealer_id || null,
                is_active: is_active ?? true,
                updated_at: new Date()
            })
            .where(eq(deviceBatteryMap.id, id))
            .returning();

        return NextResponse.json(updatedMapping[0], { status: 200 });
    } catch (error) {
        console.error('Error updating device mapping:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
