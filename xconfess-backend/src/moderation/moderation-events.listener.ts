import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

interface HighSeverityEvent {
  confessionId: string;
  userId?: string;
  score: number;
  flags: string[];
}

interface RequiresReviewEvent {
  confessionId: string;
  userId?: string;
  score: number;
  flags: string[];
}

@Injectable()
export class ModerationEventsListener {
  private readonly logger = new Logger(ModerationEventsListener.name);

  @OnEvent('moderation.high-severity')
  async handleHighSeverity(event: HighSeverityEvent) {
    this.logger.warn(
      `HIGH SEVERITY CONTENT DETECTED - Confession: ${event.confessionId}, ` +
        `Score: ${event.score}, Flags: ${event.flags.join(', ')}`,
    );

    // TODO: Send notification to admin/moderators
    // Example: this.notificationService.notifyModerators(event);
  }

  @OnEvent('moderation.requires-review')
  async handleRequiresReview(event: RequiresReviewEvent) {
    this.logger.log(
      `Content flagged for review - Confession: ${event.confessionId}, ` +
        `Score: ${event.score}, Flags: ${event.flags.join(', ')}`,
    );

    // TODO: Add to moderation queue
  }
}