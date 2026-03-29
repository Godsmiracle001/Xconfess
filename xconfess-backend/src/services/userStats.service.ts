import { calculateBadges, Badge } from './badge.service';

interface Confession {
  id: string;
  createdAt: Date;
  reactionCount: number;
}

export function calculateUserStats(confessions: Confession[]) {
  const totalConfessions = confessions.length;

  const totalReactions = confessions.reduce(
    (sum, c) => sum + c.reactionCount,
    0,
  );

  const mostPopularConfession =
    confessions.sort((a, b) => b.reactionCount - a.reactionCount)[0] ?? null;

  const badges: Badge[] = calculateBadges(confessions);

  const streak = calculateStreak(confessions);

  return {
    totalConfessions,
    totalReactions,
    mostPopularConfession,
    badges,
    streak,
  };
}

function calculateStreak(confessions: Confession[]): number {
  const days = new Set(
    confessions.map((c) => c.createdAt.toISOString().split('T')[0]),
  );
  return days.size;
}
