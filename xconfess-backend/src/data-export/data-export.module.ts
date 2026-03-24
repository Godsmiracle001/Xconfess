import { Module } from '@nestjs/common';
import { DataExportController } from './data-export.controller';

@Module({
  controllers: [DataExportController],
})
export class DataExportModule {}
