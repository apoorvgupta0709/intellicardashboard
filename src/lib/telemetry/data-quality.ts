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
    return getCANRejectionReason(reading) === null;
}

/**
 * Returns a specific human-readable reason why a reading is invalid, or null if valid.
 * Previously all rejections returned the same generic string, making it impossible to tell
 * which sensor field was producing bad data on a given device.
 */
export function getCANRejectionReason(reading: Partial<CANReading>): string | null {
    const soc = reading.soc ?? null;
    const voltage = reading.voltage ?? null;
    const current = reading.current ?? null;
    const temp = reading.temperature ?? null;

    if (soc !== null && (soc < 0 || soc > 100)) {
        return `SOC out of range: ${soc}% (expected 0–100%)`;
    }

    // 48V System range: Assume 30V is extremely dead, 70V is maximum overcharge (typically max 58.4V for LFP)
    if (voltage !== null && (voltage < 20 || voltage > 80)) {
        return `Voltage out of range: ${voltage}V (expected 20–80V for 48V system)`;
    }

    // Current bounds: allow some regeneration (-), and realistic max draw (+)
    if (current !== null && (current < -150 || current > 300)) {
        return `Current out of range: ${current}A (expected -150 to +300A)`;
    }

    // Temperature anomaly bounds
    if (temp !== null && (temp < -20 || temp > 85)) {
        return `Temperature out of range: ${temp}°C (expected -20 to +85°C)`;
    }

    return null;
}

/**
 * Validates a batch of CAN readings and separates them into valid and rejected buckets.
 */
export function filterCANBatch(readings: Partial<CANReading>[]) {
    const valid: Partial<CANReading>[] = [];
    const rejected: { payload: Partial<CANReading>, reason: string }[] = [];

    for (const r of readings) {
        const reason = getCANRejectionReason(r);
        if (reason === null) {
            valid.push(r);
        } else {
            rejected.push({ payload: r, reason });
        }
    }

    return { valid, rejected };
}
