import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { GetReportsQueryDto } from './dto/get-reports-query.dto';
import { PaginatedReportsResponseDto } from './dto/get-reports-response.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { Report } from '../admin/entities/report.entity';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(
    @Query() query: GetReportsQueryDto,
  ): Promise<PaginatedReportsResponseDto> {
    return this.reportsService.getReportsWithFilters(query);
  }

  @Patch(':id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @GetUser() admin: RequestUser,
  ): Promise<Report> {
    return this.reportsService.actionReport(id, admin, dto);
  }
}
