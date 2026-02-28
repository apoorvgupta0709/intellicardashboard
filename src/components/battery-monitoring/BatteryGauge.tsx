"use client";

/**
 * BatteryGauge — Radial SOC gauge component (#48)
 * Renders a circular progress ring showing State of Charge percentage.
 * Color-coded: green (>50%), yellow (20-50%), red (<20%).
 */

interface BatteryGaugeProps {
    soc: number;
    size?: number;
    label?: string;
}

export default function BatteryGauge({ soc, size = 160, label = "SOC" }: BatteryGaugeProps) {
    const clampedSoc = Math.max(0, Math.min(100, soc));

    // SVG calculations
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clampedSoc / 100) * circumference;
    const center = size / 2;

    // Color based on SOC level
    const getColor = (value: number) => {
        if (value > 50) return { stroke: '#10b981', bg: '#ecfdf5', text: '#065f46' }; // green
        if (value > 20) return { stroke: '#f59e0b', bg: '#fffbeb', text: '#92400e' }; // yellow
        return { stroke: '#ef4444', bg: '#fef2f2', text: '#991b1b' }; // red
    };

    const colors = getColor(clampedSoc);

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="transform -rotate-90"
                >
                    {/* Background track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={strokeWidth}
                    />
                    {/* Progress arc */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                    />
                </svg>
                {/* Center text */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ color: colors.text }}
                >
                    <span className="text-3xl font-bold leading-none">
                        {Math.round(clampedSoc)}
                    </span>
                    <span className="text-xs font-medium text-gray-500 mt-0.5">%</span>
                </div>
            </div>
            <span className="text-xs font-semibold text-gray-600 mt-2 tracking-wide uppercase">
                {label}
            </span>
        </div>
    );
}
