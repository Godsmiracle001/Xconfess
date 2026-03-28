import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Report, ReportStatus } from './report.entity';
import { Repository } from 'typeorm';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private readonly repo: Repository<Report>,
  ) {}

  async create(dto: CreateReportDto): Promise<Report> {
    // Idempotency check
    if (dto.idempotencyKey) {
      const existing = await this.repo.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return existing;
    }

    const report = this.repo.create({
      reporterId: dto.reporterId,
      targetId: dto.targetId,
      reason: dto.reason,
      idempotencyKey: dto.idempotencyKey,
    });

    return this.repo.save(report);
  }

  async resolve(id: string) {
    await this.repo.update(id, {
      status: ReportStatus.RESOLVED,
    });
    return { message: 'Report resolved' };
  }

  async dismiss(id: string) {
    await this.repo.update(id, {
      status: ReportStatus.DISMISSED,
    });
    return { message: 'Report dismissed' };
  }
}