"use client";

import { useEffect, useState } from 'react';
import { Card, Title, Subtitle } from '@tremor/react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icons
// @ts-expect-error - overriding internal prototype
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
});

type GPSPoint = {
    time: string;
    latitude: number;
    longitude: number;
    speed: number;
};

export default function DeviceGPSMap({ deviceId }: { deviceId: string }) {
    const [trace, setTrace] = useState<GPSPoint[]>([]);

    useEffect(() => {
        if (!deviceId) return;

        fetch(`/api/telemetry/devices/${deviceId}/gps?hours=24`)
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setTrace(json);
            })
            .catch(console.error);
    }, [deviceId]);

    const hasData = trace.length > 0;

    // Extract coordinates for Polyline
    const positions: [number, number][] = trace.map(p => [p.latitude, p.longitude]);

    // Get latest position for the marker
    const latest = hasData ? trace[trace.length - 1] : null;

    // Center on latest point, or fallback to Delhi
    const defaultCenter: [number, number] = latest ? [latest.latitude, latest.longitude] : [28.6139, 77.2090];

    return (
        <Card className="h-full min-h-[400px] w-full p-0 overflow-hidden relative border-none shadow-sm">
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur pb-2 px-4 pt-3 rounded-lg shadow-sm border pointer-events-none">
                <Title>24-Hour GPS Trace</Title>
                <Subtitle>{hasData ? `${trace.length} points recorded` : 'No recent movement detected'}</Subtitle>
            </div>

            <MapContainer
                key={`${deviceId}-${hasData ? 'tracking' : 'empty'}`}
                center={defaultCenter}
                zoom={hasData ? 13 : 10}
                className="h-[400px] lg:h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {hasData && (
                    <>
                        <Polyline positions={positions} color="#3b82f6" weight={3} opacity={0.7} />
                        <Marker position={[latest!.latitude, latest!.longitude]}>
                            <Popup>
                                <div>
                                    <strong>Latest Position</strong><br />
                                    Speed: {latest!.speed} km/h<br />
                                    Time: {new Date(latest!.time).toLocaleTimeString()}
                                </div>
                            </Popup>
                        </Marker>
                    </>
                )}
            </MapContainer>
        </Card>
    );
}
