"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'ceo' | 'dealer';

export interface AuthState {
    role: UserRole;
    dealer_id: string | null;
}

export interface AuthContextType extends AuthState {
    setRole: (role: UserRole, dealerId?: string | null) => void;
}

const defaultState: AuthState = {
    role: 'ceo', // Default to CEO view (sees everything)
    dealer_id: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [authState, setAuthState] = useState<AuthState>(defaultState);

    // Load from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem('intellicar_mock_auth');
        if (stored) {
            try {
                setAuthState(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse mock auth state", e);
            }
        }
    }, []);

    const setRole = (role: UserRole, dealerId: string | null = null) => {
        const newState = { role, dealer_id: dealerId };
        setAuthState(newState);
        localStorage.setItem('intellicar_mock_auth', JSON.stringify(newState));
        // Trigger a full page reload so all data fetching re-runs with the new headers
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{ ...authState, setRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
