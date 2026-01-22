'use client';

import { Badge, BadgeType } from '@/app/lib/types/user';
import { cn } from '@/app/lib/utils/cn';
import { formatRelativeDate } from '@/app/lib/utils/formatDate';
import { Award, Star, Trophy, Heart, Users } from 'lucide-react';

interface BadgeDisplayProps {
  badges: Badge[];
  showProgress?: boolean;
  compact?: boolean;
}

const badgeIcons: Record<BadgeType, React.ReactNode> = {
  [BadgeType.FIRST_CONFESSION]: <Star className="h-5 w-5" />,
  [BadgeType.CONFESSION_STARTER]: <Award className="h-5 w-5" />,
  [BadgeType.PROLIFIC_CONFESSOR]: <Trophy className="h-5 w-5" />,
  [BadgeType.POPULAR_VOICE]: <Heart className="h-5 w-5" />,
  [BadgeType.COMMUNITY_FAVORITE]: <Users className="h-5 w-5" />,
};

const badgeColors: Record<BadgeType, { earned: string; unearned: string }> = {
  [BadgeType.FIRST_CONFESSION]: {
    earned: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    unearned: 'bg-gray-100 text-gray-400 border-gray-200',
  },
  [BadgeType.CONFESSION_STARTER]: {
    earned: 'bg-blue-100 text-blue-800 border-blue-300',
    unearned: 'bg-gray-100 text-gray-400 border-gray-200',
  },
  [BadgeType.PROLIFIC_CONFESSOR]: {
    earned: 'bg-purple-100 text-purple-800 border-purple-300',
    unearned: 'bg-gray-100 text-gray-400 border-gray-200',
  },
  [BadgeType.POPULAR_VOICE]: {
    earned: 'bg-red-100 text-red-800 border-red-300',
    unearned: 'bg-gray-100 text-gray-400 border-gray-200',
  },
  [BadgeType.COMMUNITY_FAVORITE]: {
    earned: 'bg-green-100 text-green-800 border-green-300',
    unearned: 'bg-gray-100 text-gray-400 border-gray-200',
  },
};

function BadgeCard({ badge, showProgress, compact }: { badge: Badge; showProgress?: boolean; compact?: boolean }) {
  const isEarned = badge.earnedAt !== null;
  const colors = badgeColors[badge.type];
  const icon = badgeIcons[badge.type];

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-3 py-1.5',
          isEarned ? colors.earned : colors.unearned
        )}
        title={badge.description}
      >
        {icon}
        <span className="text-sm font-medium">{badge.name}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg border p-4 transition-all',
        isEarned ? colors.earned : colors.unearned,
        isEarned && 'shadow-sm'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('rounded-full p-2', isEarned ? 'bg-white/50' : 'bg-gray-200/50')}>
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold">{badge.name}</h4>
          <p className="text-xs opacity-80">{badge.description}</p>
        </div>
      </div>

      {showProgress && badge.progress && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs">
            <span>Progress</span>
            <span>
              {badge.progress.current}/{badge.progress.required}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/50">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                isEarned ? 'bg-current opacity-60' : 'bg-gray-400'
              )}
              style={{
                width: `${Math.min((badge.progress.current / badge.progress.required) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {isEarned && badge.earnedAt && (
        <p className="mt-2 text-xs opacity-70">Earned {formatRelativeDate(badge.earnedAt)}</p>
      )}
    </div>
  );
}

export function BadgeDisplay({ badges, showProgress = true, compact = false }: BadgeDisplayProps) {
  const earnedBadges = badges.filter((b) => b.earnedAt !== null);
  const unearnedBadges = badges.filter((b) => b.earnedAt === null);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {earnedBadges.map((badge) => (
          <BadgeCard key={badge.type} badge={badge} compact />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Earned Badges</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {earnedBadges.map((badge) => (
              <BadgeCard key={badge.type} badge={badge} showProgress={showProgress} />
            ))}
          </div>
        </div>
      )}

      {unearnedBadges.length > 0 && showProgress && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-500">Badges to Earn</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unearnedBadges.map((badge) => (
              <BadgeCard key={badge.type} badge={badge} showProgress={showProgress} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BadgeDisplay;
