"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Title, Subtitle } from '@tremor/react';
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
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<L.Marker[]>([]);

    useEffect(() => {
        fetch('/api/telemetry/fleet/map')
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setPins(json);
            })
            .catch(console.error);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current).setView([28.6139, 77.2090], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        mapRef.current = map;

        // Cleanup on unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update markers when pins change
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove old markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const validPins = pins.filter(p => p.latitude && p.longitude);

        validPins.forEach((pin) => {
            const marker = L.marker(
                [pin.latitude as number, pin.longitude as number],
                { icon: customIcon }
            ).addTo(mapRef.current!);

            let popupContent = `<div class="p-1 min-w-[150px]">
                <strong class="block mb-1">${pin.device_id}</strong>
                <div>SOC: ${pin.soc}%</div>
                <div>SOH: ${pin.soh}%</div>`;
            if (pin.alert_status) {
                popupContent += `<div class="mt-1 text-red-600 capitalize font-medium">${pin.alert_status} Alert</div>`;
            }
            popupContent += `</div>`;

            marker.bindPopup(popupContent);
            markersRef.current.push(marker);
        });
    }, [pins]);

    // Filter for display count
    const validPins = pins.filter(p => p.latitude && p.longitude);

    return (
        <Card className="h-[400px] lg:h-[600px] w-full p-0 overflow-hidden relative border-none shadow-sm">
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur pb-2 px-4 pt-3 rounded-lg shadow-sm border pointer-events-none">
                <Title>Live Fleet Assets</Title>
                <Subtitle>Tracking {validPins.length} vehicles</Subtitle>
            </div>

            <div ref={mapContainerRef} className="h-full w-full z-0" />
        </Card>
    );
}
