import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import {AnonymousConfession } from '../confession/entities/confession.entity';


@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(AnonymousConfession)
    private readonly confessionRepository: Repository<AnonymousConfession>,
  ) {}

  async createReport(
    confessionId: string,
    reporterId: number | null,
    dto: CreateReportDto,
  ): Promise<Report> {
   const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return this.reportRepository.manager.transaction(async (manager) => {
      // 1️⃣ Ensure confession exists
      const confession = await manager
        .getRepository(AnonymousConfession)
        .findOne({ where: { id: confessionId } });

      if (!confession) {
        throw new NotFoundException('Confession not found');
      }

      // 2️⃣ Duplicate check (handle NULL reporterId explicitly)
      const qb = manager
        .getRepository(Report)
        .createQueryBuilder('report')
        .where('report.confessionId = :confessionId', { confessionId })
        .andWhere('report.created_at > :since', { since });

      if (reporterId === null) {
        qb.andWhere('report.reporterId IS NULL');
      } else {
        qb.andWhere('report.reporterId = :reporterId', { reporterId });
      }

      const existingReport = await qb.getOne();

      if (existingReport) {
        throw new BadRequestException(
          'You have already reported this confession within the last 24 hours.',
        );
      }

      // 3️⃣ Save report atomically
      const report = manager.getRepository(Report).create({
        confessionId,
        reporterId: reporterId ?? undefined,
        reason: dto.reason,
        details: dto.details,
      });

      return manager.getRepository(Report).save(report);
    });
  }
}
