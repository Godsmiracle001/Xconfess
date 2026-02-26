import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { OutboxEvent, OutboxStatus } from '../common/entities/outbox-event.entity';
import { NotificationQueue } from './notification.queue';

@Injectable()
export class OutboxDispatcherService {
    private readonly logger = new Logger(OutboxDispatcherService.name);
    private isProcessing = false;

    constructor(
        @InjectRepository(OutboxEvent)
        private readonly outboxRepo: Repository<OutboxEvent>,
        private readonly notificationQueue: NotificationQueue,
    ) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async handleOutbox() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            await this.processEvents();
        } catch (error) {
            this.logger.error(`Error processing outbox: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    private async processEvents() {
        const events = await this.outboxRepo.find({
            where: [
                { status: OutboxStatus.PENDING },
                { status: OutboxStatus.FAILED, retryCount: LessThan(5) },
            ],
            order: { createdAt: 'ASC' },
            take: 50,
        });

        if (events.length === 0) return;

        this.logger.log(`Processing ${events.length} outbox events`);

        for (const event of events) {
            await this.processEvent(event);
        }
    }

    private async processEvent(event: OutboxEvent) {
        try {
            // Set to processing
            event.status = OutboxStatus.PROCESSING;
            await this.outboxRepo.save(event);

            // Dispatch based on type
            switch (event.type) {
                case 'comment_notification':
                    await this.notificationQueue.enqueueCommentNotification(event.payload);
                    break;
                case 'message_notification':
                    await this.notificationQueue.enqueueMessageNotification(event.payload);
                    break;
                case 'reply_notification':
                    await this.notificationQueue.enqueueReplyNotification(event.payload);
                    break;
                case 'reaction_notification':
                case 'reaction_update':
                    await this.notificationQueue.enqueueReactionNotification(event.payload);
                    break;
                case 'report_notification':
                    await this.notificationQueue.enqueueReportNotification(event.payload);
                    break;
                default:
                    this.logger.warn(`Unknown outbox event type: ${event.type}`);
                    event.status = OutboxStatus.COMPLETED; // Mark as completed to stop retrying unknown types
                    event.processedAt = new Date();
                    await this.outboxRepo.save(event);
                    return;
            }

            // Mark as completed
            event.status = OutboxStatus.COMPLETED;
            event.processedAt = new Date();
            await this.outboxRepo.save(event);
        } catch (error) {
            this.logger.error(`Failed to dispatch event ${event.id}: ${error.message}`);
            event.status = OutboxStatus.FAILED;
            event.retryCount += 1;
            event.lastError = error.message;
            await this.outboxRepo.save(event);
        }
    }
}
