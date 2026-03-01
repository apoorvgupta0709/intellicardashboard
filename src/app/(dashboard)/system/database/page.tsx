'use client';

import { useEffect, useState } from 'react';
import { Card, Title, Text, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge } from '@tremor/react';
import { CircleStackIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface DatabaseTableRecord {
    schema_name: string;
    table_name: string;
    row_count: number;
    total_size: string;
    size_bytes: number;
    oldest_record: string | null;
    newest_record: string | null;
}

export default function DatabaseMonitorPage() {
    const [tables, setTables] = useState<DatabaseTableRecord[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<boolean>(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const fetchStats = async () => {
            try {
                const res = await fetch('/api/system/database-monitor');
                if (!res.ok) throw new Error('Failed to fetch database stats');
                const data: DatabaseTableRecord[] = await res.json();
                setTables(data);
                setError(false); // Clear error on successful fetch
            } catch (err) {
                console.error("Failed to fetch database stats:", err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        interval = setInterval(fetchStats, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return <Text className="text-gray-400">N/A</Text>;
        try {
            return format(new Date(dateString), 'MMM d, yyyy HH:mm:ss');
        } catch {
            return <Text className="truncate w-32">{dateString}</Text>;
        }
    };

    return (
        <main className="p-4 md:p-10 mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Title className="text-3xl font-bold flex items-center gap-2">
                        <CircleStackIcon className="w-8 h-8 text-blue-500" />
                        Database Monitor
                    </Title>
                    <Text>Live overview of all tables, storage sizes, and data retention windows.</Text>
                </div>
            </div>

            {error ? (
                <Card className="bg-red-50 border-red-200">
                    <Text className="text-red-600">Failed to load database statistics. Ensure you have admin permissions.</Text>
                </Card>
            ) : (
                <Card>
                    <Table className="mt-4">
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Schema</TableHeaderCell>
                                <TableHeaderCell>Table Name</TableHeaderCell>
                                <TableHeaderCell className="text-right">Row Count (Est.)</TableHeaderCell>
                                <TableHeaderCell className="text-right">Total Size</TableHeaderCell>
                                <TableHeaderCell>Data Since (Oldest)</TableHeaderCell>
                                <TableHeaderCell>Newest Record</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                // Loading skeleton
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto" /></TableCell>
                                        <TableCell><div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto" /></TableCell>
                                        <TableCell><div className="h-4 w-36 bg-gray-200 rounded animate-pulse" /></TableCell>
                                        <TableCell><div className="h-4 w-36 bg-gray-200 rounded animate-pulse" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                tables?.map((table: DatabaseTableRecord) => (
                                    <TableRow key={`${table.schema_name}.${table.table_name}`}>
                                        <TableCell>
                                            <Badge color={table.schema_name === 'telemetry' ? 'indigo' : 'gray'} size="xs">
                                                {table.schema_name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-900">{table.table_name}</TableCell>
                                        <TableCell className="text-right tabular-nums text-gray-700">
                                            {formatNumber(table.row_count)}
                                        </TableCell>
                                        <TableCell className="text-right tabular-nums text-gray-700">
                                            {table.total_size}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                {table.oldest_record && <ClockIcon className="w-4 h-4 text-gray-400" />}
                                                {formatDate(table.oldest_record)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-600">
                                            {formatDate(table.newest_record)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </main>
    );
}
