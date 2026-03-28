export type Badge =
  | 'First Confession'
  | 'Confession Starter'
  | 'Prolific Confessor'
  | 'Popular Voice'
  | 'Community Favorite';

interface Confession {
  id: string;
  reactionCount: number;
}

export function calculateBadges(confessions: Confession[]): Badge[] {
  const badges: Badge[] = [];

  if (confessions.length >= 1) badges.push('First Confession');
  if (confessions.length >= 10) badges.push('Confession Starter');
  if (confessions.length >= 50) badges.push('Prolific Confessor');

  if (confessions.some((c) => c.reactionCount >= 100)) {
    badges.push('Popular Voice');
  }

  const popular50 = confessions.filter((c) => c.reactionCount >= 50);
  if (popular50.length >= 5) {
    badges.push('Community Favorite');
  }

  return badges;
}
