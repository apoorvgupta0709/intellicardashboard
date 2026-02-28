import { CANReading } from './types';

/**
 * Filter for identifying anomalous CAN readings from the Intellicar API
 * before inserting them into the TimescaleDB.
 * 
 * Based on BRD analysis, it drops points with:
 * - Voltage spikes > 800k
 * - Current spikes > 1 million
 * - SOC > 100% or < 0%
 */
export function isValidCANReading(reading: Partial<CANReading>): boolean {
    // Extract values, default to null if missing instead of undefined
    const soc = reading.soc ?? null;
    const voltage = reading.voltage ?? null;
    const current = reading.current ?? null;
    const temp = reading.temperature ?? null;

    // Basic sanity checks
    if (soc !== null && (soc < 0 || soc > 100)) {
        return false;
    }

    // 48V System range: Assume 30V is extremely dead, 70V is maximum overcharge (typically max 58.4V for LFP)
    if (voltage !== null && (voltage < 20 || voltage > 80)) {
        return false;
    }

    // Current bounds: allow some regeneration (-), and realistic max draw (+)
    if (current !== null && (current < -150 || current > 300)) {
        return false;
    }

    // Temperature anomaly bounds
    if (temp !== null && (temp < -20 || temp > 85)) {
        return false;
    }

    return true;
}

/**
 * Validates a batch of CAN readings and separates them into valid and rejected buckets.
 */
export function filterCANBatch(readings: Partial<CANReading>[]) {
    const valid: Partial<CANReading>[] = [];
    const rejected: { payload: Partial<CANReading>, reason: string }[] = [];

    for (const r of readings) {
        if (isValidCANReading(r)) {
            valid.push(r);
        } else {
            rejected.push({
                payload: r,
                reason: 'Failed data quality bounds verification',
            });
        }
    }

    return { valid, rejected };
}
