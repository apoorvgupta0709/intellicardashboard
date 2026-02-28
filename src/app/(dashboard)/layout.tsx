import Link from 'next/link';
import { HomeIcon, Battery50Icon, MapIcon, BellAlertIcon } from '@heroicons/react/24/outline';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Intellicar Dashboard
                    </span>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto w-full">
                    <Link
                        href="/battery-monitoring"
                        className="flex items-center space-x-3 px-3 py-2 rounded-md bg-blue-50 text-blue-700 text-sm font-medium"
                    >
                        <Battery50Icon className="h-5 w-5 text-blue-600" />
                        <span>Battery Monitoring</span>
                    </Link>
                    <div className="px-3 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Coming Soon
                    </div>
                    <a className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium cursor-not-allowed opacity-50">
                        <MapIcon className="h-5 w-5" />
                        <span>Live Map (TBD)</span>
                    </a>
                    <a className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 text-gray-700 text-sm font-medium cursor-not-allowed opacity-50">
                        <BellAlertIcon className="h-5 w-5" />
                        <span>Alerts & Rules (TBD)</span>
                    </a>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
