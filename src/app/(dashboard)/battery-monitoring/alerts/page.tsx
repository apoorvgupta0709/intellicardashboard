"use client";

import { useEffect, useState } from 'react';
import AlertsTable from '@/components/battery-monitoring/AlertsTable';
import AlertBadge from '@/components/battery-monitoring/AlertBadge';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { Card, Title, Text, Button, TextInput, Badge } from '@tremor/react';

/**
 * Alerts & Event Rules Page (#65-66, 70)
 * Now includes:
 *  - AlertsTable (existing)
 *  - Alert Configuration panel — editable thresholds for all alert types
 */

interface ThresholdConfig {
    value: number;
    severity: string;
    label: string;
}

type AlertConfig = Record<string, ThresholdConfig>;

export default function AlertsMonitoringPage() {
    const [config, setConfig] = useState<AlertConfig | null>(null);
    const [editedConfig, setEditedConfig] = useState<AlertConfig | null>(null);
    const [configLoading, setConfigLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => {
        fetch('/api/telemetry/alerts/config')
            .then((res) => res.json())
            .then((json) => {
                setConfig(json);
                setEditedConfig(JSON.parse(JSON.stringify(json)));
            })
            .catch(console.error)
            .finally(() => setConfigLoading(false));
    }, []);

    const handleSave = async () => {
        if (!editedConfig) return;
        setSaving(true);
        try {
            const res = await fetch('/api/telemetry/alerts/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editedConfig),
            });
            if (res.ok) {
                setConfig(JSON.parse(JSON.stringify(editedConfig)));
                alert('Alert thresholds saved successfully.');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to save configuration.');
            }
        } catch {
            alert('Error saving configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (config) {
            setEditedConfig(JSON.parse(JSON.stringify(config)));
        }
    };

    const updateThreshold = (key: string, value: number) => {
        if (!editedConfig) return;
        setEditedConfig({
            ...editedConfig,
            [key]: { ...editedConfig[key], value },
        });
    };

    const hasChanges =
        config && editedConfig && JSON.stringify(config) !== JSON.stringify(editedConfig);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header & Breadcrumbs */}
            <div>
                <Link
                    href="/battery-monitoring"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 mb-4"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-1" />
                    Back to Fleet Overview
                </Link>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                            Alerts & Event Rules
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Review automated battery anomalies, triage warnings, and acknowledge
                            critical incidents.
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => setShowConfig(!showConfig)}
                    >
                        {showConfig ? 'Hide Configuration' : '⚙ Configure Thresholds'}
                    </Button>
                </div>
            </div>

            {/* Alert Configuration Panel */}
            {showConfig && (
                <Card className="border-2 border-blue-100">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <Title>Alert Threshold Configuration</Title>
                            <Text>
                                Set the threshold values that trigger automated alerts.
                                Changes apply fleet-wide.
                            </Text>
                        </div>
                        {hasChanges && (
                            <Badge color="amber" size="sm">
                                Unsaved Changes
                            </Badge>
                        )}
                    </div>

                    {configLoading ? (
                        <div className="py-8 text-center text-gray-400 animate-pulse">
                            Loading configuration...
                        </div>
                    ) : editedConfig ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(editedConfig).map(([key, threshold]) => (
                                    <div
                                        key={key}
                                        className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <Text className="font-medium text-gray-700 text-sm">
                                                {threshold.label}
                                            </Text>
                                            <AlertBadge
                                                severity={
                                                    threshold.severity as
                                                    | 'critical'
                                                    | 'warning'
                                                    | 'info'
                                                }
                                            />
                                        </div>
                                        <TextInput
                                            type="number"
                                            value={String(threshold.value)}
                                            onChange={(e) =>
                                                updateThreshold(
                                                    key,
                                                    parseFloat(e.target.value) || 0
                                                )
                                            }
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
                                <Button
                                    variant="secondary"
                                    onClick={handleReset}
                                    disabled={!hasChanges}
                                >
                                    Reset
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasChanges}
                                    loading={saving}
                                >
                                    Save Thresholds
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="py-8 text-center text-gray-400">
                            Failed to load configuration.
                        </div>
                    )}
                </Card>
            )}

            <AlertsTable />
        </div>
    );
}
