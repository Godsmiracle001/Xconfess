import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './services/admin.service';
import { ModerationService } from './services/moderation.service';
import { Report } from './entities/report.entity';
import { AuditLog } from './entities/audit-log.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { User } from '../user/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminGateway } from './realtime/admin.gateway';
import { ReportsEventsListener } from './realtime/reports.events.listener';
import { UserModule } from '../user/user.module';
import { UserAnonymousUser } from '../user/entities/user-anonymous-link.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, AuditLog, AnonymousConfession, User, UserAnonymousUser]),
    AuthModule,
    UserModule,
    AuditLogModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, ModerationService, AdminGateway, ReportsEventsListener],
  exports: [AdminService, ModerationService],
})
export class AdminModule {}
