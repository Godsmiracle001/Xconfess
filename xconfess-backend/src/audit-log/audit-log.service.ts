import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditActionType } from './audit-log.entity';

export interface AuditLogContext {
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateAuditLogDto {
  actionType: AuditActionType;
  metadata?: Record<string, any>;
  context?: AuditLogContext;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log a sensitive action to the audit log
   * Includes error handling to prevent logging failures from breaking the application
   */
  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId: dto.context?.userId || null,
        actionType: dto.actionType,
        metadata: dto.metadata || {},
        ipAddress: dto.context?.ipAddress || null,
        userAgent: dto.context?.userAgent || null,
      });

      await this.auditLogRepository.save(auditLog);

      this.logger.log(
        `Audit log created: ${dto.actionType} by user ${dto.context?.userId || 'anonymous'}`,
      );
    } catch (error) {
      // Log the error but don't throw to prevent disrupting the main operation
      this.logger.error(
        `Failed to create audit log for action ${dto.actionType}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log confession deletion
   */
  async logConfessionDelete(
    confessionId: string,
    userId: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.log({
      actionType: AuditActionType.CONFESSION_DELETE,
      metadata: {
        confessionId,
        deletedAt: new Date().toISOString(),
      },
      context: { ...context, userId },
    });
  }

  /**
   * Log comment deletion
   */
  async logCommentDelete(
    commentId: string,
    confessionId: string,
    userId: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.log({
      actionType: AuditActionType.COMMENT_DELETE,
      metadata: {
        commentId,
        confessionId,
        deletedAt: new Date().toISOString(),
      },
      context: { ...context, userId },
    });
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(
    identifier: string,
    reason: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.log({
      actionType: AuditActionType.FAILED_LOGIN,
      metadata: {
        identifier, // email or username
        reason,
        attemptedAt: new Date().toISOString(),
      },
      context,
    });
  }

  /**
   * Log report creation
   */
  async logReport(
    reportId: string,
    targetType: 'confession' | 'comment',
    targetId: string,
    reporterId: string,
    reason: string,
    context?: AuditLogContext,
  ): Promise<void> {
    await this.log({
      actionType: AuditActionType.REPORT_CREATED,
      metadata: {
        reportId,
        targetType,
        targetId,
        reason,
        reportedAt: new Date().toISOString(),
      },
      context: { ...context, userId: reporterId },
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async findAll(options: {
    userId?: string;
    actionType?: AuditActionType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const query = this.auditLogRepository.createQueryBuilder('audit_log');

    if (options.userId) {
      query.andWhere('audit_log.user_id = :userId', {
        userId: options.userId,
      });
    }

    if (options.actionType) {
      query.andWhere('audit_log.action_type = :actionType', {
        actionType: options.actionType,
      });
    }

    if (options.startDate) {
      query.andWhere('audit_log.timestamp >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options.endDate) {
      query.andWhere('audit_log.timestamp <= :endDate', {
        endDate: options.endDate,
      });
    }

    query.orderBy('audit_log.timestamp', 'DESC');
    query.limit(options.limit || 100);
    query.offset(options.offset || 0);

    const [logs, total] = await query.getManyAndCount();

    return {
      logs,
      total,
      limit: options.limit || 100,
      offset: options.offset || 0,
    };
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date) {
    const query = this.auditLogRepository.createQueryBuilder('audit_log');

    if (startDate) {
      query.andWhere('audit_log.timestamp >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('audit_log.timestamp <= :endDate', { endDate });
    }

    const actionTypeCounts = await query
      .select('audit_log.action_type', 'actionType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit_log.action_type')
      .getRawMany();

    const totalLogs = await query.getCount();

    return {
      totalLogs,
      actionTypeCounts,
    };
  }
}