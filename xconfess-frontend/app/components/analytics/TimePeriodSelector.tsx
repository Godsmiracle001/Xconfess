"use client";

import React from 'react';

interface TimePeriodSelectorProps {
    selected: '7d' | '30d';
    onChange: (period: '7d' | '30d') => void;
}

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
    selected,
    onChange
}) => {
    return (
        <div className="inline-flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            <button
                onClick={() => onChange('7d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selected === '7d'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                aria-label="Show 7 days data"
            >
                7 Days
            </button>
            <button
                onClick={() => onChange('30d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selected === '30d'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`}
                aria-label="Show 30 days data"
            >
                30 Days
            </button>
        </div>
    );
};
