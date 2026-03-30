import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReportType } from '../report.entity';

export class CreateReportDto {
  @IsInt()
  confessionId: number;

  @IsEnum(ReportType)
  type: ReportType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}