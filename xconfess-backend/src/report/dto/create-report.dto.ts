import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportType } from '../../admin/entities/report.entity';

export class CreateReportDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
