// import {
//   Controller,
//   Post,
//   Body,
//   Headers,
//   HttpCode,
//   HttpStatus,
//   UnauthorizedException,
//   Logger,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Confession } from '../confession/entities/confession.entity';
// import { ModerationRepositoryService } from './moderation-repository.service';
// import { ModerationStatus } from './ai-moderation.service';
// import * as crypto from 'crypto';

// interface WebhookPayload {
//   confessionId: string;
//   moderationScore: number;
//   moderationFlags: string[];
//   moderationStatus: ModerationStatus;
//   details: Record<string, number>;
//   timestamp: string;
// }

// @Controller('webhooks/moderation')
// export class ModerationWebhookController {
//   private readonly logger = new Logger(ModerationWebhookController.name);
//   private readonly webhookSecret: string;

//   constructor(
//     private readonly configService: ConfigService,
//     @InjectRepository(Confession)
//     private readonly confessionRepo: Repository<Confession>,
//     private readonly moderationRepoService: ModerationRepositoryService,
//   ) {
//     this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
//   }

//   @Post('results')
//   @HttpCode(HttpStatus.OK)
//   async handleModerationResults(
//     @Body() payload: WebhookPayload,
//     @Headers('x-webhook-signature') signature: string,
//   ) {
//     // Verify webhook signature
//     if (!this.verifySignature(JSON.stringify(payload), signature)) {
//       this.logger.warn('Invalid webhook signature');
//       throw new UnauthorizedException('Invalid signature');
//     }

//     try {
//       this.logger.log(`Processing webhook for confession ${payload.confessionId}`);

//       // Find the confession
//       const confession = await this.confessionRepo.findOne({
//         where: { id: payload.confessionId },
//       });

//       if (!confession) {
//         this.logger.error(`Confession ${payload.confessionId} not found`);
//         return { success: false, error: 'Confession not found' };
//       }

//       // Update confession with async moderation results
//       confession.moderationScore = payload.moderationScore;
//       confession.moderationFlags = payload.moderationFlags as any;
//       confession.moderationStatus = payload.moderationStatus;
//       confession.moderationDetails = payload.details;
//       confession.requiresReview = 
//         payload.moderationStatus === ModerationStatus.FLAGGED;
//       confession.isHidden = 
//         payload.moderationStatus === ModerationStatus.REJECTED;

//       await this.confessionRepo.save(confession);

//       // Update moderation log
//       const logs = await this.moderationRepoService.getLogsByConfession(
//         payload.confessionId,
//       );
      
//       if (logs.length > 0) {
//         const log = logs[0];
//         log.moderationScore = payload.moderationScore;
//         log.moderationFlags = payload.moderationFlags as any;
//         log.moderationStatus = payload.moderationStatus;
//         log.details = payload.details;
//         log.requiresReview = 
//           payload.moderationStatus === ModerationStatus.FLAGGED;
//       }

//       this.logger.log(
//         `Webhook processed successfully for confession ${payload.confessionId}`,
//       );

//       return {
//         success: true,
//         confessionId: payload.confessionId,
//         status: payload.moderationStatus,
//       };
//     } catch (error) {
//       this.logger.error('Error processing webhook:', error);
//       return { success: false, error: error.message };
//     }
//   }

//   private verifySignature(payload: string, signature: string): boolean {
//     if (!this.webhookSecret || !signature) {
//       return false;
//     }

//     const expectedSignature = crypto
//       .createHmac('sha256', this.webhookSecret)
//       .update(payload)
//       .digest('hex');

//     return crypto.timingSafeEqual(
//       Buffer.from(signature),
//       Buffer.from(expectedSignature),
//     );
//   }
// }

// // src/moderation/moderation-events.listener.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { OnEvent } from '@nestjs/event-emitter';

// interface HighSeverityEvent {
//   confessionId: string;
//   userId?: string;
//   score: number;
//   flags: string[];
// }

// interface RequiresReviewEvent {
//   confessionId: string;
//   userId?: string;
//   score: number;
//   flags: string[];
// }

// @Injectable()
// export class ModerationEventsListener {
//   private readonly logger = new Logger(ModerationEventsListener.name);

//   @OnEvent('moderation.high-severity')
//   async handleHighSeverity(event: HighSeverityEvent) {
//     this.logger.warn(
//       `HIGH SEVERITY CONTENT DETECTED - Confession: ${event.confessionId}, ` +
//       `Score: ${event.score}, Flags: ${event.flags.join(', ')}`,
//     );

//     // TODO: Send notification to admin/moderators
//     // Example: this.notificationService.notifyModerators(event);
    
//     // TODO: Could also trigger additional actions like:
//     // - Email notification
//     // - Slack/Discord webhook
//     // - SMS alert for critical content
//     // - Automatic user warning/suspension for repeat offenders
//   }

//   @OnEvent('moderation.requires-review')
//   async handleRequiresReview(event: RequiresReviewEvent) {
//     this.logger.log(
//       `Content flagged for review - Confession: ${event.confessionId}, ` +
//       `Score: ${event.score}, Flags: ${event.flags.join(', ')}`,
//     );

//     // TODO: Add to moderation queue
//     // TODO: Send notification to moderators (lower priority)
//   }
// }