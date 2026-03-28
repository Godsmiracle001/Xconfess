import { Controller, Post, Body, Param, Patch } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly service: ReportService) {}

  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.service.create(dto);
  }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) {
    return this.service.resolve(id);
  }

  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string) {
    return this.service.dismiss(id);
  }
}