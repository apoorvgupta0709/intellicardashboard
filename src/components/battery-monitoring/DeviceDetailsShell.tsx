"use client";

import { useEffect, useState } from 'react';
import DeviceDetailsCard from './DeviceDetailsCard';

// Extracted from page.tsx to resolve "use client" boundaries properly
export default function DeviceDetailsShell({ deviceId }: { deviceId: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [device, setDevice] = useState<any>(null);

    useEffect(() => {
        fetch(`/api/telemetry/devices/${deviceId}`)
            .then(res => res.json())
            .then(json => {
                if (!json.error) setDevice(json);
            })
            .catch(console.error);
    }, [deviceId]);

    return <DeviceDetailsCard device={device} />;
}
