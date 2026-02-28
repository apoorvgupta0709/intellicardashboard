import { NextResponse } from 'next/server';
import { insertGPSReadings } from '@/lib/telemetry/queries';
import { GPSReading } from '@/lib/telemetry/types';

export async function POST(req: Request) {
    try {
        const payloads = await req.json();

        if (!Array.isArray(payloads)) {
            return NextResponse.json({ error: 'Expected an array of GPS readings' }, { status: 400 });
        }

        // Basic required field validation before passing to SQL insertion
        const valid = payloads.filter(p => p.device_id && p.time && p.latitude !== undefined && p.longitude !== undefined);
        const rejected = payloads.length - valid.length;

        if (valid.length > 0) {
            // Map ISO format if strings were sent
            const formatted = valid.map(p => ({
                ...p,
                time: new Date(p.time) // Assuming caller sends ISO string or Epoch ms
            }));
            await insertGPSReadings(formatted as GPSReading[]);
        }

        return NextResponse.json({
            message: 'GPS Batch processing complete',
            total_received: payloads.length,
            inserted: valid.length,
            rejected: rejected
        }, { status: 200 });

    } catch (error) {
        console.error('Error ingesting GPS data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
