// src/analytics/analytics.controller.ts
import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard) // Protect analytics endpoints
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('trending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get trending confessions' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (7 or 30)',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Trending confessions retrieved successfully',
    schema: {
      example: [
        {
          id: 'uuid',
          content: 'Confession preview...',
          reactionCount: 45,
          createdAt: '2025-01-20T10:00:00Z',
          category: 'work',
        },
      ],
    },
  })
  async getTrending(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ) {
    // Validate days parameter
    if (![7, 30].includes(days)) {
      days = 7;
    }

    return this.analyticsService.getTrendingConfessions(days);
  }

  @Get('reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get reaction distribution' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (7 or 30)',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Reaction distribution retrieved successfully',
    schema: {
      example: {
        total: 150,
        distribution: [
          { type: 'like', count: 80, percentage: '53.33' },
          { type: 'love', count: 45, percentage: '30.00' },
          { type: 'support', count: 25, percentage: '16.67' },
        ],
        period: '7 days',
      },
    },
  })
  async getReactions(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ) {
    if (![7, 30].includes(days)) {
      days = 7;
    }

    return this.analyticsService.getReactionDistribution(days);
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get daily active users' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (7 or 30)',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'User activity retrieved successfully',
    schema: {
      example: {
        period: '7 days',
        dailyActivity: [
          { date: '2025-01-18', activeUsers: 25 },
          { date: '2025-01-19', activeUsers: 30 },
        ],
        averageDAU: 27.5,
      },
    },
  })
  async getUsers(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ) {
    if (![7, 30].includes(days)) {
      days = 7;
    }

    return this.analyticsService.getDailyActiveUsers(days);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get overall platform statistics' })
  @ApiResponse({
    status: 200,
    description: 'Platform stats retrieved successfully',
    schema: {
      example: {
        totalUsers: 1500,
        totalConfessions: 5000,
        totalReactions: 15000,
        publishedConfessions: 4800,
        pendingConfessions: 200,
        averageReactionsPerConfession: '3.12',
        mostPopularCategory: 'work',
        lastUpdated: '2025-01-24T12:00:00Z',
      },
    },
  })
  async getStats() {
    return this.analyticsService.getPlatformStats();
  }

  @Get('growth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get confession growth metrics' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (7 or 30)',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Growth metrics retrieved successfully',
    schema: {
      example: {
        period: '7 days',
        totalConfessions: 350,
        averagePerDay: 50.0,
        dailyGrowth: [
          { date: '2025-01-18', count: 45 },
          { date: '2025-01-19', count: 52 },
        ],
        trend: 'increasing',
      },
    },
  })
  async getGrowth(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ) {
    if (![7, 30].includes(days)) {
      days = 7;
    }

    return this.analyticsService.getConfessionGrowth(days);
  }
}
