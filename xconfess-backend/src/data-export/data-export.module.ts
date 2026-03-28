import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataExportController } from './data-export.controller';
import { DataExportService } from './data-export.service';
import { ExportRequest } from './entities/export-request.entity';
import { ExportChunk } from './entities/export-chunk.entity';
import { ExportProcessor } from './export.processor';

@Module({
  imports: [TypeOrmModule.forFeature([ExportRequest, ExportChunk])],
  controllers: [DataExportController],
  providers: [DataExportService, ExportProcessor],
})
export class DataExportModule {}
