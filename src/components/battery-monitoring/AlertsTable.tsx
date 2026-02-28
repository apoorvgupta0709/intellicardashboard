"use client";

import { useEffect, useState } from 'react';
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Text, Title, Badge, Button, Select, SelectItem } from '@tremor/react';

type AlertRow = {
    id: number;
    device_id: string;
    vehicle_number: string | null;
    alert_type: string;
    severity: string;
    message: string;
    created_at: string;
    acknowledged: boolean;
    resolved_at: string | null;
};

export default function AlertsTable() {
    const [alerts, setAlerts] = useState<AlertRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>("active");

    const fetchAlerts = (statusFilter: string) => {
        const query = statusFilter === 'all' ? '' : `?acknowledged=${statusFilter === 'acknowledged'}`;

        fetch(`/api/telemetry/alerts${query}`)
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setAlerts(json);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAlerts(filter);
    }, [filter]);

    const handleAcknowledge = async (id: number) => {
        try {
            const res = await fetch('/api/telemetry/alerts/acknowledge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alertId: id, resolvedNotes: 'Acknowledged via Dashboard' })
            });
            if (res.ok) {
                // Optimistically remove from list if we are currently filtering for active only
                if (filter === 'active') {
                    setAlerts(prev => prev.filter(a => a.id !== id));
                } else {
                    // Otherwise just refresh the list to show the new acknowledged status
                    fetchAlerts(filter);
                }
            }
        } catch (err) {
            console.error('Failed to acknowledge', err);
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <Title>System Alerts Dashboard</Title>
                <div className="w-56">
                    <Select value={filter} onValueChange={(val) => { setLoading(true); setFilter(val); }}>
                        <SelectItem value="active">Active (Unacknowledged)</SelectItem>
                        <SelectItem value="acknowledged">Acknowledged/Resolved</SelectItem>
                        <SelectItem value="all">All Alerts</SelectItem>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center text-gray-400">Loading alerts data...</div>
            ) : (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Time Detected</TableHeaderCell>
                            <TableHeaderCell>Severity</TableHeaderCell>
                            <TableHeaderCell>Device / Vehicle</TableHeaderCell>
                            <TableHeaderCell>Type</TableHeaderCell>
                            <TableHeaderCell>Message</TableHeaderCell>
                            <TableHeaderCell>Status</TableHeaderCell>
                            <TableHeaderCell className="text-right">Action</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {alerts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No alerts found matching the current filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            alerts.map((alert) => (
                                <TableRow key={alert.id}>
                                    <TableCell><Text>{new Date(alert.created_at).toLocaleString()}</Text></TableCell>
                                    <TableCell>
                                        <Badge color={alert.severity === 'critical' ? 'red' : 'amber'} size="xs">
                                            {alert.severity}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Text className="font-medium text-gray-900">{alert.vehicle_number || alert.device_id}</Text>
                                        <Text className="text-xs text-gray-500">{alert.device_id}</Text>
                                    </TableCell>
                                    <TableCell><Text>{alert.alert_type}</Text></TableCell>
                                    <TableCell><Text className="max-w-xs truncate" title={alert.message}>{alert.message}</Text></TableCell>
                                    <TableCell>
                                        {alert.acknowledged ? (
                                            <Badge color="green" size="xs">Resolved</Badge>
                                        ) : (
                                            <Badge color="blue" size="xs">Active</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!alert.acknowledged && (
                                            <Button
                                                size="xs"
                                                color="blue"
                                                variant="secondary"
                                                onClick={() => handleAcknowledge(alert.id)}
                                            >
                                                Acknowledge
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            )}
        </Card>
    );
}
