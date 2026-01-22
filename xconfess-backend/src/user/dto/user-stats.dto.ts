export enum BadgeType {
  FIRST_CONFESSION = 'first_confession',
  CONFESSION_STARTER = 'confession_starter',
  PROLIFIC_CONFESSOR = 'prolific_confessor',
  POPULAR_VOICE = 'popular_voice',
  COMMUNITY_FAVORITE = 'community_favorite',
}

export interface Badge {
  type: BadgeType;
  name: string;
  description: string;
  earnedAt: Date | null;
  progress?: {
    current: number;
    required: number;
  };
}

export interface PopularConfession {
  id: string;
  message: string;
  reactionCount: number;
  viewCount: number;
  createdAt: Date;
}

export interface UserStatsDto {
  totalConfessions: number;
  totalReactionsReceived: number;
  totalViews: number;
  mostPopularConfession: PopularConfession | null;
  badges: Badge[];
  activityStreak: {
    current: number;
    longest: number;
  };
  joinedAt: Date;
  confessionsByMonth: {
    month: string;
    count: number;
  }[];
}

export interface PublicProfileDto {
  id: number;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  badges: Badge[];
  stats: {
    totalConfessions: number;
    totalReactionsReceived: number;
  };
  joinedAt: Date;
}
