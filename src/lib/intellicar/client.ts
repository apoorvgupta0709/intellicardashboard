import { IntellicarCANResponse, IntellicarGPSResponse } from './types';

const BASE_URL = process.env.INTELLICAR_API_URL || 'https://api.intellicar.in/v1';
const USERNAME = process.env.INTELLICAR_USERNAME || '';
const PASSWORD = process.env.INTELLICAR_PASSWORD || '';

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export async function getIntellicarToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });

    if (!response.ok) {
        throw new Error(`Intellicar auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    cachedToken = data.token;
    // Assume token expires in 24h if not specified, buffer by 5 mins
    const expiresInMs = (data.expires_in || 86400) * 1000;
    tokenExpiresAt = Date.now() + expiresInMs - 300000;

    return cachedToken!;
}

async function fetchFromIntellicar<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const token = await getIntellicarToken();
    const url = new URL(`${BASE_URL}${endpoint}`);

    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Intellicar API error at ${endpoint}: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch CAN data (battery telemetry) for a given device and time range.
 */
export async function getCANData(deviceId: string, startTimeTs: number, endTimeTs: number): Promise<IntellicarCANResponse[]> {
    // Using hypothetical endpoint based on standard telematics APIs. 
    // Adjust to true Intellicar endpoint path as per their documentation.
    return fetchFromIntellicar<IntellicarCANResponse[]>('/telemetry/can', {
        device_id: deviceId,
        start_time: startTimeTs.toString(),
        end_time: endTimeTs.toString()
    });
}

/**
 * Fetch GPS history for a given device and time range.
 */
export async function getGPSHistory(deviceId: string, startTimeTs: number, endTimeTs: number): Promise<IntellicarGPSResponse[]> {
    return fetchFromIntellicar<IntellicarGPSResponse[]>('/telemetry/gps', {
        device_id: deviceId,
        start_time: startTimeTs.toString(),
        end_time: endTimeTs.toString()
    });
}
