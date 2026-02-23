// src/analytics/analytics.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Reaction } from 'src/reaction/entities/reaction.entity';
import { User } from 'src/user/entities/user.entity';
import { AnonymousConfession } from 'src/confession/entities/confession.entity';

@Injectable()
export class AnalyticsService {
  private readonly CACHE_TTL = 900; // 15 minutes in seconds

  constructor(
    @InjectRepository(AnonymousConfession)
    private confessionRepository: Repository<AnonymousConfession>,
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getTrendingConfessions(days: number = 7) {
    const cacheKey = `analytics:trending:${days}d`;

    // Try to get from cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trending = await this.confessionRepository
      .createQueryBuilder('confession')
      .leftJoinAndSelect('confession.reactions', 'reaction')
      .where('confession.createdAt >= :startDate', { startDate })
      .andWhere('confession.isPublished = :isPublished', { isPublished: true })
      .loadRelationCountAndMap(
        'confession.reactionCount',
        'confession.reactions',
      )
      .orderBy('confession.reactionCount', 'DESC')
      .take(20)
      .getMany();

    const result = trending.map((confession) => ({
      id: confession.id,
      content: confession.content.substring(0, 200), // Preview only
      reactionCount: Number(confession['reactionCount']) || 0,
      createdAt: confession.created_at,
      category: confession.comments,
    }));

    // Cache the result
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  async getReactionDistribution(days: number = 7) {
    const cacheKey = `analytics:reactions:${days}d`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const distribution: Array<{ type: string; count: string }> =
      await this.reactionRepository
        .createQueryBuilder('reaction')
        .select('reaction.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .where('reaction.createdAt >= :startDate', { startDate })
        .groupBy('reaction.type')
        .getRawMany();

    const total = distribution.reduce((sum: number, item: { count: string }) => {
      const parsed = parseInt(item.count ?? '0', 10);
      return sum + (Number.isNaN(parsed) ? 0 : parsed);
    }, 0);

    const result = {
      total,
      distribution: distribution.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
        percentage: ((parseInt(item.count) / total) * 100).toFixed(2),
      })),
      period: `${days} days`,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  async getDailyActiveUsers(days: number = 7) {
    const cacheKey = `analytics:users:${days}d`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily active users (anonymous users who created confessions or reactions)
    const dailyActivity = await this.confessionRepository
      .createQueryBuilder('confession')
      .select('DATE(confession.created_at)', 'date')
      .addSelect('COUNT(DISTINCT confession.anonymous_user_id)', 'activeUsers')
      .where('confession.created_at >= :startDate', { startDate })
      .groupBy('DATE(confession.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const reactionActivity = await this.reactionRepository
      .createQueryBuilder('reaction')
      .select('DATE(reaction.createdAt)', 'date')
      .addSelect('COUNT(DISTINCT reaction.anonymous_user_id)', 'activeUsers')
      .where('reaction.createdAt >= :startDate', { startDate })
      .groupBy('DATE(reaction.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Merge and deduplicate
    const activityMap = new Map();

    [...dailyActivity, ...reactionActivity].forEach((item) => {
      const date = item.date;
      const current = Number(activityMap.get(date)) || 0;
      activityMap.set(date, Math.max(current, parseInt(item.activeUsers)));
    });

    const result = {
      period: `${days} days`,
      dailyActivity: Array.from(activityMap.entries()).map(([date, count]) => ({
        date,
        activeUsers: count,
      })),
      averageDAU:
        Array.from(activityMap.values()).reduce((a, b) => a + b, 0) /
          activityMap.size || 0,
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  async getPlatformStats() {
    const cacheKey = 'analytics:stats';

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [totalUsers, totalConfessions, totalReactions, publishedConfessions] =
      await Promise.all([
        this.userRepository.count(),
        this.confessionRepository.count(),
        this.reactionRepository.count(),
        // Note: isPublished field doesn't exist, using total count instead
        this.confessionRepository.count({ where: { isDeleted: false } }),
      ]);

    // Get most popular category
    const categoryStats = await this.confessionRepository
      .createQueryBuilder('confession')
      .select('confession.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('confession.isPublished = :isPublished', { isPublished: true })
      .groupBy('confession.category')
      .orderBy('count', 'DESC')
      .limit(1)
      .getRawOne<{ category: string; count: string }>();

    const result = {
      totalUsers,
      totalConfessions,
      totalReactions,
      publishedConfessions,
      pendingConfessions: totalConfessions - publishedConfessions,
      averageReactionsPerConfession:
        publishedConfessions > 0
          ? (totalReactions / publishedConfessions).toFixed(2)
          : 0,
      mostPopularCategory: categoryStats?.category || 'N/A',
      lastUpdated: new Date(),
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  async getConfessionGrowth(days: number = 7) {
    const cacheKey = `analytics:growth:${days}d`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyGrowth = await this.confessionRepository
      .createQueryBuilder('confession')
      .select('DATE(confession.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('confession.createdAt >= :startDate', { startDate })
      .groupBy('DATE(confession.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const total = dailyGrowth.reduce(
      (sum, item) => sum + parseInt(item.count),
      0,
    );
    const average = total / days;

    const result = {
      period: `${days} days`,
      totalConfessions: total,
      averagePerDay: parseFloat(average.toFixed(2)),
      dailyGrowth: dailyGrowth.map((item) => ({
        date: item.date,
        count: parseInt(item.count),
      })),
      trend: this.calculateTrend(dailyGrowth),
    };

    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  // Helper method to calculate trend
  private calculateTrend(data: any[]): string {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, item) => sum + parseInt(item.count), 0) /
      firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, item) => sum + parseInt(item.count), 0) /
      secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  // Method to invalidate all analytics caches
  async invalidateCache() {
    const keys = [
      'analytics:trending:7d',
      'analytics:trending:30d',
      'analytics:reactions:7d',
      'analytics:reactions:30d',
      'analytics:users:7d',
      'analytics:users:30d',
      'analytics:stats',
      'analytics:growth:7d',
      'analytics:growth:30d',
    ];

    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }
}
