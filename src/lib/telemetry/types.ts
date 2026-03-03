export interface CANReading {
    time: Date;
    vehiclenos: string;          // vehicle plate number — was device_id
    battery_id?: string;
    soc: number | null;
    soh: number | null;
    voltage: number | null;
    current: number | null;
    charge_cycle: number | null;
    temperature: number | null;
    power_watts: number | null;
    // Live-specific fields (getlatestcan) — omitted/null for historical records
    source?: 'history' | 'live';
    can_payload?: Record<string, unknown> | null;
    can_received_at?: Date | null;
    can_sample_time?: Date | null;
    rated_capacity?: number | null;
    dod?: number | null;
    no_of_cells?: number | null;
    no_of_temperature_sensors?: number | null;
    cell_voltage?: (number | null)[] | null;
    cell_temperature?: (number | null)[] | null;
    // BMS status flags (SMALLINT: 0/1)
    alarm?: number | null;
    allow_charging?: number | null;
    allow_discharging?: number | null;
    balancing_status?: number | null;
    protection?: number | null;
    // BMS min/max aggregates
    maximum_cell_voltage?: number | null;
    minimum_cell_voltage?: number | null;
    maximum_cell_temperature?: number | null;
    minimum_cell_temperature?: number | null;
    // BMS metadata
    iot_no?: number | null;
    protocol_version?: number | null;
    bms_firmware_version?: number | null;
    battery_serial_number_1?: number | null;
    battery_serial_number_2?: number | null;
    bms_serial_no_1?: number | null;
    bms_serial_no_2?: number | null;
}

export interface GPSReading {
    time: Date;
    device_id: string;           // vehicle number (matches vehiclenos in battery_readings)
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
    start_location?: string | null;
    end_location?: string | null;
    last_ign_on?: Date | null;
    last_ign_off?: Date | null;
}

/** Matches the actual telemetry.energy_consumption schema */
export interface EnergyConsumption {
    vehicleno: string;
    starttime_ms: number;        // epoch milliseconds (PK)
    endtime_ms: number;          // epoch milliseconds (PK)
    start_time?: Date | null;
    end_time?: Date | null;
    is_ev?: boolean;
    energy_consumption?: number | null;  // kWh or equivalent
    start_fl?: number | null;
    end_fl?: number | null;
    start_fl_litres?: number | null;
    end_fl_litres?: number | null;
    last_ign_on?: number | null;         // epoch ms
    last_ign_off?: number | null;        // epoch ms
    refueling_events?: Record<string, unknown>[];
    api_status?: string | null;
    api_msg?: string | null;
    api_err?: Record<string, unknown> | null;
    pulled_at?: Date;
}

export interface BatteryHourlyAggregate {
    bucket: Date;
    vehiclenos: string;
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
    vehiclenos: string;
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
