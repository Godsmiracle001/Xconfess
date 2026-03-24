import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from 'src/notifications/services/notification.service';
import { NotificationType } from 'src/notifications/entities/notification.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditActionType } from '../audit-log/audit-log.entity';
import { ModerationRepositoryService } from './moderation-repository.service';
import { ModerationStatus, ModerationCategory } from './ai-moderation.service';
import { UserRole } from '../user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

interface HighSeverityEvent {
  confessionId: string;
  userId?: string;
  score: number;
  flags: string[];
}

interface RequiresReviewEvent {
  confessionId: string;
  userId?: string;
  score: number;
  flags: string[];
}

@Injectable()
export class ModerationEventsListener {
  private readonly logger = new Logger(ModerationEventsListener.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
    private readonly moderationRepoService: ModerationRepositoryService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @OnEvent('moderation.high-severity')
  async handleHighSeverity(event: HighSeverityEvent) {
    this.logger.warn(
      `HIGH SEVERITY CONTENT DETECTED - Confession: ${event.confessionId}, ` +
        `Score: ${event.score}, Flags: ${event.flags.join(', ')}`,
    );
    try {
      // Find all admin users
      const admins = await this.userRepository.find({
        where: { role: UserRole.ADMIN, is_active: true },
      });
      for (const admin of admins) {
        await this.notificationService.createNotification({
          type: NotificationType.SYSTEM,
          userId: String(admin.id),
          title: 'High-Severity Content Detected',
          message: `Confession ${event.confessionId} flagged as high-severity. Score: ${event.score}, Flags: ${event.flags.join(', ')}`,
          metadata: {
            confessionId: event.confessionId,
            score: event.score,
            flags: event.flags,
          },
        });
      }
      await this.auditLogService.log({
        actionType: AuditActionType.MODERATION_ESCALATION,
        metadata: {
          eventType: 'high-severity',
          confessionId: event.confessionId,
          score: event.score,
          flags: event.flags,
        },
        context: { userId: event.userId || null },
      });
    } catch (err) {
      this.logger.error(
        `Failed to escalate high-severity moderation event: ${err.message}`,
      );
      throw err;
    }
  }

  @OnEvent('moderation.requires-review')
  async handleRequiresReview(event: RequiresReviewEvent) {
    this.logger.log(
      `Content flagged for review - Confession: ${event.confessionId}, ` +
        `Score: ${event.score}, Flags: ${event.flags.join(', ')}`,
    );
    try {
      // Persist moderation log entry for review queue
      await this.moderationRepoService.createLog(
        '', // content not needed for escalation
        {
          score: event.score,
          flags: event.flags as unknown as ModerationCategory[],
          status: ModerationStatus.FLAGGED,
          requiresReview: true,
          details: {},
        },
        event.confessionId,
        event.userId,
        'escalation',
      );
      await this.auditLogService.log({
        actionType: AuditActionType.MODERATION_ESCALATION,
        metadata: {
          eventType: 'requires-review',
          confessionId: event.confessionId,
          score: event.score,
          flags: event.flags,
        },
        context: { userId: event.userId || null },
      });
    } catch (err) {
      this.logger.error(
        `Failed to escalate requires-review moderation event: ${err.message}`,
      );
      throw err;
    }
  }
}
