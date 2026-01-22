import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AnonymousUser } from './entities/anonymous-user.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { Reaction } from '../reaction/entities/reaction.entity';
import {
  Badge,
  BadgeType,
  PopularConfession,
  PublicProfileDto,
  UserStatsDto,
} from './dto/user-stats.dto';

@Injectable()
export class ProfileStatsService {
  private readonly logger = new Logger(ProfileStatsService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AnonymousUser)
    private anonymousUserRepository: Repository<AnonymousUser>,
    @InjectRepository(AnonymousConfession)
    private confessionRepository: Repository<AnonymousConfession>,
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
  ) {}

  async getUserStats(userId: number): Promise<UserStatsDto> {
    this.logger.debug(`Getting stats for user ${userId}`);

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['anonymousUser'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user has no anonymous user linked, return empty stats
    if (!user.anonymousUserId) {
      return this.getEmptyStats(user.createdAt);
    }

    // Get all confessions by this user's anonymous identity
    const confessions = await this.confessionRepository.find({
      where: {
        anonymousUser: { id: user.anonymousUserId },
        isDeleted: false,
        isHidden: false,
      },
      relations: ['reactions'],
      order: { created_at: 'DESC' },
    });

    const totalConfessions = confessions.length;

    const totalReactionsReceived = confessions.reduce(
      (sum, confession) => sum + (confession.reactions?.length || 0),
      0,
    );

    const totalViews = confessions.reduce(
      (sum, confession) => sum + confession.view_count,
      0,
    );

    const mostPopularConfession = this.findMostPopularConfession(confessions);

    const badges = await this.calculateBadges(userId, confessions);

    const activityStreak = this.calculateActivityStreak(confessions);

    const confessionsByMonth = this.calculateConfessionsByMonth(confessions);

    return {
      totalConfessions,
      totalReactionsReceived,
      totalViews,
      mostPopularConfession,
      badges,
      activityStreak,
      joinedAt: user.createdAt,
      confessionsByMonth,
    };
  }

  async getPublicProfile(userId: number): Promise<PublicProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isProfilePublic: true },
      relations: ['anonymousUser'],
    });

    if (!user) {
      throw new NotFoundException('User not found or profile is private');
    }

    // Get limited stats for public profile
    let totalConfessions = 0;
    let totalReactionsReceived = 0;
    let badges: Badge[] = [];

    if (user.anonymousUserId) {
      const confessions = await this.confessionRepository.find({
        where: {
          anonymousUser: { id: user.anonymousUserId },
          isDeleted: false,
          isHidden: false,
        },
        relations: ['reactions'],
      });

      totalConfessions = confessions.length;
      totalReactionsReceived = confessions.reduce(
        (sum, confession) => sum + (confession.reactions?.length || 0),
        0,
      );
      badges = await this.calculateBadges(userId, confessions);
    }

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      badges: badges.filter((b) => b.earnedAt !== null),
      stats: {
        totalConfessions,
        totalReactionsReceived,
      },
      joinedAt: user.createdAt,
    };
  }

  async getUserConfessions(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ confessions: AnonymousConfession[]; total: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.anonymousUserId) {
      return { confessions: [], total: 0 };
    }

    const [confessions, total] = await this.confessionRepository.findAndCount({
      where: {
        anonymousUser: { id: user.anonymousUserId },
        isDeleted: false,
      },
      relations: ['reactions'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { confessions, total };
  }

  private findMostPopularConfession(
    confessions: AnonymousConfession[],
  ): PopularConfession | null {
    if (confessions.length === 0) return null;

    // Sort by reaction count, then by view count
    const sorted = [...confessions].sort((a, b) => {
      const aReactions = a.reactions?.length || 0;
      const bReactions = b.reactions?.length || 0;
      if (bReactions !== aReactions) {
        return bReactions - aReactions;
      }
      return b.view_count - a.view_count;
    });

    const top = sorted[0];
    return {
      id: top.id,
      message: top.message.length > 100 ? top.message.substring(0, 100) + '...' : top.message,
      reactionCount: top.reactions?.length || 0,
      viewCount: top.view_count,
      createdAt: top.created_at,
    };
  }

  private async calculateBadges(
    userId: number,
    confessions: AnonymousConfession[],
  ): Promise<Badge[]> {
    const badges: Badge[] = [];
    const totalConfessions = confessions.length;

    // First Confession badge
    const firstConfessionBadge: Badge = {
      type: BadgeType.FIRST_CONFESSION,
      name: 'First Confession',
      description: 'Posted your first confession',
      earnedAt: totalConfessions >= 1 ? confessions[confessions.length - 1]?.created_at : null,
      progress: {
        current: Math.min(totalConfessions, 1),
        required: 1,
      },
    };
    badges.push(firstConfessionBadge);

    const confessionStarterBadge: Badge = {
      type: BadgeType.CONFESSION_STARTER,
      name: 'Confession Starter',
      description: 'Posted 10 confessions',
      earnedAt: totalConfessions >= 10 ? this.getNthConfessionDate(confessions, 10) : null,
      progress: {
        current: Math.min(totalConfessions, 10),
        required: 10,
      },
    };
    badges.push(confessionStarterBadge);

    const prolificConfessorBadge: Badge = {
      type: BadgeType.PROLIFIC_CONFESSOR,
      name: 'Prolific Confessor',
      description: 'Posted 50 confessions',
      earnedAt: totalConfessions >= 50 ? this.getNthConfessionDate(confessions, 50) : null,
      progress: {
        current: Math.min(totalConfessions, 50),
        required: 50,
      },
    };
    badges.push(prolificConfessorBadge);

    // Popular Voice badge (confession with 100+ reactions)
    const popularConfession = confessions.find(
      (c) => (c.reactions?.length || 0) >= 100,
    );
    const maxReactions = Math.max(
      0,
      ...confessions.map((c) => c.reactions?.length || 0),
    );
    const popularVoiceBadge: Badge = {
      type: BadgeType.POPULAR_VOICE,
      name: 'Popular Voice',
      description: 'Had a confession with 100+ reactions',
      earnedAt: popularConfession ? popularConfession.created_at : null,
      progress: {
        current: Math.min(maxReactions, 100),
        required: 100,
      },
    };
    badges.push(popularVoiceBadge);

    // Community Favorite badge (5 confessions with 50+ reactions each)
    const confessionsWith50PlusReactions = confessions.filter(
      (c) => (c.reactions?.length || 0) >= 50,
    );
    const communityFavoriteBadge: Badge = {
      type: BadgeType.COMMUNITY_FAVORITE,
      name: 'Community Favorite',
      description: 'Had 5 confessions with 50+ reactions each',
      earnedAt:
        confessionsWith50PlusReactions.length >= 5
          ? confessionsWith50PlusReactions[4]?.created_at
          : null,
      progress: {
        current: Math.min(confessionsWith50PlusReactions.length, 5),
        required: 5,
      },
    };
    badges.push(communityFavoriteBadge);

    return badges;
  }

  private getNthConfessionDate(
    confessions: AnonymousConfession[],
    n: number,
  ): Date | null {
    // Confessions are sorted DESC, so the nth confession from the start is at length - n
    const index = confessions.length - n;
    if (index >= 0 && index < confessions.length) {
      return confessions[index].created_at;
    }
    return null;
  }

  private calculateActivityStreak(confessions: AnonymousConfession[]): {
    current: number;
    longest: number;
  } {
    if (confessions.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique dates (sorted descending)
    const dates = [
      ...new Set(
        confessions.map((c) => c.created_at.toISOString().split('T')[0]),
      ),
    ].sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];

    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffDays = Math.floor(
          (prevDate.getTime() - currDate.getTime()) / 86400000,
        );

        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / 86400000,
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

    return { current: currentStreak, longest: longestStreak };
  }

  private calculateConfessionsByMonth(
    confessions: AnonymousConfession[],
  ): { month: string; count: number }[] {
    const monthCounts = new Map<string, number>();

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(monthKey, 0);
    }

    // Count confessions per month
    confessions.forEach((confession) => {
      const date = new Date(confession.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts.has(monthKey)) {
        monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
      }
    });

    return Array.from(monthCounts.entries()).map(([month, count]) => ({
      month,
      count,
    }));
  }

  private getEmptyStats(joinedAt: Date): UserStatsDto {
    const emptyBadges: Badge[] = [
      {
        type: BadgeType.FIRST_CONFESSION,
        name: 'First Confession',
        description: 'Posted your first confession',
        earnedAt: null,
        progress: { current: 0, required: 1 },
      },
      {
        type: BadgeType.CONFESSION_STARTER,
        name: 'Confession Starter',
        description: 'Posted 10 confessions',
        earnedAt: null,
        progress: { current: 0, required: 10 },
      },
      {
        type: BadgeType.PROLIFIC_CONFESSOR,
        name: 'Prolific Confessor',
        description: 'Posted 50 confessions',
        earnedAt: null,
        progress: { current: 0, required: 50 },
      },
      {
        type: BadgeType.POPULAR_VOICE,
        name: 'Popular Voice',
        description: 'Had a confession with 100+ reactions',
        earnedAt: null,
        progress: { current: 0, required: 100 },
      },
      {
        type: BadgeType.COMMUNITY_FAVORITE,
        name: 'Community Favorite',
        description: 'Had 5 confessions with 50+ reactions each',
        earnedAt: null,
        progress: { current: 0, required: 5 },
      },
    ];

    const confessionsByMonth: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      confessionsByMonth.push({ month: monthKey, count: 0 });
    }

    return {
      totalConfessions: 0,
      totalReactionsReceived: 0,
      totalViews: 0,
      mostPopularConfession: null,
      badges: emptyBadges,
      activityStreak: { current: 0, longest: 0 },
      joinedAt,
      confessionsByMonth,
    };
  }
}
