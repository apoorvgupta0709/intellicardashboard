"use client";

import { useEffect, useState } from 'react';
import { Card, Title, Subtitle } from '@tremor/react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet marker icons issues in Next.js
// @ts-expect-error - overriding internal prototype property
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
});

// A custom icon setup based on status can be added later
const customIcon = new L.Icon({
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

type PinInfo = {
    device_id: string;
    latitude: number | null;
    longitude: number | null;
    soc: number | null;
    soh: number | null;
    alert_status: string | null;
};

export default function FleetMap() {
    const [pins, setPins] = useState<PinInfo[]>([]);

    useEffect(() => {
        fetch('/api/telemetry/fleet/map')
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setPins(json);
            })
            .catch(console.error);
    }, []);

    // Filter out invalid coords
    const validPins = pins.filter(p => p.latitude && p.longitude);
    const defaultCenter: [number, number] = [28.6139, 77.2090]; // New Delhi

    return (
        <Card className="h-[400px] lg:h-[600px] w-full p-0 overflow-hidden relative border-none shadow-sm">
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur pb-2 px-4 pt-3 rounded-lg shadow-sm border pointer-events-none">
                <Title>Live Fleet Assets</Title>
                <Subtitle>Tracking {validPins.length} vehicles</Subtitle>
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={10}
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {validPins.map((pin) => (
                    <Marker
                        key={pin.device_id}
                        position={[pin.latitude as number, pin.longitude as number]}
                        icon={customIcon}
                    >
                        <Popup>
                            <div className="p-1 min-w-[150px]">
                                <strong className="block mb-1">{pin.device_id}</strong>
                                <div>SOC: {pin.soc}%</div>
                                <div>SOH: {pin.soh}%</div>
                                {pin.alert_status && (
                                    <div className="mt-1 text-red-600 capitalize font-medium">
                                        {pin.alert_status} Alert
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </Card>
    );
}
