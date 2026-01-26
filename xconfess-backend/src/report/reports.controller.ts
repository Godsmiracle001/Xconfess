import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('confessions')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

@Post(':id/report')
async reportConfession(
  @Param('id') id: string,   // ✅ MUST be string (UUID)
  @Req() req: any,
  @Body() dto: CreateReportDto,
) {
  const reporterId = req.user?.id ?? null;
  return this.reportsService.createReport(id, reporterId, dto);
}

}
