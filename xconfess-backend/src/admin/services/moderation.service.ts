import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { Request } from 'express';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(
    adminId: number,
    action: AuditAction,
    entityType: string | null,
    entityId: string | null,
    metadata: Record<string, any> | null,
    notes: string | null,
    request?: Request,
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      adminId,
      action,
      entityType,
      entityId,
      metadata,
      notes,
      ipAddress: request?.ip || request?.socket?.remoteAddress || null,
      userAgent: request?.headers['user-agent'] || null,
    });

    const saved = await this.auditLogRepository.save(auditLog);
    this.logger.log(`Audit log created: ${action} by admin ${adminId}`);
    return saved;
  }

  async getAuditLogs(
    adminId?: number,
    action?: AuditAction,
    entityType?: string,
    entityId?: string,
    limit = 100,
    offset = 0,
  ): Promise<[AuditLog[], number]> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .orderBy('log.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (adminId) {
      query.andWhere('log.adminId = :adminId', { adminId });
    }

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (entityType) {
      query.andWhere('log.entityType = :entityType', { entityType });
    }

    if (entityId) {
      query.andWhere('log.entityId = :entityId', { entityId });
    }

    return query.getManyAndCount();
  }
}
