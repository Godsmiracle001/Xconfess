import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Reaction } from 'src/reaction/entities/reaction.entity';
import { User } from 'src/user/entities/user.entity';
import { AnonymousConfession } from 'src/confession/entities/confession.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnonymousConfession, Reaction, User]),
    CacheModule.register(),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService], // Export for use in other modules
})
export class AnalyticsModule {}
