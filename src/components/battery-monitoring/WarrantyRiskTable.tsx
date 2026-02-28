"use client";

import { useEffect, useState } from 'react';
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Text, Title, Badge } from '@tremor/react';

type WarrantyBattery = {
    device_id: string;
    soh: number | null;
    charge_cycle: number | null;
    last_reading_time: string;
    vehicle_number: string | null;
    customer_name: string | null;
    dealer_id: string;
    battery_serial: string | null;
};

export default function WarrantyRiskTable() {
    const [atRisk, setAtRisk] = useState<WarrantyBattery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch devices with SOH < 80% or charge cycles > 1500
        fetch('/api/telemetry/analytics/warranty?soh=80&cycles=1500')
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setAtRisk(json);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <Card>
            <Title>Warranty Risk Assessment</Title>
            <Text>Batteries flagged for dropping below 80% SOH or exceeding 1500 charge cycles.</Text>

            {loading ? (
                <div className="py-12 flex justify-center text-gray-400">Scanning fleet for warranty risks...</div>
            ) : atRisk.length === 0 ? (
                <div className="py-12 flex justify-center text-emerald-500 font-medium bg-emerald-50 mt-4 rounded border border-emerald-100">
                    No batteries currently flagged for warranty risk.
                </div>
            ) : (
                <Table className="mt-4">
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Device / Vehicle</TableHeaderCell>
                            <TableHeaderCell>Battery Serial</TableHeaderCell>
                            <TableHeaderCell>Dealer</TableHeaderCell>
                            <TableHeaderCell className="text-right">SOH</TableHeaderCell>
                            <TableHeaderCell className="text-right">Charge Cycles</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {atRisk.map((device) => (
                            <TableRow key={device.device_id}>
                                <TableCell>
                                    <Text className="font-medium text-gray-900">{device.vehicle_number || device.device_id}</Text>
                                    <Text className="text-xs text-gray-500">{device.customer_name || 'Unassigned'}</Text>
                                </TableCell>
                                <TableCell>
                                    <Text>{device.battery_serial || 'Unmapped'}</Text>
                                </TableCell>
                                <TableCell>
                                    <Text className="truncate max-w-[150px]">{device.dealer_id}</Text>
                                </TableCell>
                                <TableCell className="text-right">
                                    {(device.soh !== null && device.soh < 80) ? (
                                        <Badge color="red">{device.soh}%</Badge>
                                    ) : (
                                        <Text>{device.soh ?? '-'}%</Text>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    {(device.charge_cycle !== null && device.charge_cycle > 1500) ? (
                                        <Badge color="amber">{device.charge_cycle}</Badge>
                                    ) : (
                                        <Text>{device.charge_cycle ?? '-'}</Text>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Card>
    );
}
