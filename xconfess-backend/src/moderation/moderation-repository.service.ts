// src/moderation/moderation-repository.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ModerationLog } from './entities/moderation-log.entity';
import { ModerationResult, ModerationStatus } from './ai-moderation.service';

@Injectable()
export class ModerationRepositoryService {
  private readonly logger = new Logger(ModerationRepositoryService.name);

  constructor(
    @InjectRepository(ModerationLog)
    private readonly moderationLogRepo: Repository<ModerationLog>,
  ) {}

  async createLog(
    content: string,
    result: ModerationResult,
    confessionId?: string,
    userId?: string,
    apiProvider?: string,
    manager?: EntityManager,
  ): Promise<ModerationLog> {
    const repo = manager ? manager.getRepository(ModerationLog) : this.moderationLogRepo;
    const log = repo.create({
      confessionId,
      userId,
      content: content.substring(0, 5000),
      moderationScore: result.score,
      moderationFlags: result.flags,
      moderationStatus: result.status,
      details: result.details,
      requiresReview: result.requiresReview,
      autoActioned: result.status !== ModerationStatus.PENDING,
      apiProvider: apiProvider || 'fallback',
    });

    return await repo.save(log);
  }

  async updateReview(
    logId: string,
    status: ModerationStatus,
    reviewedBy: string,
    notes?: string,
  ): Promise<ModerationLog> {
    const log = await this.moderationLogRepo.findOne({ where: { id: logId } });
    
    if (!log) {
      throw new Error('Moderation log not found');
    }

    log.reviewed = true;
    log.reviewedBy = reviewedBy;
    log.reviewedAt = new Date();
    log.moderationStatus = status;
    if (notes) {
      log.reviewNotes = notes;
    }

    return await this.moderationLogRepo.save(log);
  }

  async getPendingReviews(limit = 50, offset = 0) {
    return await this.moderationLogRepo.find({
      where: [
        { requiresReview: true, reviewed: false },
        { moderationStatus: ModerationStatus.FLAGGED, reviewed: false },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getLogsByConfession(confessionId: string) {
    return await this.moderationLogRepo.find({
      where: { confessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLogsByUser(userId: string, limit = 100) {
    return await this.moderationLogRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getModerationStats(startDate?: Date, endDate?: Date) {
    const query = this.moderationLogRepo.createQueryBuilder('log');

    if (startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const total = await query.getCount();
    
    const byStatus = await query
      .select('log.moderationStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.moderationStatus')
      .getRawMany();

    const avgScore = await query
      .select('AVG(log.moderationScore)', 'avgScore')
      .getRawOne();

    return {
      total,
      byStatus,
      avgScore: parseFloat(avgScore?.avgScore) || 0,
    };
  }

  async getAccuracyMetrics() {
    const reviewed = await this.moderationLogRepo.find({
      where: { reviewed: true },
    });

    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    for (const log of reviewed) {
      const aiPredictedHarmful = 
        log.moderationStatus === ModerationStatus.REJECTED || 
        log.moderationStatus === ModerationStatus.FLAGGED;
      const humanConfirmedHarmful = log.moderationStatus === ModerationStatus.REJECTED;

      if (aiPredictedHarmful && humanConfirmedHarmful) truePositives++;
      else if (aiPredictedHarmful && !humanConfirmedHarmful) falsePositives++;
      else if (!aiPredictedHarmful && !humanConfirmedHarmful) trueNegatives++;
      else if (!aiPredictedHarmful && humanConfirmedHarmful) falseNegatives++;
    }

    const total = reviewed.length;
    const accuracy = total > 0 ? (truePositives + trueNegatives) / total : 0;
    const precision = (truePositives + falsePositives) > 0 
      ? truePositives / (truePositives + falsePositives) 
      : 0;
    const recall = (truePositives + falseNegatives) > 0 
      ? truePositives / (truePositives + falseNegatives) 
      : 0;
    const f1Score = (precision + recall) > 0 
      ? 2 * (precision * recall) / (precision + recall) 
      : 0;

    return {
      total,
      truePositives,
      falsePositives,
      trueNegatives,
      falseNegatives,
      accuracy,
      precision,
      recall,
      f1Score,
    };
  }
}