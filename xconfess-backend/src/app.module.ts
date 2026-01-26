import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getTypeOrmConfig } from './config/database.config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfessionModule } from './confession/confession.module';
import { ConfessionDraftModule } from './confession-draft/confession-draft.module';
import { ReactionModule } from './reaction/reaction.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import throttleConfig from './config/throttle.config';
import { MessagesModule } from './messages/messages.module';
import { ReportModule } from './report/reports.module';
import { StellarModule } from './stellar/stellar.module';

import { RateLimitGuard } from './auth/guard/rate-limit.guard';
import { LoggerModule } from './logger/logger.module';
import { EncryptionModule } from './encryption/encryption.module';
// TODO: NotificationModule requires Bull/Redis configuration - temporarily disabled
// import { NotificationModule } from './notifications/notifications.module';

@Module({
  imports: [
    LoggerModule,
    EncryptionModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [throttleConfig],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl') || 900,
            limit: config.get<number>('throttle.limit') || 100,
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),
    UserModule,
    AuthModule,
    ConfessionModule,
    ConfessionDraftModule,
    ReactionModule,
    MessagesModule,
    ReportModule,
    // NotificationModule, // Requires Bull/Redis - temporarily disabled
    StellarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule {}
