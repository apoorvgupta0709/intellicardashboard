"use client";

import { useEffect, useState } from 'react';
import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Text, Title, Badge, Button, TextInput, Select, SelectItem } from '@tremor/react';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import Papa from 'papaparse';

type DeviceMap = {
    id: string;
    device_id: string;
    battery_serial: string | null;
    vehicle_number: string | null;
    customer_name: string | null;
    dealer_id: string | null;
    is_active: boolean;
    comm_status?: { status: string; last_seen: string };
};

export default function DeviceManagementPage() {
    const [devices, setDevices] = useState<DeviceMap[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        device_id: '',
        battery_serial: '',
        vehicle_number: '',
        customer_name: '',
        dealer_id: '',
        is_active: 'true'
    });

    const fetchMappings = () => {
        Promise.all([
            fetch('/api/telemetry/devices/mapping').then(res => res.json()),
            fetch('/api/telemetry/devices/status').then(res => res.json())
        ])
            .then(([devicesJson, statusJson]) => {
                if (Array.isArray(devicesJson)) {
                    // Merge status into devices
                    const statusMap = new Map();
                    if (Array.isArray(statusJson)) {
                        statusJson.forEach((s: any) => statusMap.set(s.device_id, s));
                    }
                    const merged = devicesJson.map(dev => ({
                        ...dev,
                        comm_status: statusMap.get(dev.device_id)
                    }));
                    setDevices(merged);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchMappings();
    }, []);

    const handleOpenAdd = () => {
        setEditingId(null);
        setFormData({
            device_id: '',
            battery_serial: '',
            vehicle_number: '',
            customer_name: '',
            dealer_id: '',
            is_active: 'true'
        });
        setIsFormOpen(true);
    };

    const handleOpenEdit = (device: DeviceMap) => {
        setEditingId(device.id);
        setFormData({
            device_id: device.device_id,
            battery_serial: device.battery_serial || '',
            vehicle_number: device.vehicle_number || '',
            customer_name: device.customer_name || '',
            dealer_id: device.dealer_id || '',
            is_active: device.is_active ? 'true' : 'false'
        });
        setIsFormOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            is_active: formData.is_active === 'true',
            id: editingId
        };

        const method = editingId ? 'PATCH' : 'POST';

        try {
            const res = await fetch('/api/telemetry/devices/mapping', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsFormOpen(false);
                fetchMappings();
            } else {
                alert("Failed to save device mapping");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving mapping");
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const res = await fetch('/api/telemetry/devices/mapping/bulk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(results.data),
                    });
                    if (res.ok) {
                        alert(`Successfully uploaded and mapped devices.`);
                        fetchMappings();
                    } else {
                        throw new Error('Upload failed');
                    }
                } catch (err) {
                    console.error('Bulk upload error:', err);
                    alert('Error mapping devices from CSV.');
                    setLoading(false);
                }
                // Reset standard file input value to allow uploading same file again
                e.target.value = '';
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        Device Management
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Map Intellicar IoT devices to physical battery serials and assign vehicles.
                    </p>
                </div>
                <div className="flex space-x-3">
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="secondary" icon={ArrowUpTrayIcon}>
                            Bulk Import CSV
                        </Button>
                    </div>
                    <Button icon={PlusIcon} onClick={handleOpenAdd}>
                        Add New Device
                    </Button>
                </div>
            </div>

            {isFormOpen && (
                <Card className="bg-gray-50 border-blue-200 border-2">
                    <Title>{editingId ? 'Edit Device Mapping' : 'Map New Device'}</Title>
                    <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Text className="mb-1 font-medium">Device ID (Hardware IMEI) *</Text>
                            <TextInput
                                placeholder="e.g. TK-51105-04HY"
                                required
                                value={formData.device_id}
                                onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                            />
                        </div>
                        <div>
                            <Text className="mb-1 font-medium">Battery Serial Number</Text>
                            <TextInput
                                placeholder="e.g. BATT-2024-X844"
                                value={formData.battery_serial}
                                onChange={(e) => setFormData({ ...formData, battery_serial: e.target.value })}
                            />
                        </div>
                        <div>
                            <Text className="mb-1 font-medium">Vehicle Reg Number</Text>
                            <TextInput
                                placeholder="e.g. UP32 AT 1234"
                                value={formData.vehicle_number}
                                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <Text className="mb-1 font-medium">Customer Name</Text>
                            <TextInput
                                placeholder="Owner Name"
                                value={formData.customer_name}
                                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Text className="mb-1 font-medium">Dealer ID</Text>
                            <TextInput
                                placeholder="Assigned Dealer"
                                value={formData.dealer_id}
                                onChange={(e) => setFormData({ ...formData, dealer_id: e.target.value })}
                            />
                        </div>
                        <div>
                            <Text className="mb-1 font-medium">Status</Text>
                            <Select value={formData.is_active} onValueChange={(v) => setFormData({ ...formData, is_active: v })}>
                                <SelectItem value="true">Active</SelectItem>
                                <SelectItem value="false">Inactive</SelectItem>
                            </Select>
                        </div>
                        <div className="md:col-span-2 flex justify-end space-x-3 mt-2">
                            <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            <Button type="submit">Save Mapping</Button>
                        </div>
                    </form>
                </Card>
            )}

            <Card>
                {loading ? (
                    <div className="py-12 flex justify-center text-gray-400">Loading configurations...</div>
                ) : devices.length === 0 ? (
                    <div className="py-12 flex justify-center text-gray-400">No device mappings found.</div>
                ) : (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Device ID</TableHeaderCell>
                                <TableHeaderCell>Battery Serial</TableHeaderCell>
                                <TableHeaderCell>Assignment Details</TableHeaderCell>
                                <TableHeaderCell>Network Status</TableHeaderCell>
                                <TableHeaderCell>Config</TableHeaderCell>
                                <TableHeaderCell className="text-right">Action</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {devices.map((device) => (
                                <TableRow key={device.id}>
                                    <TableCell>
                                        <Text className="font-medium text-gray-900">{device.device_id}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text>{device.battery_serial || <span className="text-gray-400 italic">Unmapped</span>}</Text>
                                    </TableCell>
                                    <TableCell>
                                        <Text>{device.vehicle_number || 'Unregistered Vehicle'}</Text>
                                        {(device.customer_name || device.dealer_id) && (
                                            <Text className="text-xs text-gray-500 mt-1">
                                                {device.customer_name && `Cust: ${device.customer_name}`}
                                                {device.customer_name && device.dealer_id && ' | '}
                                                {device.dealer_id && `Dealer: ${device.dealer_id}`}
                                            </Text>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {device.comm_status ? (
                                            <div>
                                                <Badge color={device.comm_status.status === 'Active' ? 'emerald' : device.comm_status.status === 'Warning' ? 'amber' : 'rose'}>
                                                    {device.comm_status.status}
                                                </Badge>
                                                <Text className="text-xs text-gray-500 mt-1">
                                                    {new Date(device.comm_status.last_seen).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </div>
                                        ) : (
                                            <Badge color="gray">Unknown</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge color={device.is_active ? 'blue' : 'gray'} tooltip="Configured Tracking State">
                                            {device.is_active ? 'Active' : 'Disabled'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button size="xs" variant="secondary" onClick={() => handleOpenEdit(device)}>Edit</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
