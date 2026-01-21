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
} from '@nestjs/common';
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

@Controller('moderation')
export class ModerationController {
  constructor(
    private readonly aiModerationService: AiModerationService,
    private readonly moderationRepoService: ModerationRepositoryService,
  ) {}

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

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return await this.moderationRepoService.getModerationStats(start, end);
  }

  @Get('accuracy')
  async getAccuracyMetrics() {
    return await this.moderationRepoService.getAccuracyMetrics();
  }

  @Get('config')
  getConfiguration() {
    return this.aiModerationService.getConfiguration();
  }

  @Post('config/thresholds')
  @HttpCode(HttpStatus.OK)
  updateThresholds(@Body() dto: UpdateThresholdsDto) {
    this.aiModerationService.updateThresholds(
      dto.highThreshold,
      dto.mediumThreshold,
    );
    return { message: 'Thresholds updated successfully' };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testModeration(@Body() dto: TestModerationDto) {
    const result = await this.aiModerationService.moderateContent(dto.content);
    return {
      message: 'Moderation test completed',
      result,
    };
  }

  @Get('confession/:confessionId')
  async getConfessionLogs(@Param('confessionId') confessionId: string) {
    return await this.moderationRepoService.getLogsByConfession(confessionId);
  }

  @Get('user/:userId')
  async getUserLogs(
    @Param('userId') userId: string,
    @Query('limit') limit = 100,
  ) {
    return await this.moderationRepoService.getLogsByUser(userId, Number(limit));
  }
}