import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { NotificationService } from './services/notification.service';
import { EmailNotificationService } from './services/email-notification.service';
import { NotificationController } from './notifications.controller';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationGateway } from './gateways/notification.gateway';
import { DlqAdminController } from './dlq-admin.controller';

/**
 * Retry / backoff strategy
 * ─────────────────────────
 * attempts : 5   (1 initial + 4 retries)
 * backoff  : exponential starting at 2 s
 *
 * Delay schedule (approx.)
 *   attempt 1 →   0 s  (immediate)
 *   attempt 2 →   2 s
 *   attempt 3 →   4 s
 *   attempt 4 →   8 s
 *   attempt 5 →  16 s
 *
 * After attempt 5 the processor moves the job to the dead-letter queue.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),

    // ── Main notification queue ──────────────────────────────────────────────
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 500 }, // keep last 500 for observability
        removeOnFail: false, // keep failed jobs until DLQ ack
      },
    }),

    // ── Dead-letter queue ────────────────────────────────────────────────────
    // No processor consumes this queue — it exists for ops inspection and
    // manual / scheduled reprocessing only.
    BullModule.registerQueue({
      name: 'notifications-dlq',
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),

    ConfigModule,
  ],
  controllers: [NotificationController, DlqAdminController],
  providers: [
    NotificationService,
    EmailNotificationService,
    NotificationProcessor,
    NotificationGateway,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
