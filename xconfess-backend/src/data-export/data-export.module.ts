import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataExportController } from './data-export.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ExportRequest } from './entities/export-request.entity';
import { DataCleanupService } from './data-export-cleanup';
import { DataExportService } from './data-export.service';
import { ExportProcessor } from './export.processor';
import { User } from '../user/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'export-queue' }),
    TypeOrmModule.forFeature([ExportRequest, User]),
    AuditLogModule,
    EmailModule,
  ],
  controllers: [DataExportController],
  providers: [DataExportService, ExportProcessor, DataCleanupService],
  exports: [DataExportService],
})
export class DataExportModule {}
