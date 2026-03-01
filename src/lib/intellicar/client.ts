import { IntellicarCANResponse, IntellicarGPSResponse } from './types';

const BASE_URL = 'https://apiplatform.intellicar.in/api/standard';
const USERNAME = process.env.INTELLICAR_USERNAME || '';
const PASSWORD = process.env.INTELLICAR_PASSWORD || '';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getIntellicarToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const username = process.env.INTELLICAR_USERNAME || USERNAME;
    const password = process.env.INTELLICAR_PASSWORD || PASSWORD;

    const response = await fetch(`${BASE_URL}/gettoken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (data.status !== 'SUCCESS') {
        console.error('Intellicar Auth Error Response:', data);
        throw new Error(`Intellicar auth failed: ${data.message || 'Unknown error'}`);
    }

    cachedToken = data.data.token;
    // Buffer by 5 mins
    tokenExpiresAt = Date.now() + 3600 * 1000 - 300000;

    return cachedToken!;
}

export async function postToIntellicar<T>(endpoint: string, payload: any): Promise<T> {
    const token = await getIntellicarToken();
    const response = await fetch(`${BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, token })
    });

    if (!response.ok) {
        throw new Error(`Intellicar API error at ${endpoint}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.status !== 'SUCCESS') {
        throw new Error(`Intellicar API Error [${endpoint}]: ${data.message || 'Unknown error'}`);
    }

    return data.data;
}

/**
 * List all vehicle-device mappings.
 */
export async function listVehicles(): Promise<any[]> {
    return postToIntellicar<any[]>('listvehicledevicemapping', {});
}

/**
 * Fetch Battery Metrics history for a given vehicle and time range.
 */
export async function getBatteryMetricsHistory(vehicleNo: string, startTimeTs: number, endTimeTs: number): Promise<any[]> {
    return postToIntellicar<any[]>('getbatterymetricshistory', {
        vehicleno: vehicleNo,
        starttime: startTimeTs,
        endtime: endTimeTs
    });
}

/**
 * Fetch GPS history for a given vehicle and time range.
 */
export async function getGPSHistory(vehicleNo: string, startTimeTs: number, endTimeTs: number): Promise<any[]> {
    return postToIntellicar<any[]>('getgpshistory', {
        vehicleno: vehicleNo,
        starttime: startTimeTs,
        endtime: endTimeTs
    });
}
