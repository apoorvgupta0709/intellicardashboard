"use client";

import { useEffect, useRef, useState } from 'react';
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

function createColoredIcon(color: string) {
    return L.divIcon({
        html: `<div style="
            width: 14px; height: 14px;
            background: ${color};
            border: 2.5px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
}

const STATUS_ICONS: Record<string, L.DivIcon> = {
    healthy: createColoredIcon('#22c55e'),
    warning: createColoredIcon('#f59e0b'),
    critical: createColoredIcon('#ef4444'),
    offline: createColoredIcon('#6b7280'),
};

function getDeviceStatus(pin: PinInfo): string {
    if (pin.alert_status === 'critical') return 'critical';
    if (pin.alert_status === 'warning') return 'warning';
    if (pin.soc !== null && pin.soc < 20) return 'critical';
    if (pin.soc !== null && pin.soc < 50) return 'warning';
    return 'healthy';
}

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
            .then((res) => res.json())
            .then((json) => {
                if (Array.isArray(json)) setPins(json);
            })
            .catch(console.error);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
        }).setView([28.6139, 77.209], 10);

        // Use a clean, modern tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapRef.current = map;

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

        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        const validPins = pins.filter((p) => p.latitude && p.longitude);

        validPins.forEach((pin) => {
            const status = getDeviceStatus(pin);
            const icon = STATUS_ICONS[status] || STATUS_ICONS.offline;

            const marker = L.marker(
                [pin.latitude as number, pin.longitude as number],
                { icon }
            ).addTo(mapRef.current!);

            const popupContent = `
                <div style="font-family: system-ui; font-size: 13px; min-width: 160px;">
                    <div style="font-weight: 700; margin-bottom: 6px; color: #0f172a;">${pin.device_id}</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <span style="color: #64748b;">SOC</span>
                        <span style="font-weight: 600; text-align: right;">${pin.soc ?? '—'}%</span>
                        <span style="color: #64748b;">SOH</span>
                        <span style="font-weight: 600; text-align: right;">${pin.soh ?? '—'}%</span>
                    </div>
                    ${pin.alert_status ? `<div style="margin-top: 6px; padding: 3px 8px; background: #fef2f2; color: #dc2626; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: capitalize;">${pin.alert_status} Alert</div>` : ''}
                </div>`;

            marker.bindPopup(popupContent, {
                closeButton: false,
                className: 'custom-popup',
            });
            markersRef.current.push(marker);
        });
    }, [pins]);

    const validPins = pins.filter((p) => p.latitude && p.longitude);

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden relative h-[400px] lg:h-[600px] shadow-sm">
            {/* Overlay info card */}
            <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-md border border-slate-100 pointer-events-none">
                <h3 className="text-sm font-bold text-slate-900">Live Fleet Assets</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                    Tracking <span className="font-semibold text-emerald-600">{validPins.length}</span> vehicles
                </p>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-100 pointer-events-none">
                <div className="flex flex-wrap gap-3 text-[10px] font-medium text-slate-600">
                    {[
                        { color: '#22c55e', label: 'Healthy (SOC > 50%)' },
                        { color: '#f59e0b', label: 'Warning (SOC 20-50%)' },
                        { color: '#ef4444', label: 'Critical (SOC < 20%)' },
                        { color: '#6b7280', label: 'Offline' },
                    ].map((item) => (
                        <div key={item.label} className="flex items-center gap-1.5">
                            <span
                                className="w-2.5 h-2.5 rounded-full inline-block border border-white shadow-sm"
                                style={{ background: item.color }}
                            />
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>

            <div ref={mapContainerRef} className="h-full w-full z-0" />
        </div>
    );
}
