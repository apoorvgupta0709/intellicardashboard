import { NextResponse } from 'next/server';
import { insertTrips } from '@/lib/telemetry/queries';
import { TripSummary } from '@/lib/telemetry/types';

export async function POST(req: Request) {
    try {
        const payloads = await req.json();

        if (!Array.isArray(payloads)) {
            return NextResponse.json({ error: 'Expected an array of Trip summaries' }, { status: 400 });
        }

        const valid = payloads.filter(p => p.device_id && p.start_time && p.end_time);

        if (valid.length > 0) {
            const formatted = valid.map(p => ({
                ...p,
                start_time: new Date(p.start_time),
                end_time: new Date(p.end_time)
            }));
            await insertTrips(formatted as TripSummary[]);
        }

        return NextResponse.json({
            message: 'Trips Batch processing complete',
            total_received: payloads.length,
            inserted: valid.length
        }, { status: 200 });

    } catch (error) {
        console.error('Error ingesting Trip data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
