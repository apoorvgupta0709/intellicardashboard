import { NextResponse } from 'next/server';
import { filterCANBatch } from '@/lib/telemetry/data-quality';
import { insertCANReadings } from '@/lib/telemetry/queries';
import { CANReading } from '@/lib/telemetry/types';

export async function POST(req: Request) {
    try {
        const payloads = await req.json();

        if (!Array.isArray(payloads)) {
            return NextResponse.json({ error: 'Expected an array of CAN readings' }, { status: 400 });
        }

        const { valid, rejected } = filterCANBatch(payloads);

        if (valid.length > 0) {
            await insertCANReadings(valid as CANReading[]);
        }

        // In a real production app, we would log the `rejected` records to telemetry.rejected_readings table.

        return NextResponse.json({
            message: 'Batch processing complete',
            total_received: payloads.length,
            inserted: valid.length,
            rejected: rejected.length,
            rejected_samples: rejected.slice(0, 5) // Return up to 5 rejected samples for debugging
        }, { status: 200 });

    } catch (error) {
        console.error('Error ingesting CAN data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
