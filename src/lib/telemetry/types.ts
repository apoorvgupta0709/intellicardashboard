export interface CANReading {
    time: Date;
    device_id: string;
    battery_id?: string;
    soc: number | null;
    soh: number | null;
    voltage: number | null;
    current: number | null;
    charge_cycle: number | null;
    temperature: number | null;
    power_watts: number | null;
}

export interface GPSReading {
    time: Date;
    device_id: string;
    latitude: number;
    longitude: number;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
    device_battery?: number | null;
    vehicle_battery?: number | null;
    ignition_on?: boolean | null;
    is_moving?: boolean | null;
}

export interface TripSummary {
    id?: number;
    device_id: string;
    start_time: Date;
    end_time: Date;
    start_odometer?: number | null;
    end_odometer?: number | null;
    distance_km?: number | null;
    start_location?: string | null; // Note: For DB insertion, usually converted back to Geography string
    end_location?: string | null; // Note: Same as above
    last_ign_on?: Date | null;
    last_ign_off?: Date | null;
}

export interface EnergyConsumption {
    id?: number;
    device_id: string;
    start_time: Date;
    end_time: Date;
    energy_used_kwh?: number | null;
    start_soc?: number | null;
    end_soc?: number | null;
    last_ign_on?: Date | null;
    last_ign_off?: Date | null;
    charging_events?: Record<string, unknown>; // JSONB
}

export interface BatteryHourlyAggregate {
    bucket: Date;
    device_id: string;
    avg_soc: number | null;
    min_soc: number | null;
    max_soc: number | null;
    avg_voltage: number | null;
    min_voltage: number | null;
    max_voltage: number | null;
    avg_current: number | null;
    avg_temp: number | null;
    max_temp: number | null;
    charge_cycle: number | null;
    avg_soh: number | null;
    reading_count: number;
}

export interface BatteryDailyAggregate {
    bucket: Date;
    device_id: string;
    avg_soc: number | null;
    min_soc: number | null;
    max_soc: number | null;
    avg_voltage: number | null;
    avg_current: number | null;
    avg_temp: number | null;
    max_temp: number | null;
    charge_cycle: number | null;
    min_soh: number | null;
    reading_count: number;
}
