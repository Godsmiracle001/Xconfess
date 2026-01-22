export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

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
  earnedAt: string | null;
  progress?: {
    current: number;
    required: number;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  is_active: boolean;
  avatarUrl: string | null;
  bio: string | null;
  gender: Gender | null;
  age: number | null;
  canReceiveMessages: boolean;
  isProfilePublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PopularConfession {
  id: string;
  message: string;
  reactionCount: number;
  viewCount: number;
  createdAt: string;
}

export interface ActivityStreak {
  current: number;
  longest: number;
}

export interface MonthlyConfessions {
  month: string;
  count: number;
}

export interface UserStats {
  totalConfessions: number;
  totalReactionsReceived: number;
  totalViews: number;
  mostPopularConfession: PopularConfession | null;
  badges: Badge[];
  activityStreak: ActivityStreak;
  joinedAt: string;
  confessionsByMonth: MonthlyConfessions[];
}

export interface PublicProfile {
  id: number;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  badges: Badge[];
  stats: {
    totalConfessions: number;
    totalReactionsReceived: number;
  };
  joinedAt: string;
}

export interface UpdateProfileDto {
  gender?: Gender;
  age?: number;
  canReceiveMessages?: boolean;
  bio?: string;
  avatarUrl?: string;
  isProfilePublic?: boolean;
}
