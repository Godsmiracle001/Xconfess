import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionService } from './reaction.service';
import { ReactionController } from './reaction.controller';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { Reaction } from './entities/reaction.entity';
import { ConfessionModule } from '../confession/confession.module';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';
import { OutboxEvent } from '../common/entities/outbox-event.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { WebSocketLogger } from '../websocket/websocket.logger';
import { ReactionsGateway } from './reactions.gateway';
import { WebSocketHealthController } from '../websocket/websocket-health.controller';

@Module({
  imports: [
    forwardRef(() => ConfessionModule),
    TypeOrmModule.forFeature([
      Reaction,
      AnonymousConfession,
      AnonymousUser,
      OutboxEvent,
    ]),
    AnalyticsModule,
  ],
  controllers: [ReactionController, WebSocketHealthController],
  providers: [ReactionService, WebSocketLogger, ReactionsGateway],
  exports: [ReactionService, ReactionsGateway],
})
export class ReactionModule {}

