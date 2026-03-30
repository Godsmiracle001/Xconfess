import { Controller, Post, Get, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './entities/dto/create-report.dto';
import { UpdateReportDto } from './entities/dto/update-report.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Body() dto: CreateReportDto) {
    // reporterId null until auth guard is wired up
    return this.reportService.create(dto, null);
  }

  @Get()
  findAll() {
    return this.reportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReportDto) {
    return this.reportService.updateStatus(id, dto);
  }

  @Patch(':id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.resolve(id);
  }

  @Patch(':id/dismiss')
  dismiss(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.dismiss(id);
  }
}