// src/moderation/moderation.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AiModerationService, ModerationStatus } from './ai-moderation.service';
import { ModerationRepositoryService } from './moderation-repository.service';

class TestModerationDto {
  content: string;
}

class ReviewModerationDto {
  status: ModerationStatus;
  notes?: string;
}

class UpdateThresholdsDto {
  highThreshold: number;
  mediumThreshold: number;
}

/**
 * Admin-only moderation controller
 * All endpoints require JWT authentication and admin role
 * 
 * Protected endpoints:
 * - GET /admin/moderation/pending - Get pending reviews
 * - POST /admin/moderation/review/:id - Review moderation item
 * - GET /admin/moderation/stats - Get moderation statistics
 * - GET /admin/moderation/accuracy - Get accuracy metrics
 * - GET /admin/moderation/config - Get configuration
 * - POST /admin/moderation/config/thresholds - Update thresholds
 * - POST /admin/moderation/test - Test moderation
 * - GET /admin/moderation/confession/:confessionId - Get confession logs
 * - GET /admin/moderation/user/:userId - Get user logs
 */
@Controller('admin/moderation')
export class ModerationController {
  constructor(
    private readonly aiModerationService: AiModerationService,
    private readonly moderationRepoService: ModerationRepositoryService,
  ) {}

  /**
   * Get pending moderation reviews (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('pending')
  async getPendingReviews(
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return await this.moderationRepoService.getPendingReviews(
      Number(limit),
      Number(offset),
    );
  }

  /**
   * Review a moderation item (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('review/:id')
  @HttpCode(HttpStatus.OK)
  async reviewModeration(
    @Param('id') id: string,
    @Body() dto: ReviewModerationDto,
  ) {
    return await this.moderationRepoService.updateReview(
      id,
      dto.status,
      'system',
      dto.notes,
    );
  }

  /**
   * Get moderation statistics (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.moderationRepoService.getModerationStats(start, end);
  }

  /**
   * Get accuracy metrics (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('accuracy')
  async getAccuracyMetrics() {
    return await this.moderationRepoService.getAccuracyMetrics();
  }

  /**
   * Get moderation configuration (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('config')
  getConfiguration() {
    return this.aiModerationService.getConfiguration();
  }

  /**
   * Update moderation thresholds (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('config/thresholds')
  @HttpCode(HttpStatus.OK)
  updateThresholds(@Body() dto: UpdateThresholdsDto) {
    this.aiModerationService.updateThresholds(
      dto.highThreshold,
      dto.mediumThreshold,
    );
    return { message: 'Thresholds updated successfully' };
  }

  /**
   * Test moderation content (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testModeration(@Body() dto: TestModerationDto) {
    const result = await this.aiModerationService.moderateContent(dto.content);
    return {
      message: 'Moderation test completed',
      result,
    };
  }

  /**
   * Get moderation logs for a confession (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('confession/:confessionId')
  async getConfessionLogs(@Param('confessionId') confessionId: string) {
    return await this.moderationRepoService.getLogsByConfession(confessionId);
  }

  /**
   * Get moderation logs for a user (Admin only)
   * Requires: JwtAuthGuard + AdminGuard
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('user/:userId')
  async getUserLogs(
    @Param('userId') userId: string,
    @Query('limit') limit = 100,
  ) {
    return await this.moderationRepoService.getLogsByUser(userId, Number(limit));
  }
}