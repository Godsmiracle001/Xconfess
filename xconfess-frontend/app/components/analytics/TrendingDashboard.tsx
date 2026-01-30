"use client";

import { useState, useEffect } from "react";
import { AnalyticsData } from "@/app/lib/types/analytics.types";
import { TrendingConfessionCard } from "./TrendingConfessionCard";
import { ReactionChart } from "./ReactionChart";
import { ActivityChart } from "./ActivityChart";
import { MetricsOverview } from "./MetricsOverview";
import { TrendingUp, Calendar } from "lucide-react";

export const TrendingDashboard = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7days' | '30days'>('7days');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics/trending?period=${period}`);
      
      if (!res.ok) throw new Error('Failed to fetch analytics');
      
      const analyticsData = await res.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Load Analytics</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              Trending Dashboard
            </h1>
            <p className="text-gray-400">
              Discover the most popular confessions and platform insights
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('7days')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === '7days'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setPeriod('30days')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === '30days'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Overview */}
        <MetricsOverview metrics={data.totalMetrics} period={period} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ReactionChart data={data.reactionDistribution} />
          <ActivityChart data={data.dailyActivity} period={period} />
        </div>

        {/* Trending Confessions */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-yellow-500" />
            Top Trending Confessions
          </h2>

          <div className="space-y-4">
            {data.trending.map((confession, index) => (
              <TrendingConfessionCard
                key={confession.id}
                confession={confession}
                rank={index + 1}
              />
            ))}
          </div>

          {data.trending.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-400">No trending confessions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
