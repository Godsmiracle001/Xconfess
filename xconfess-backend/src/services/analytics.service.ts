import {
  TrendingConfession,
  AnalyticsResponse,
  DailyActivity,
  ReactionDistribution,
} from '../types/analytics.types';

export class AnalyticsService {
  // Mock data - replace with actual database queries
  private static mockConfessions = [
    {
      id: '1',
      content: 'I love coding late at night',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reactions: { like: 45, love: 32 },
    },
    {
      id: '2',
      content: "Sometimes I pretend to work but I'm actually learning",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      reactions: { like: 38, love: 28 },
    },
    {
      id: '3',
      content: 'I talk to my rubber duck more than real people',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      reactions: { like: 52, love: 41 },
    },
    {
      id: '4',
      content: 'I still google basic syntax after 5 years',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      reactions: { like: 67, love: 55 },
    },
    {
      id: '5',
      content: 'My best debugging tool is taking a walk',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      reactions: { like: 44, love: 36 },
    },
    {
      id: '6',
      content: 'I name my variables after my favorite foods',
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      reactions: { like: 29, love: 18 },
    },
    {
      id: '7',
      content: 'Coffee is my primary coding language',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      reactions: { like: 71, love: 63 },
    },
    {
      id: '8',
      content: 'I have imposter syndrome daily',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      reactions: { like: 88, love: 72 },
    },
    {
      id: '9',
      content: 'Stack Overflow saved my career',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      reactions: { like: 95, love: 81 },
    },
    {
      id: '10',
      content: 'I write comments for my future self',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      reactions: { like: 41, love: 33 },
    },
  ];

  static async getTrendingAnalytics(
    period: '7days' | '30days' = '7days',
  ): Promise<AnalyticsResponse> {
    const days = period === '7days' ? 7 : 30;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get trending confessions
    const trending = this.getTrendingConfessions(cutoffDate, 10);

    // Get reaction distribution
    const reactionDistribution = this.getReactionDistribution(trending);

    // Get daily activity
    const dailyActivity = this.getDailyActivity(days);

    // Calculate total metrics
    const totalMetrics = this.calculateTotalMetrics(trending);

    return {
      trending,
      reactionDistribution,
      dailyActivity,
      totalMetrics,
      period,
    };
  }

  private static getTrendingConfessions(
    cutoffDate: Date,
    limit: number,
  ): TrendingConfession[] {
    return this.mockConfessions
      .filter((c) => new Date(c.createdAt) >= cutoffDate)
      .map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        reactionCount: c.reactions.like + c.reactions.love,
        reactions: c.reactions,
      }))
      .sort((a, b) => b.reactionCount - a.reactionCount)
      .slice(0, limit);
  }

  private static getReactionDistribution(
    confessions: TrendingConfession[],
  ): ReactionDistribution[] {
    const totalLikes = confessions.reduce(
      (sum, c) => sum + c.reactions.like,
      0,
    );
    const totalLoves = confessions.reduce(
      (sum, c) => sum + c.reactions.love,
      0,
    );
    const total = totalLikes + totalLoves;

    return [
      {
        type: 'like',
        count: totalLikes,
        percentage: total > 0 ? Math.round((totalLikes / total) * 100) : 0,
      },
      {
        type: 'love',
        count: totalLoves,
        percentage: total > 0 ? Math.round((totalLoves / total) * 100) : 0,
      },
    ];
  }

  private static getDailyActivity(days: number): DailyActivity[] {
    const activity: DailyActivity[] = [];
    const now = Date.now();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      activity.push({
        date: date.toISOString().split('T')[0],
        confessions: Math.floor(Math.random() * 50) + 10,
        reactions: Math.floor(Math.random() * 150) + 50,
        activeUsers: Math.floor(Math.random() * 100) + 20,
      });
    }

    return activity;
  }

  private static calculateTotalMetrics(confessions: TrendingConfession[]) {
    const totalReactions = confessions.reduce(
      (sum, c) => sum + c.reactionCount,
      0,
    );

    return {
      totalConfessions: confessions.length,
      totalReactions,
      totalUsers: Math.floor(totalReactions * 0.6),
    };
  }
}
