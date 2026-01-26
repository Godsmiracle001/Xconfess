import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { Report } from './report.entity';
import { ReportsController } from './reports.controller';
import { AnonymousConfession } from '../confession/entities/confession.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, AnonymousConfession])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportModule {}
