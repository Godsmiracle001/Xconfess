import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataExportController } from './data-export.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { ExportRequest } from './entities/export-request.entity';
import { DataCleanupService } from './data-export-cleanup';

@Module({
  imports: [TypeOrmModule.forFeature([ExportRequest]), AuditLogModule],
  controllers: [DataExportController],
  providers: [DataCleanupService],
})
export class DataExportModule {}
