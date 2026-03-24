jest.mock('./admin.gateway', () => ({
  AdminGateway: class AdminGateway {},
}));

import { ReportsEventsListener } from './reports.events.listener';
import { AuditActionType } from '../../audit-log/audit-log.entity';

describe('ReportsEventsListener', () => {
  it('emits to gateway on report.created', () => {
    const gateway: any = { emitNewReport: jest.fn() };
    const auditLogService: any = { log: jest.fn() };
    const listener = new ReportsEventsListener(gateway, auditLogService);
    listener.handleReportCreated({ reportId: 'r1' });
    expect(gateway.emitNewReport).toHaveBeenCalledWith({ reportId: 'r1' });
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.REPORT_REALTIME_FANOUT,
        metadata: expect.objectContaining({
          reportId: 'r1',
          deliveryChannel: 'admin_realtime',
        }),
        context: expect.objectContaining({
          actorType: 'system',
          actorId: 'report-events-listener',
        }),
      }),
    );
  });

  it('fans out each created report event to gateway subscribers', () => {
    const gateway: any = { emitNewReport: jest.fn() };
    const auditLogService: any = { log: jest.fn() };
    const listener = new ReportsEventsListener(gateway, auditLogService);
    const events = [
      { reportId: 'r1', scope: 'global', reporterId: 'user-1' },
      { reportId: 'r2', scope: 'channel:abuse' },
      { reportId: 'r3', scope: 'channel:spam' },
    ];

    events.forEach((event) => listener.handleReportCreated(event));

    expect(gateway.emitNewReport).toHaveBeenCalledTimes(events.length);
    expect(gateway.emitNewReport).toHaveBeenNthCalledWith(1, events[0]);
    expect(gateway.emitNewReport).toHaveBeenNthCalledWith(2, events[1]);
    expect(gateway.emitNewReport).toHaveBeenNthCalledWith(3, events[2]);
    expect(auditLogService.log).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        context: expect.objectContaining({
          actorType: 'user',
          actorId: 'user-1',
          userId: 'user-1',
        }),
      }),
    );
  });
});
