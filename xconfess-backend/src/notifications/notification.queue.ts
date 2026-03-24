import {
  Processor,
  Process,
  OnQueueFailed,
  OnQueueCompleted,
  InjectQueue,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { EmailNotificationService } from './services/email-notification.service';
import { NotificationType } from './entities/notification.entity';

export const NOTIFICATION_QUEUE = 'notifications';
export const NOTIFICATION_DLQ = 'notifications-dlq';

export interface NotificationJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    messageId?: string;
    senderId?: string;
    senderAnonymousId?: string;
    messageCount?: number;
    messageIds?: string[];
  };
  /** Attached on failure for ops visibility */
  _meta?: {
    originalJobId: string | undefined;
    failedAt: string;
    attemptsMade: number;
    lastError: string;
  };
}

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly emailNotificationService: EmailNotificationService,
    @InjectQueue(NOTIFICATION_DLQ)
    private readonly dlq: Queue<NotificationJobData>,
  ) {}

  // ------------------------------------------------------------------ process
  @Process('send-notification')
  async handleSendNotification(job: Job<NotificationJobData>): Promise<void> {
    this.logger.log(
      `Processing notification job ${job.id} (attempt ${job.attemptsMade + 1})` +
        ` → userId: ${job.data.userId}`,
    );

    await this.emailNotificationService.sendEmail(job.data);
  }

  // --------------------------------------------------------------- on:failed
  /**
   * Called after every failed attempt.
   * When all attempts are exhausted Bull marks the job "failed" — we then
   * copy the full payload + error context into the dead-letter queue.
   */
  @OnQueueFailed()
  async onFailed(job: Job<NotificationJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;

    this.logger.warn(
      `Job ${job.id} failed (attempt ${job.attemptsMade}/${maxAttempts}): ${error.message}`,
    );

    const isExhausted = job.attemptsMade >= maxAttempts;

    if (isExhausted) {
      this.logger.error(
        `Job ${job.id} exhausted all retries — moving to DLQ`,
        error.stack,
      );

      await this.dlq.add(
        'dead-letter',
        {
          ...job.data,
          _meta: {
            originalJobId: String(job.id),
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade,
            lastError: error.message,
          },
        },
        {
          removeOnComplete: false,
          removeOnFail: false,
        },
      );
    }
  }

  // -------------------------------------------------------------- on:completed
  @OnQueueCompleted()
  onCompleted(job: Job<NotificationJobData>): void {
    this.logger.log(`Job ${job.id} completed successfully`);
  }
}
