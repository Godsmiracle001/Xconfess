'use client';

import { UserStats } from '@/app/lib/types/user';
import { cn } from '@/app/lib/utils/cn';
import { formatMonth, formatRelativeDate } from '@/app/lib/utils/formatDate';
import { MessageSquare, Heart, Eye, Flame, TrendingUp } from 'lucide-react';

interface ProfileStatsProps {
  stats: UserStats;
  isLoading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtext?: string;
  color: string;
}

function StatCard({ icon, label, value, subtext, color }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2.5', color)}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function ActivityChart({ data }: { data: { month: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-semibold text-gray-900">Activity Over Time</h3>
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {data.map((item) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full min-w-[24px] max-w-[40px] rounded-t bg-gradient-to-t from-indigo-500 to-purple-500 transition-all"
              style={{
                height: `${Math.max((item.count / maxCount) * 100, 4)}px`,
                minHeight: '4px',
              }}
              title={`${item.count} confessions`}
            />
            <span className="text-[10px] text-gray-400">{formatMonth(item.month).split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MostPopularConfession({ confession }: { confession: UserStats['mostPopularConfession'] }) {
  if (!confession) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 font-semibold text-gray-900">Most Popular Confession</h3>
        <p className="text-sm text-gray-500">No confessions yet. Start sharing!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-900">Most Popular Confession</h3>
      </div>
      <p className="mb-3 line-clamp-3 text-sm text-gray-700">{confession.message}</p>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5" />
          {confession.reactionCount} reactions
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          {confession.viewCount} views
        </span>
        <span>{formatRelativeDate(confession.createdAt)}</span>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-48 animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

export function ProfileStats({ stats, isLoading }: ProfileStatsProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-indigo-600" />}
          label="Total Confessions"
          value={stats.totalConfessions}
          color="bg-indigo-100"
        />
        <StatCard
          icon={<Heart className="h-5 w-5 text-pink-600" />}
          label="Reactions Received"
          value={stats.totalReactionsReceived}
          color="bg-pink-100"
        />
        <StatCard
          icon={<Eye className="h-5 w-5 text-blue-600" />}
          label="Total Views"
          value={stats.totalViews}
          color="bg-blue-100"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-600" />}
          label="Activity Streak"
          value={`${stats.activityStreak.current} days`}
          subtext={`Best: ${stats.activityStreak.longest} days`}
          color="bg-orange-100"
        />
      </div>

      {/* Charts and Details */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityChart data={stats.confessionsByMonth} />
        <MostPopularConfession confession={stats.mostPopularConfession} />
      </div>
    </div>
  );
}

export default ProfileStats;
