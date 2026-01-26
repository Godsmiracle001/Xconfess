import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { EmailNotificationService } from '../services/email-notification.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
    private emailService: EmailNotificationService,
  ) {}

  @Process('send-email')
  async handleSendEmail(job: Job): Promise<void> {
    const { notificationId, userId } = job.data;

    try {
      // Get notification
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId },
      });

      if (!notification) {
        this.logger.warn(`Notification ${notificationId} not found`);
        return;
      }

      // Check if email was already sent
      if (notification.isEmailSent) {
        this.logger.log(`Email already sent for notification ${notificationId}`);
        return;
      }

      // Get user preferences
      const preference = await this.preferenceRepository.findOne({
        where: { userId },
      });

      if (!preference || !preference.enableEmailNotifications || !preference.emailAddress) {
        this.logger.log(`Email notifications disabled for user ${userId}`);
        return;
      }

      // Send email
      await this.emailService.sendNotificationEmail(
        notification,
        preference.emailAddress,
      );

      // Mark as sent
      notification.isEmailSent = true;
      notification.emailSentAt = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(`Email sent successfully for notification ${notificationId}`);
    } catch (error) {
      this.logger.error(`Failed to send email for notification ${notificationId}:`, error);
      
      // Retry logic (Bull will handle retries based on configuration)
      throw error;
    }
  }

  @Process('batch-check')
  async handleBatchCheck(job: Job): Promise<void> {
    const { userId } = job.data;

    try {
      this.logger.log(`Running batch check for user ${userId}`);
      
      // This can be used for scheduled batch checking if needed
      // Implementation depends on specific batching strategy
      
    } catch (error) {
      this.logger.error(`Batch check failed for user ${userId}:`, error);
      throw error;
    }
  }
}