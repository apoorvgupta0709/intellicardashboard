"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Battery50Icon,
    ChartBarIcon,
    BellAlertIcon,
    WrenchScrewdriverIcon,
    MapIcon,
    HeartIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { RoleSwitcher } from '@/components/battery-monitoring/RoleSwitcher';

const navItems = [
    {
        label: 'Fleet Overview',
        href: '/battery-monitoring',
        icon: Squares2X2Icon,
        exact: true,
    },
    {
        label: 'Trip Analytics',
        href: '/battery-monitoring/trips',
        icon: MapIcon,
    },
    {
        label: 'Health & Analytics',
        href: '/battery-monitoring/health',
        icon: HeartIcon,
    },
    {
        label: 'Alerts & Rules',
        href: '/battery-monitoring/alerts',
        icon: BellAlertIcon,
    },
    {
        label: 'Device Management',
        href: '/battery-monitoring/devices',
        icon: WrenchScrewdriverIcon,
    },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    function isActive(item: (typeof navItems)[0]) {
        if (item.exact) return pathname === item.href;
        return pathname.startsWith(item.href);
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col shadow-xl">
                {/* Logo */}
                <div className="h-16 flex items-center px-6 border-b border-slate-700/50">
                    <div className="flex items-center space-x-2">
                        <Battery50Icon className="h-7 w-7 text-emerald-400" />
                        <span className="text-lg font-bold text-white tracking-tight">
                            iTarang
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
                    <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                        Battery Monitoring
                    </p>
                    {navItems.map((item) => {
                        const active = isActive(item);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`
                                    group flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                                    ${active
                                        ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
                                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                    }
                                `}
                            >
                                <item.icon className={`h-5 w-5 flex-shrink-0 transition-colors ${active ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-4 py-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 text-center">
                        © 2026 iTarang Technologies
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
                    <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-semibold text-slate-700">
                            Battery Fleet Dashboard
                        </h2>
                        <span className="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-0.5 rounded-full">
                            Live
                        </span>
                    </div>
                    <RoleSwitcher />
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
