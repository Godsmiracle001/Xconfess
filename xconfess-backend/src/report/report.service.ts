import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { Report, ReportStatus } from './entities/report.entity';
import { CreateReportDto } from './entities/dto/create-report.dto';
import { UpdateReportDto } from './entities/dto/update-report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  async create(dto: CreateReportDto, reporterId: number | null): Promise<Report> {
    const idempotencyKey = createHash('sha256')
      .update(`${reporterId}-${dto.confessionId}-${dto.type}`)
      .digest('hex');

    const existing = await this.reportRepository.findOne({ where: { idempotencyKey } });
    if (existing) {
      return existing;
    }

    const report = this.reportRepository.create({
      ...dto,
      reporterId,
      idempotencyKey,
    });

    return this.reportRepository.save(report);
  }

  async findAll(): Promise<Report[]> {
    return this.reportRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Report> {
    const report = await this.reportRepository.findOne({ where: { id } });
    if (!report) throw new NotFoundException(`Report #${id} not found`);
    return report;
  }

  async updateStatus(id: number, dto: UpdateReportDto): Promise<Report> {
    const report = await this.findOne(id);
    report.status = dto.status;
    if (dto.note !== undefined) report.note = dto.note;
    return this.reportRepository.save(report);
  }

  async resolve(id: number, note?: string): Promise<Report> {
    return this.updateStatus(id, { status: ReportStatus.RESOLVED, note });
  }

  async dismiss(id: number, note?: string): Promise<Report> {
    return this.updateStatus(id, { status: ReportStatus.DISMISSED, note });
  }
}