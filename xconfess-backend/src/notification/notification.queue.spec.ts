import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotificationQueue,
  CommentNotificationPayload,
} from './notification.queue';
import {
  EmailService,
  TemplateVariableValidationError,
} from '../email/email.service';
import { AppLogger } from '../logger/logger.service';
import { AuditLogService } from '../audit-log/audit-log.service';

// ── Redis mock ────────────────────────────────────────────────────────────────
const mockRedisSet = jest.fn();
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: mockRedisSet,
    quit: jest.fn().mockResolvedValue(undefined),
  }));
});

// ── BullMQ mock ───────────────────────────────────────────────────────────────
const mockQueueAdd = jest.fn();
const mockQueueClose = jest.fn().mockResolvedValue(undefined);
const mockQueueGetJobCounts = jest
  .fn()
  .mockResolvedValue({ waiting: 0, active: 0, delayed: 0, failed: 0 });
const mockWorkerClose = jest.fn().mockResolvedValue(undefined);
const mockWorkerOn = jest.fn();

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    close: mockQueueClose,
    getJobCounts: mockQueueGetJobCounts,
    getFailedCount: jest.fn().mockResolvedValue(0),
    getJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn().mockResolvedValue(null),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: mockWorkerOn,
    close: mockWorkerClose,
  })),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const makePayload = (
  overrides: Partial<CommentNotificationPayload> = {},
): CommentNotificationPayload => ({
  confession: { id: 'confession-abc' } as any,
  comment: { id: 'comment-xyz', content: 'Hello world' } as any,
  recipientEmail: 'user@example.com',
  channel: 'email_comment_notification',
  ...overrides,
});

