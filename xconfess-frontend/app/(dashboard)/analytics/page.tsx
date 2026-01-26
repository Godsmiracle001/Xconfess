"use client";

import React, { useState, useEffect } from 'react';
import { MetricsCard } from '@/app/components/analytics/MetricsCard';
import { ActivityChart } from '@/app/components/analytics/ActivityChart';
import { ReactionDistribution } from '@/app/components/analytics/ReactionDistribution';
import { TrendingConfessions } from '@/app/components/analytics/TrendingConfessions';
import { TimePeriodSelector } from '@/app/components/analytics/TimePeriodSelector';
import {
    MessageSquare,
    Users,
    Heart,
    Activity,
    TrendingUp,
    AlertCircle
} from 'lucide-react';

interface AnalyticsData {
    metrics: {
        totalConfessions: number;
        totalUsers: number;
        totalReactions: number;
        activeUsers: number;
        confessionsChange: number;
        usersChange: number;
        reactionsChange: number;
        activeChange: number;
    };
    trendingConfessions: Array<{
        id: string;
        message: string;
        category?: string;
        reactions: any;
        viewCount: number;
        createdAt: string;
    }>;
    reactionDistribution: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    activityData: Array<{
        date: string;
        confessions: number;
        users: number;
        reactions: number;
    }>;
}

export default function AnalyticsPage() {
    const [period, setPeriod] = useState<'7d' | '30d'>('7d');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem('accessToken');
                const response = await fetch(`/api/analytics?period=${period}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                const analyticsData = await response.json();
                setData(analyticsData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [period]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            <TrendingUp className="w-8 h-8 text-blue-500" />
                            Analytics Dashboard
                        </h1>
                        <p className="text-zinc-400">
                            Platform insights and trending confessions
                        </p>
                    </div>

                    <TimePeriodSelector selected={period} onChange={setPeriod} />
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-900/20 border border-red-700 rounded-2xl p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-red-300 font-medium">Error loading analytics</p>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricsCard
                        title="Total Confessions"
                        value={data?.metrics.totalConfessions ?? 0}
                        change={data?.metrics.confessionsChange}
                        icon={MessageSquare}
                        color="text-blue-500"
                        loading={loading}
                    />
                    <MetricsCard
                        title="Total Users"
                        value={data?.metrics.totalUsers ?? 0}
                        change={data?.metrics.usersChange}
                        icon={Users}
                        color="text-emerald-500"
                        loading={loading}
                    />
                    <MetricsCard
                        title="Total Reactions"
                        value={data?.metrics.totalReactions ?? 0}
                        change={data?.metrics.reactionsChange}
                        icon={Heart}
                        color="text-rose-500"
                        loading={loading}
                    />
                    <MetricsCard
                        title="Active Users"
                        value={data?.metrics.activeUsers ?? 0}
                        change={data?.metrics.activeChange}
                        icon={Activity}
                        color="text-purple-500"
                        loading={loading}
                    />
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="lg:col-span-2">
                        <ActivityChart
                            data={data?.activityData ?? []}
                            loading={loading}
                        />
                    </div>
                    <div>
                        <ReactionDistribution
                            data={data?.reactionDistribution ?? []}
                            loading={loading}
                        />
                    </div>
                </div>

                {/* Trending Confessions */}
                <TrendingConfessions
                    confessions={data?.trendingConfessions ?? []}
                    loading={loading}
                />
            </div>
        </div>
    );
}
