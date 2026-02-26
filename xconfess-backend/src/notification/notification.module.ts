import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotificationQueue } from './notification.queue';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { getDlqRetentionConfig } from '../config/dlq-retention.config';
import { EmailModule } from '../email/email.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { LoggerModule } from '../logger/logger.module';
import { NotificationAdminController } from './notification.admin.controller';
import { User } from '../user/entities/user.entity';
import { OutboxEvent } from '../common/entities/outbox-event.entity';

@Module({
  imports: [
    EmailModule,
    AuditLogModule,
    LoggerModule,
    TypeOrmModule.forFeature([User, OutboxEvent]),
  ],
  controllers: [NotificationAdminController],
  providers: [
    NotificationQueue,
    OutboxDispatcherService,
    { provide: 'DLQ_RETENTION_CONFIG', useFactory: getDlqRetentionConfig, inject: [ConfigService] },
  ],
  exports: [NotificationQueue],
})
export class NotificationModule { }
