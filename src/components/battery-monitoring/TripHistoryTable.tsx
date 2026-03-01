"use client";

import { useEffect, useState } from 'react';
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Text, Title, Badge } from '@tremor/react';

type TripSummary = {
    device_id: string;
    vehicle_number: string | null;
    customer_name: string | null;
    trip_start_time: string;
    trip_end_time: string;
    // GPS-synthesized fields
    gps_points?: number;
    max_speed?: number;
    avg_speed?: number;
    // Legacy trip table fields (when trip_summaries exists)
    distance_km?: number;
    energy_consumed_kwh?: number;
    efficiency_km_per_kwh?: number | null;
};

export default function TripHistoryTable({ limit = 50, deviceId }: { limit?: number; deviceId?: string }) {
    const [trips, setTrips] = useState<TripSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const url = deviceId
            ? `/api/telemetry/devices/${deviceId}/trips?limit=${limit}`
            : `/api/telemetry/trips/overview?limit=${limit}`;

        fetch(url)
            .then(res => res.json())
            .then(json => {
                if (Array.isArray(json)) setTrips(json);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [deviceId, limit]);

    return (
        <Card>
            <Title>Recent Fleet Trip Summaries</Title>
            <Text>Overview of completed delivery runs and movement data.</Text>

            {loading ? (
                <div className="py-12 flex justify-center text-gray-400">Loading trip history...</div>
            ) : trips.length === 0 ? (
                <div className="py-12 flex justify-center text-gray-400 italic">No trip summaries recorded yet.</div>
            ) : (
                <Table className="mt-4">
                    <TableHead>
                        <TableRow>
                            <TableHeaderCell>Completed</TableHeaderCell>
                            <TableHeaderCell>Vehicle</TableHeaderCell>
                            <TableHeaderCell>Duration</TableHeaderCell>
                            <TableHeaderCell className="text-right">GPS Points</TableHeaderCell>
                            <TableHeaderCell className="text-right">Max Speed (km/h)</TableHeaderCell>
                            <TableHeaderCell className="text-right">Avg Speed (km/h)</TableHeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {trips.map((trip, idx) => {
                            const start = new Date(trip.trip_start_time);
                            const end = new Date(trip.trip_end_time);
                            const durationMs = end.getTime() - start.getTime();
                            const durationMinutes = Math.round(durationMs / 60000);

                            return (
                                <TableRow key={`${trip.device_id}-${idx}`}>
                                    <TableCell>
                                        <Text>{end.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text className="font-medium text-gray-900">{trip.vehicle_number || trip.device_id}</Text>
                                        <Text className="text-xs text-gray-500">{trip.customer_name || 'Unassigned'}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text>{durationMinutes > 60 ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m` : `${durationMinutes}m`}</Text>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Text>{trip.gps_points ?? '—'}</Text>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge color={Number(trip.max_speed) > 40 ? "amber" : "green"}>
                                            {Number(trip.max_speed || 0).toFixed(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Text>{Number(trip.avg_speed || 0).toFixed(1)}</Text>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </Card>
    );
}
