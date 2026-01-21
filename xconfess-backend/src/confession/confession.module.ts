// src/confession/confession.module.ts
import { Module, NestModule, MiddlewareConsumer, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfessionController } from './confession.controller';
import { ConfessionService } from './confession.service';
import { AnonymousConfession } from './entities/confession.entity';
import { AnonymousConfessionRepository } from './repository/confession.repository';
import { ConfessionViewCacheService } from './confession-view-cache.service';
import { ReactionModule } from '../reaction/reaction.module';
import { AnonymousContextMiddleware } from '../middleware/anonymous-context.middleware';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnonymousConfession]),
    forwardRef(() => ReactionModule),
    ModerationModule,
  ],
  controllers: [ConfessionController],
  providers: [
    ConfessionService,
    AnonymousConfessionRepository,
    ConfessionViewCacheService,
    { provide: 'VIEW_CACHE_EXPIRY', useValue: 60 * 60 },
  ],
  exports: [AnonymousConfessionRepository, ConfessionService],
})
export class ConfessionModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AnonymousContextMiddleware).forRoutes('confessions');
  }
}