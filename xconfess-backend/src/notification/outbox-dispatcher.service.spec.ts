jest.mock('./notification.queue', () => ({
  NotificationQueue: class NotificationQueue {},
}));

import { Repository } from 'typeorm';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { OutboxEvent, OutboxStatus } from '../common/entities/outbox-event.entity';
import { AuditActionType } from '../audit-log/audit-log.entity';

describe('OutboxDispatcherService', () => {
  it('audits successful dispatches as system actions', async () => {
    const repo = {
      save: jest
        .fn()
        .mockImplementation(async (event: OutboxEvent) => event),
    } as unknown as Repository<OutboxEvent>;
    const notificationQueue = {
      enqueueCommentNotification: jest.fn().mockResolvedValue(undefined),
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new OutboxDispatcherService(
      repo,
      notificationQueue as any,
      auditLogService as any,
    );
    const event = {
      id: 'evt-1',
      type: 'comment_notification',
      payload: { recipientEmail: 'user@example.com' },
      status: OutboxStatus.PENDING,
      retryCount: 0,
    } as OutboxEvent;

    await (service as any).processEvent(event);

    expect(notificationQueue.enqueueCommentNotification).toHaveBeenCalledWith(
      event.payload,
    );
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.NOTIFICATION_OUTBOX_DISPATCHED,
        metadata: expect.objectContaining({
          outboxEventId: 'evt-1',
          outboxEventType: 'comment_notification',
          deliveryStatus: 'completed',
        }),
        context: expect.objectContaining({
          actorType: 'system',
          actorId: 'notification-outbox',
        }),
      }),
    );
  });

  it('audits failed dispatches with stable system attribution', async () => {
    const repo = {
      save: jest
        .fn()
        .mockImplementation(async (event: OutboxEvent) => event),
    } as unknown as Repository<OutboxEvent>;
    const notificationQueue = {
      enqueueCommentNotification: jest
        .fn()
        .mockRejectedValue(new Error('smtp down')),
    };
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new OutboxDispatcherService(
      repo,
      notificationQueue as any,
      auditLogService as any,
    );
    const event = {
      id: 'evt-2',
      type: 'comment_notification',
      payload: { recipientEmail: 'user@example.com' },
      status: OutboxStatus.PENDING,
      retryCount: 0,
    } as OutboxEvent;

    await (service as any).processEvent(event);

    expect(event.status).toBe(OutboxStatus.FAILED);
    expect(event.retryCount).toBe(1);
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.NOTIFICATION_OUTBOX_DISPATCHED,
        metadata: expect.objectContaining({
          outboxEventId: 'evt-2',
          deliveryStatus: 'failed',
          error: 'smtp down',
        }),
        context: expect.objectContaining({
          actorType: 'system',
          actorId: 'notification-outbox',
        }),
      }),
    );
  });
});
