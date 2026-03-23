import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportStatus, ReportType } from '../admin/entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportReason } from './enums/report-reason.enum';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { GetReportsQueryDto } from './dto/get-reports-query.dto';
import { PaginatedReportsResponseDto } from './dto/get-reports-response.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { User, UserRole } from '../user/entities/user.entity';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';

/** Message returned when user attempts a duplicate report */
export const DUPLICATE_REPORT_MESSAGE =
  'You have already reported this confession within the last 24 hours.';

/** PostgreSQL unique_violation (23505) from idx_reports_dedupe_confession_reporter */
function isDuplicateReportConstraintViolation(err: unknown): boolean {
  const code = (err as { code?: string; driverError?: { code?: string } })?.code
    ?? (err as { driverError?: { code?: string } })?.driverError?.code;
  return code === '23505';
}

/** Map ReportReason (create DTO) to ReportType (admin entity) */
function reportReasonToType(reason: ReportReason): ReportType {
  const map: Partial<Record<ReportReason, ReportType>> = {
    [ReportReason.SPAM]: ReportType.SPAM,
    [ReportReason.HARASSMENT]: ReportType.HARASSMENT,
    [ReportReason.HATE_SPEECH]: ReportType.HATE_SPEECH,
    [ReportReason.INAPPROPRIATE]: ReportType.INAPPROPRIATE_CONTENT,
    [ReportReason.COPYRIGHT]: ReportType.COPYRIGHT,
    [ReportReason.OTHER]: ReportType.OTHER,
  };
  return map[reason] ?? ReportType.OTHER;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(AnonymousConfession)
    private readonly confessionRepository: Repository<AnonymousConfession>,
    private readonly auditLogService: AuditLogService,
  ) { }

  async createReport(
    confessionId: string,
    reporterId: number | null,
    dto: CreateReportDto,
    context?: { ipAddress?: string; userAgent?: string },
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
        throw new BadRequestException(DUPLICATE_REPORT_MESSAGE);
      }

      // 3️⃣ Save report atomically with pending status
      // DB-level unique index (idx_reports_dedupe_confession_reporter) catches concurrent duplicates
      const report = manager.getRepository(Report).create({
        confessionId,
        reporterId: reporterId ?? undefined,
        type: dto.type,
        reason: dto.reason ?? null,
        status: ReportStatus.PENDING,
      });

      let savedReport: Report;
      try {
        savedReport = await manager.getRepository(Report).save(report);
      } catch (err: unknown) {
        if (isDuplicateReportConstraintViolation(err)) {
          throw new BadRequestException(DUPLICATE_REPORT_MESSAGE);
        }
        throw err;
      }

      // 4️⃣ Log report creation (non-blocking - no await)
      if (reporterId) {
        this.auditLogService.logReport(
          savedReport.id,
          'confession',
          confessionId,
          reporterId.toString(),
          dto.reason || dto.type,
          {
            ipAddress: context?.ipAddress,
            userAgent: context?.userAgent,
            userId: reporterId.toString(),
          },
        ).catch(error => {
          this.logger.error(`Failed to log report creation: ${error.message}`);
        });
      }

      return savedReport;
    });
  }

  async resolveReport(
    reportId: string,
    admin: User,
    options?: {
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<Report> {
    // Use pessimistic locking to prevent race conditions
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (!this.isAdmin(admin)) {
      throw new ForbiddenException('Only admins can resolve reports');
    }

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException(`Report is already ${report.status}`);
    }

    const previousStatus = report.status;

    // Update report status
    report.status = ReportStatus.RESOLVED;
    report.resolvedBy = admin.id;
    report.resolvedAt = new Date();
    report.resolutionNotes = options?.reason || 'Report resolved'; // Consistent default

    const updatedReport = await this.reportRepository.save(report);

    // Log report resolution (truly non-blocking - no await)
    this.auditLogService.logReportResolved(
      reportId,
      admin.id.toString(),
      {
        previousStatus,
        reason: options?.reason,
        confessionId: report.confessionId,
        resolvedBy: admin.username,
      },
      {
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      },
    ).catch(error => {
      this.logger.error(`Failed to log report resolution: ${error.message}`);
    });

    this.logger.log(`Report ${reportId} resolved by admin ${admin.id}`);

    return updatedReport;
  }

  async dismissReport(
    reportId: string,
    admin: User,
    options?: {
      reason?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<Report> {
    // Use pessimistic locking to prevent race conditions
    const report = await this.reportRepository.findOne({
      where: { id: reportId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (!this.isAdmin(admin)) {
      throw new ForbiddenException('Only admins can dismiss reports');
    }

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException(`Report is already ${report.status}`);
    }

    const previousStatus = report.status;

    // Update report status
    report.status = ReportStatus.DISMISSED;
    report.resolvedBy = admin.id;
    report.resolvedAt = new Date();
    report.resolutionNotes = options?.reason ?? 'Report dismissed'; // Consistent default
    
    const updatedReport = await this.reportRepository.save(report);

    // Log report dismissal (truly non-blocking - no await)
    this.auditLogService.logReportDismissed(
      reportId,
      admin.id.toString(),
      {
        previousStatus,
        reason: options?.reason,
        confessionId: report.confessionId,
        dismissedBy: admin.username,
      },
      {
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      },
    ).catch(error => {
      this.logger.error(`Failed to log report dismissal: ${error.message}`);
    });

    this.logger.log(`Report ${reportId} dismissed by admin ${admin.id}`);

    return updatedReport;
  }

  /**
   * Single endpoint for resolving or dismissing a report by id (UUID).
   * Invalid action is rejected by DTO validation (400). Only admin can access (403 via AdminGuard).
   */
  async actionReport(
    id: string,
    admin: RequestUser,
    dto: ResolveReportDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException(`Report is already ${report.status}`);
    }

    const action = dto.action;
    const previousStatus = report.status;
    const status = action === 'resolved' ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;
    const defaultNote = action === 'resolved' ? 'Report resolved' : 'Report dismissed';

    report.status = status;
    report.resolvedBy = admin.id;
    report.resolvedAt = new Date();
    report.resolutionNotes = dto.note ?? defaultNote;

    const updatedReport = await this.reportRepository.save(report);

    if (action === 'resolved') {
      this.auditLogService.logReportResolved(
        id,
        admin.id.toString(),
        {
          previousStatus,
          reason: dto.note,
          confessionId: report.confessionId,
          resolvedBy: admin.username,
        },
        {
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
      ).catch(error => {
        this.logger.error(`Failed to log report resolution: ${error.message}`);
      });
    } else {
      this.auditLogService.logReportDismissed(
        id,
        admin.id.toString(),
        {
          previousStatus,
          reason: dto.note,
          confessionId: report.confessionId,
          dismissedBy: admin.username,
        },
        {
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
      ).catch(error => {
        this.logger.error(`Failed to log report dismissal: ${error.message}`);
      });
    }

    this.logger.log(`Report ${id} ${action} by admin ${admin.id}`);
    return updatedReport;
  }

  async getReportAuditLogs(reportId: string): Promise<any> {
    return this.auditLogService.findByEntity('report', reportId);
  }

  async findAll(options?: {
    status?: ReportStatus;
    page?: number;
    limit?: number;
  }): Promise<{ items: Report[]; total: number }> {
    const { status, page = 1, limit = 20 } = options || {};

    const query = this.reportRepository.createQueryBuilder('report')
      .leftJoinAndSelect('report.resolver', 'resolver')
      .orderBy('report.createdAt', 'DESC');

    if (status) {
      query.andWhere('report.status = :status', { status });
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }

  async findOne(id: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['resolver'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  private isAdmin(user: User): boolean {
    return user.role === UserRole.ADMIN;
  }

  async getReportsWithFilters(query: GetReportsQueryDto): Promise<PaginatedReportsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Build query with filters
    const queryBuilder = this.reportRepository.createQueryBuilder('report')
      .leftJoinAndSelect('report.confession', 'confession')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.resolver', 'resolver');

    // Apply status filter
    if (query.status) {
      queryBuilder.andWhere('report.status = :status', { status: query.status });
    }

    // Apply reason (type) filter
    if (query.reason) {
      queryBuilder.andWhere('report.type = :reason', { reason: query.reason });
    }

    // Apply date range filter
    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('report.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });
    } else if (query.startDate) {
      queryBuilder.andWhere('report.createdAt >= :startDate', { startDate: new Date(query.startDate) });
    } else if (query.endDate) {
      queryBuilder.andWhere('report.createdAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    // Apply sorting
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';
    queryBuilder.orderBy(`report.${sortBy}`, sortOrder);

    // Get total count for pagination metadata
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Execute query
    const reports = await queryBuilder.getMany();

    // Map to response DTO structure
    const mappedReports = reports.map(report => ({
      id: report.id,
      confessionId: report.confessionId,
      reporterId: report.reporterId,
      type: report.type,
      reason: report.reason,
      status: report.status,
      resolvedBy: report.resolvedBy,
      resolvedAt: report.resolvedAt,
      resolutionNotes: report.resolutionNotes,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    }));

    return {
      data: mappedReports,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

