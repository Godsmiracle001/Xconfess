import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AdminGateway } from './admin.gateway';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { AuditActionType } from '../../audit-log/audit-log.entity';

@Injectable()
export class ReportsEventsListener {
  constructor(
    private readonly adminGateway: AdminGateway,
    private readonly auditLogService: AuditLogService,
  ) {}

  @OnEvent('report.created')
  handleReportCreated(payload: any) {
    this.adminGateway.emitNewReport(payload);

    void this.auditLogService.log({
      actionType: AuditActionType.REPORT_REALTIME_FANOUT,
      metadata: {
        entityType: 'report',
        entityId: payload?.reportId || null,
        reportId: payload?.reportId || null,
        deliveryChannel: 'admin_realtime',
        scope: payload?.scope || null,
        fannedOutAt: new Date().toISOString(),
      },
      context: {
        actorType:
          payload?.actorType || (payload?.reporterId ? 'user' : 'system'),
        actorId:
          payload?.actorId ||
          payload?.reporterId?.toString() ||
          'report-events-listener',
        userId: payload?.reporterId?.toString() || null,
      },
    });
  }
}
