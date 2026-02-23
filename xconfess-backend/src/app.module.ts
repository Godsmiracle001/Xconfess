import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getTypeOrmConfig } from './config/database.config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfessionModule } from './confession/confession.module';
import { ReactionModule } from './reaction/reaction.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { APP_GUARD } from '@nestjs/core';
import throttleConfig from './config/throttle.config';
import { MessagesModule } from './messages/messages.module';
import { AdminModule } from './admin/admin.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ReportModule } from './report/report.module';
// import { DataExportService } from './data-export/data-export.service';
import { DataExportModule } from './data-export/data-export.module';
import { StellarModule } from './stellar/stellar.module';
import { CacheModule } from './cache/cache.module';
import { TippingModule } from './tipping/tipping.module';
import { LoggerModule } from './logger/logger.module';
import { EncryptionModule } from './encryption/encryption.module';
// TODO: NotificationModule requires Bull/Redis configuration - temporarily disabled
// import { NotificationModule } from './notifications/notifications.module';

@Module({
  imports: [
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
    EventEmitterModule.forRoot(),
    TerminusModule,
    UserModule,
    AuthModule,
    ConfessionModule,
    ReactionModule,
    MessagesModule,
    AdminModule,
    ReportModule,
    DataExportModule,
    // NotificationModule, // Requires Bull/Redis - temporarily disabled
    StellarModule,
    TippingModule,
    LoggerModule,
    EncryptionModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // DataExportService,
  ],
})
export class AppModule {}
