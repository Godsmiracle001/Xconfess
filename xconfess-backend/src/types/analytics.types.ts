export interface TrendingConfession {
  id: string;
  content: string;
  createdAt: Date;
  reactionCount: number;
  reactions: {
    like: number;
    love: number;
  };
}

export interface ReactionDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface DailyActivity {
  date: string;
  confessions: number;
  reactions: number;
  activeUsers: number;
}

export interface AnalyticsResponse {
  trending: TrendingConfession[];
  reactionDistribution: ReactionDistribution[];
  dailyActivity: DailyActivity[];
  totalMetrics: {
    totalConfessions: number;
    totalReactions: number;
    totalUsers: number;
  };
  period: '7days' | '30days';
}

export interface AnalyticsPeriod {
  days: number;
  label: string;
}
