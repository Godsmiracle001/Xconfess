import { Module } from '@nestjs/common';
import { DataExportController } from './data-export.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportRequest } from './entities/export-request.entity';
import { BullModule } from '@nestjs/bull';
import { DataExportService } from './data-export.service';
import { ExportProcessor } from './export.processor';
import { User } from '../user/entities/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExportRequest, User]),
    BullModule.registerQueue({ name: 'export-queue' }),
    EmailModule,
  ],
  controllers: [DataExportController],
  providers: [DataExportService, ExportProcessor],
  exports: [DataExportService],
})
export class DataExportModule {}
