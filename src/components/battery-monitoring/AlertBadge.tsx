"use client";

/**
 * AlertBadge — Standalone severity indicator component (#69)
 * Renders a colored badge for alert severity levels.
 * Reusable across Alert pages, feeds, and inline indicators.
 */

interface AlertBadgeProps {
    severity: 'critical' | 'warning' | 'info';
    className?: string;
}

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        ring: 'ring-red-200',
        dot: 'bg-red-500',
        label: 'Critical',
    },
    warning: {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        ring: 'ring-amber-200',
        dot: 'bg-amber-500',
        label: 'Warning',
    },
    info: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        ring: 'ring-blue-200',
        dot: 'bg-blue-500',
        label: 'Info',
    },
};

export default function AlertBadge({ severity, className = '' }: AlertBadgeProps) {
    const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.info;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${style.bg} ${style.text} ${style.ring} ${className}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.label}
        </span>
    );
}
