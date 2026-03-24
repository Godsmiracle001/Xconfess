import { Injectable, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ExportRequest } from './entities/export-request.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditActionType } from '../audit-log/audit-log.entity';

@Injectable()
export class DataCleanupService {
  constructor(
    @InjectRepository(ExportRequest) private repo: Repository<ExportRequest>,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeOldExports() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // We keep the record but delete the heavy binary data
    const result = await this.repo.update(
      { createdAt: LessThan(sevenDaysAgo) },
      { fileData: null, status: 'EXPIRED' },
    );

    await this.auditLogService?.log({
      actionType: AuditActionType.EXPORT_CLEANUP_EXPIRED,
      metadata: {
        entityType: 'data_export_cleanup',
        entityId: 'expired_exports',
        expiredBefore: sevenDaysAgo.toISOString(),
        affected: result.affected ?? 0,
        cleanedAt: new Date().toISOString(),
      },
      context: {
        actorType: 'system',
        actorId: 'data-export-cleanup',
      },
    });
  }
}
