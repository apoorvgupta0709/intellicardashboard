import { NextResponse } from 'next/server';
import { filterCANBatch } from '@/lib/telemetry/data-quality';
import { insertCANReadings, insertRejectedReadings } from '@/lib/telemetry/queries';
import { CANReading } from '@/lib/telemetry/types';
import { processAlerts } from '@/lib/telemetry/alert-engine';

export async function POST(req: Request) {
    try {
        const payloads = await req.json();

        if (!Array.isArray(payloads)) {
            return NextResponse.json({ error: 'Expected an array of CAN readings' }, { status: 400 });
        }

        const { valid, rejected } = filterCANBatch(payloads);

        if (valid.length > 0) {
            await insertCANReadings(valid as CANReading[]);
            // Evaluate valid readings for potential priority alerts
            await processAlerts(valid as CANReading[]);
        }

        // Persist rejected readings so sensor failures can be diagnosed later.
        // Previously these were silently discarded (only a comment noted the gap).
        if (rejected.length > 0) {
            const now = new Date().toISOString();
            const rejectRecords = rejected.map(r => ({
                time: (r.payload.time as string) || now,
                device_id: (r.payload.device_id as string) || 'unknown',
                reading_type: 'can',
                payload: r.payload as Record<string, unknown>,
                error_reason: r.reason,
            }));

            try {
                await insertRejectedReadings(rejectRecords);
            } catch (logErr) {
                // Non-fatal: log the failure but don't let it break the ingest response
                console.error('Failed to persist rejected readings:', logErr);
            }
        }

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
