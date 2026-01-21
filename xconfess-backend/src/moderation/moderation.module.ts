// src/moderation/moderation.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiModerationService } from './ai-moderation.service';
import { ModerationRepositoryService } from './moderation-repository.service';
import { ModerationController } from './moderation.controller';
import { ModerationEventsListener } from './moderation-events.listener';
import { ModerationLog } from './entities/moderation-log.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModerationLog, AnonymousConfession]),
    ConfigModule,
  ],
  controllers: [ModerationController],
  providers: [
    AiModerationService,
    ModerationRepositoryService,
    ModerationEventsListener,
  ],
  exports: [AiModerationService, ModerationRepositoryService],
})
export class ModerationModule {}