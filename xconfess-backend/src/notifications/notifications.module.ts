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

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationPreference]),
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    ConfigModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    EmailNotificationService,
    NotificationProcessor,
    NotificationGateway,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}