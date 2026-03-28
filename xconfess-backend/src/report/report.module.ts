import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Report } from './report.entity';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Report])],
  providers: [ReportService],
  controllers: [ReportController],
  exports: [ReportService],
})
export class ReportModule {}

import { ReportsService } from './reports.service';
import { Report } from '../admin/entities/report.entity';
import { ReportsController } from './reports.controller';
import { AdminReportsController } from './admin-reports.controller';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { OutboxEvent } from '../common/entities/outbox-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report, AnonymousConfession, OutboxEvent]),
    AuditLogModule,
    AuthModule,
  ],
  providers: [ReportsService],
  controllers: [ReportsController, AdminReportsController],
  exports: [ReportsService],
})
export class ReportModule {}

