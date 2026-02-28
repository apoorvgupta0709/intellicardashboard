"use client";

import { useAuth } from '@/lib/auth/AuthContext';
import { Select, SelectItem, Text } from '@tremor/react';

export function RoleSwitcher() {
    const { role, dealer_id, setRole } = useAuth();

    return (
        <div className="flex items-center space-x-4">
            <Text className="text-sm font-medium text-gray-500">View As:</Text>
            <Select
                value={role === 'ceo' ? 'ceo' : dealer_id || 'dealer'}
                onValueChange={(val) => {
                    if (val === 'ceo') setRole('ceo', null);
                    else setRole('dealer', val);
                }}
                className="w-48"
            >
                <SelectItem value="ceo">CEO (All Data)</SelectItem>
                <SelectItem value="DLR-001">Dealer DLR-001</SelectItem>
                <SelectItem value="DLR-002">Dealer DLR-002</SelectItem>
            </Select>
        </div>
    );
}
