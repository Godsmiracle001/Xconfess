import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: LucideIcon;
    color: string;
    loading?: boolean;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
    title,
    value,
    change,
    icon: Icon,
    color,
    loading = false,
}) => {
    if (loading) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 bg-zinc-800 rounded-xl" />
                    <div className="w-16 h-4 bg-zinc-800 rounded" />
                </div>
                <div className="w-24 h-8 bg-zinc-800 rounded mb-2" />
                <div className="w-32 h-4 bg-zinc-800 rounded" />
            </div>
        );
    }

    const isPositive = change && change > 0;

    return (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 transition-all hover:border-zinc-700 group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                </div>
                {change !== undefined && (
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                        {isPositive ? '+' : ''}{change}%
                    </div>
                )}
            </div>
            <h3 className="text-zinc-400 text-sm font-medium mb-1">{title}</h3>
            <div className="text-3xl font-bold text-white tracking-tight">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );
};
