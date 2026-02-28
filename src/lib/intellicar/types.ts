export interface IntellicarAuthResponse {
    token: string;
    expires_in: number;
}

export interface IntellicarCANResponse {
    device_id: string;
    timestamp: string | number; // sometimes ISO, sometimes Epoch
    soc?: number;
    battery_voltage?: number;
    current?: number;
    battery_temp?: number;
    charge_cycle?: number;
    soh?: number;
}

export interface IntellicarGPSResponse {
    device_id: string;
    timestamp: string | number;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    ignition?: number;
}