describe('NotificationQueue', () => {
  let service: NotificationQueue;
  let logger: jest.Mocked<AppLogger>;
  let emailServiceMock: { sendCommentNotification: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    emailServiceMock = {
      sendCommentNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueue,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string, def: any) => def) },
        },
        {
          provide: EmailService,
          useValue: emailServiceMock,
        },
        {
          provide: AppLogger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            incrementCounter: jest.fn(),
            setGauge: jest.fn(),
            observeTimer: jest.fn(),
            getMetricsSnapshot: jest
              .fn()
              .mockReturnValue({ counters: [], gauges: [], timers: [] }),
          },
        },
        {
          provide: AuditLogService,
          useValue: { logNotificationDlqReplay: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<NotificationQueue>(NotificationQueue);
    logger = module.get(AppLogger);
  });

  // ── buildIdempotencyKey ──────────────────────────────────────────────────────

  describe('buildIdempotencyKey', () => {
    it('produces the same key for identical inputs', () => {
      const fields = {
        eventType: 'comment-notification',
        recipientEmail: 'a@b.com',
        entityId: 'c1',
      };
      expect(service.buildIdempotencyKey(fields)).toBe(
        service.buildIdempotencyKey(fields),
      );
    });

    it('produces different keys for different confession IDs', () => {
      const base = {
        eventType: 'comment-notification',
        recipientEmail: 'a@b.com',
      };
      const k1 = service.buildIdempotencyKey({ ...base, entityId: 'c1' });
      const k2 = service.buildIdempotencyKey({ ...base, entityId: 'c2' });
      expect(k1).not.toBe(k2);
    });

    it('produces different keys for different recipient emails', () => {
      const base = { eventType: 'comment-notification', entityId: 'c1' };
      const k1 = service.buildIdempotencyKey({
        ...base,
        recipientEmail: 'a@b.com',
      });
      const k2 = service.buildIdempotencyKey({
        ...base,
        recipientEmail: 'x@y.com',
      });
      expect(k1).not.toBe(k2);
    });

    it('key starts with the dedupe prefix and contains a 64-char hex hash', () => {
      const key = service.buildIdempotencyKey({
        eventType: 'comment-notification',
        recipientEmail: 'a@b.com',
        entityId: 'c1',
      });
      expect(key).toMatch(/^notif:dedupe:[a-f0-9]{64}$/);
    });
  });

  // ── enqueueCommentNotification ───────────────────────────────────────────────

  describe('enqueueCommentNotification', () => {
    it('enqueues a job when Redis SET NX succeeds (no duplicate)', async () => {
      mockRedisSet.mockResolvedValue('OK');
      mockQueueAdd.mockResolvedValue({ id: 'job-1' });

      await service.enqueueCommentNotification(makePayload());

      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringMatching(/^notif:dedupe:/),
        '1',
        'EX',
        expect.any(Number),
        'NX',
      );
      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
    });

    it('suppresses the job when Redis SET NX returns null (duplicate within TTL)', async () => {
      mockRedisSet.mockResolvedValue(null);

      await service.enqueueCommentNotification(makePayload());

      expect(mockQueueAdd).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('idempotency'),
        'NotificationQueue',
      );
    });

    it('increments the suppression counter on dedupe', async () => {
      mockRedisSet.mockResolvedValue(null);

      await service.enqueueCommentNotification(makePayload());

      expect(logger.incrementCounter).toHaveBeenCalledWith(
        'notification_dedupe_suppressed_total',
        1,
        expect.objectContaining({ queue: 'comment-notifications' }),
      );
    });

    // ── Race condition ─────────────────────────────────────────────────────────

    it('handles race: two concurrent calls — only one enqueues', async () => {
      // Redis atomicity: first caller gets OK, second gets null
      mockRedisSet.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
      mockQueueAdd.mockResolvedValue({ id: 'job-1' });

      const payload = makePayload();
      const [,] = await Promise.all([
        service.enqueueCommentNotification(payload),
        service.enqueueCommentNotification(payload),
      ]);

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledTimes(1); // one suppression logged
    });

    it('handles retry scenario: same payload after TTL expiry enqueues again', async () => {
      // First call succeeds
      mockRedisSet.mockResolvedValueOnce('OK');
      mockQueueAdd.mockResolvedValue({ id: 'job-1' });
      await service.enqueueCommentNotification(makePayload());

      // After TTL expires, Redis no longer holds the key — SET NX succeeds again
      mockRedisSet.mockResolvedValueOnce('OK');
      mockQueueAdd.mockResolvedValue({ id: 'job-2' });
      await service.enqueueCommentNotification(makePayload());

      expect(mockQueueAdd).toHaveBeenCalledTimes(2);
    });

    // ── Distinct events ────────────────────────────────────────────────────────

    it('enqueues separate jobs for distinct confession IDs', async () => {
      mockRedisSet.mockResolvedValue('OK');
      mockQueueAdd.mockResolvedValue({ id: 'job-x' });

      await service.enqueueCommentNotification(
        makePayload({ confession: { id: 'confession-1' } as any }),
      );
      await service.enqueueCommentNotification(
        makePayload({ confession: { id: 'confession-2' } as any }),
      );

      expect(mockQueueAdd).toHaveBeenCalledTimes(2);
    });

    it('enqueues separate jobs for distinct recipient emails', async () => {
      mockRedisSet.mockResolvedValue('OK');
      mockQueueAdd.mockResolvedValue({ id: 'job-x' });

      await service.enqueueCommentNotification(
        makePayload({ recipientEmail: 'a@x.com' }),
      );
      await service.enqueueCommentNotification(
        makePayload({ recipientEmail: 'b@x.com' }),
      );

      expect(mockQueueAdd).toHaveBeenCalledTimes(2);
    });

    // ── Sensitive data ─────────────────────────────────────────────────────────

    it('does not log the recipient email in the dedup warn message', async () => {
      mockRedisSet.mockResolvedValue(null);

      await service.enqueueCommentNotification(
        makePayload({ recipientEmail: 'secret@example.com' }),
      );

      const warnMessage: string = logger.warn.mock.calls[0][0];
      expect(warnMessage).not.toContain('secret@example.com');
    });
  });

  describe('processCommentNotification', () => {
    it('records actionable schema validation context on render failure', async () => {
      const validationError = new TemplateVariableValidationError(
        'comment_notification',
        'v2',
        [
          {
            code: 'unknown',
            key: 'extraField',
            expected: 'not_allowed',
            actual: 'string',
          },
        ],
      );
      (validationError as any).templateMeta = {
        templateKey: 'comment_notification',
        templateVersion: 'v2',
        isCanary: true,
      };

      emailServiceMock.sendCommentNotification.mockRejectedValue(
        validationError,
      );

      await expect(
        (service as any).processCommentNotification(makePayload()),
      ).rejects.toThrow(TemplateVariableValidationError);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          failureContext: expect.objectContaining({
            code: 'template_variable_validation_error',
            templateKey: 'comment_notification',
            templateVersion: 'v2',
            templateTrack: 'canary',
            violations: expect.arrayContaining([
              expect.objectContaining({
                code: 'unknown',
                key: 'extraField',
              }),
            ]),
          }),
        }),
        undefined,
        'NotificationQueue',
      );
    });
  });
});
