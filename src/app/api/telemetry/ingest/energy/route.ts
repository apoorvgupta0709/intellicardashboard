import { NextResponse } from 'next/server';
import { insertEnergy } from '@/lib/telemetry/queries';
import { EnergyConsumption } from '@/lib/telemetry/types';

export async function POST(req: Request) {
    try {
        const payloads = await req.json();

        if (!Array.isArray(payloads)) {
            return NextResponse.json({ error: 'Expected an array of Energy consumption summaries' }, { status: 400 });
        }

        const valid = payloads.filter(p => p.vehicleno && p.starttime_ms != null && p.endtime_ms != null);

        if (valid.length > 0) {
            await insertEnergy(valid as EnergyConsumption[]);
        }

        return NextResponse.json({
            message: 'Energy Batch processing complete',
            total_received: payloads.length,
            inserted: valid.length
        }, { status: 200 });

    } catch (error) {
        console.error('Error ingesting Energy data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
