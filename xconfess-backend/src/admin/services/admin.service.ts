import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Report, ReportStatus, ReportType } from '../entities/report.entity';
import { AnonymousConfession } from '../../confession/entities/confession.entity';
import { User, UserRole } from '../../user/entities/user.entity';
import { ModerationService } from './moderation.service';
import { AuditAction } from '../entities/audit-log.entity';
import { Request } from 'express';
import { decryptConfession } from '../../utils/confession-encryption';
import { UserAnonymousUser } from '../../user/entities/user-anonymous-link.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  private safeDecryptConfessionMessage(message: string): string {
    try {
      return decryptConfession(message, this.aesKey);
    } catch (e) {
      this.logger.warn(
        `Failed to decrypt confession message (returning raw). Reason: ${e instanceof Error ? e.message : 'unknown'
        }`,
      );
      return message;
    }
  }

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(AnonymousConfession)
    private readonly confessionRepository: Repository<AnonymousConfession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAnonymousUser)
    private readonly userAnonRepository: Repository<UserAnonymousUser>,
    private readonly moderationService: ModerationService,
    private readonly configService: ConfigService,
  ) { }

  private get aesKey(): string {
    return this.configService.get<string>('app.confessionAesKey', '');
  }

  // Reports
  async getReports(
    status?: ReportStatus,
    type?: ReportType,
    startDate?: Date,
    endDate?: Date,
    limit = 50,
    offset = 0,
  ) {
    const query = this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.confession', 'confession')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.resolver', 'resolver')
      .orderBy('report.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (status) {
      query.andWhere('report.status = :status', { status });
    }

    if (type) {
      query.andWhere('report.type = :type', { type });
    }

    if (startDate) {
      query.andWhere('report.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('report.createdAt <= :endDate', { endDate });
    }

    const [reports, total] = await query.getManyAndCount();
    const mapped = reports.map((r) => {
      if (r.confession?.message) {
        r.confession.message = this.safeDecryptConfessionMessage(r.confession.message);
      }
      return r;
    });
    return [mapped, total] as const;
  }

  async getReportById(id: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['confession', 'reporter', 'resolver'],
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.confession?.message) {
      report.confession.message = this.safeDecryptConfessionMessage(report.confession.message);
    }
    return report;
  }

  async resolveReport(
    id: string,
    adminId: number,
    resolutionNotes: string | null,
    request?: Request,
  ): Promise<Report> {
    const report = await this.getReportById(id);

    if (report.status === ReportStatus.RESOLVED) {
      throw new BadRequestException('Report already resolved');
    }

    report.status = ReportStatus.RESOLVED;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    report.resolutionNotes = resolutionNotes;

    const saved = await this.reportRepository.save(report);

    await this.moderationService.logAction(
      adminId,
      AuditAction.REPORT_RESOLVED,
      'report',
      id,
      { reportType: report.type, confessionId: report.confessionId },
      resolutionNotes,
      request,
    );

    return saved;
  }

  async dismissReport(
    id: string,
    adminId: number,
    notes: string | null,
    request?: Request,
  ): Promise<Report> {
    const report = await this.getReportById(id);

    if (report.status === ReportStatus.DISMISSED) {
      throw new BadRequestException('Report already dismissed');
    }

    report.status = ReportStatus.DISMISSED;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();
    report.resolutionNotes = notes;

    const saved = await this.reportRepository.save(report);

    await this.moderationService.logAction(
      adminId,
      AuditAction.REPORT_DISMISSED,
      'report',
      id,
      { reportType: report.type },
      notes,
      request,
    );

    return saved;
  }

  async bulkResolveReports(
    ids: string[],
    adminId: number,
    notes: string | null,
    request?: Request,
  ): Promise<number> {
    const reports = await this.reportRepository.find({
      where: { id: In(ids), status: ReportStatus.PENDING },
    });

    if (reports.length === 0) {
      return 0;
    }

    const now = new Date();
    reports.forEach((report) => {
      report.status = ReportStatus.RESOLVED;
      report.resolvedBy = adminId;
      report.resolvedAt = now;
      report.resolutionNotes = notes;
    });

    await this.reportRepository.save(reports);

    await this.moderationService.logAction(
      adminId,
      AuditAction.BULK_ACTION,
      'report',
      null,
      { action: 'bulk_resolve', count: reports.length, reportIds: ids },
      notes,
      request,
    );

    return reports.length;
  }

  // Confessions
  async deleteConfession(
    id: string,
    adminId: number,
    reason: string | null,
    request?: Request,
  ): Promise<void> {
    const confession = await this.confessionRepository.findOne({
      where: { id },
    });

    if (!confession) {
      throw new NotFoundException('Confession not found');
    }

    confession.isDeleted = true;
    await this.confessionRepository.save(confession);

    await this.moderationService.logAction(
      adminId,
      AuditAction.CONFESSION_DELETED,
      'confession',
      id,
      { reason },
      reason,
      request,
    );
  }

  async hideConfession(
    id: string,
    adminId: number,
    reason: string | null,
    request?: Request,
  ): Promise<AnonymousConfession> {
    const confession = await this.confessionRepository.findOne({
      where: { id },
    });

    if (!confession) {
      throw new NotFoundException('Confession not found');
    }

    confession.isHidden = true;
    const saved = await this.confessionRepository.save(confession);

    await this.moderationService.logAction(
      adminId,
      AuditAction.CONFESSION_HIDDEN,
      'confession',
      id,
      { reason },
      reason,
      request,
    );

    return saved;
  }

  async unhideConfession(
    id: string,
    adminId: number,
    request?: Request,
  ): Promise<AnonymousConfession> {
    const confession = await this.confessionRepository.findOne({
      where: { id },
    });

    if (!confession) {
      throw new NotFoundException('Confession not found');
    }

    confession.isHidden = false;
    const saved = await this.confessionRepository.save(confession);

    await this.moderationService.logAction(
      adminId,
      AuditAction.CONFESSION_UNHIDDEN,
      'confession',
      id,
      null,
      null,
      request,
    );

    return saved;
  }

  // Users
  async banUser(
    userId: number,
    adminId: number,
    reason: string | null,
    request?: Request,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.is_active) {
      throw new BadRequestException('User is already banned');
    }

    user.is_active = false;
    const saved = await this.userRepository.save(user);

    await this.moderationService.logAction(
      adminId,
      AuditAction.USER_BANNED,
      'user',
      userId.toString(),
      { reason },
      reason,
      request,
    );

    return saved;
  }

  async unbanUser(
    userId: number,
    adminId: number,
    request?: Request,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.is_active) {
      throw new BadRequestException('User is not banned');
    }

    user.is_active = true;
    const saved = await this.userRepository.save(user);

    await this.moderationService.logAction(
      adminId,
      AuditAction.USER_UNBANNED,
      'user',
      userId.toString(),
      null,
      null,
      request,
    );

    return saved;
  }

  async searchUsers(
    query: string,
    limit = 50,
    offset = 0,
  ): Promise<[User[], number]> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.username ILIKE :query', { query: `%${query}%` })
      .orWhere('user.emailHash = :hash', {
        hash: query, // This won't work well, but keeping for structure
      })
      .orderBy('user.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    return qb.getManyAndCount();
  }

  async getUserHistory(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get reports created by this user
    const reports = await this.reportRepository.find({
      where: { reporterId: userId },
      relations: ['confession'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    for (const r of reports) {
      if (r.confession?.message) {
        r.confession.message = this.safeDecryptConfessionMessage(r.confession.message);
      }
    }

    // Confessions are linked to AnonymousUser. We map User -> AnonymousUser sessions.
    const links = await this.userAnonRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const anonIds = Array.from(new Set(links.map((l) => l.anonymousUserId)));
    const confessions = anonIds.length
      ? await this.confessionRepository
        .createQueryBuilder('confession')
        .leftJoin('confession.anonymousUser', 'anon')
        .where('anon.id IN (:...anonIds)', { anonIds })
        .orderBy('confession.created_at', 'DESC')
        .take(200)
        .getMany()
      : [];

    // Decrypt confession messages for admin visibility
    for (const conf of confessions) {
      if (conf.message) {
        conf.message = this.safeDecryptConfessionMessage(conf.message);
      }
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.role === UserRole.ADMIN,
        is_active: user.is_active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      confessions,
      reports,
      note: anonIds.length
        ? 'Confessions derived from user session mappings (user_anonymous_users)'
        : 'No anonymous session mappings found for this user yet',
    };
  }

  // Analytics
  async getAnalytics(startDate?: Date, endDate?: Date) {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    // Total counts
    const totalUsers = await this.userRepository.count();
    const totalConfessions = await this.confessionRepository.count();
    const totalReports = await this.reportRepository.count();

    // Active users (last 30 days)
    const activeUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.updatedAt >= :start', { start })
      .getCount();

    // Reports by status
    const reportsByStatus = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('report.createdAt >= :start', { start })
      .andWhere('report.createdAt <= :end', { end })
      .groupBy('report.status')
      .getRawMany();

    // Reports by type
    const reportsByType = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('report.createdAt >= :start', { start })
      .andWhere('report.createdAt <= :end', { end })
      .groupBy('report.type')
      .getRawMany();

    // Confessions over time (daily)
    const confessionsOverTime = await this.confessionRepository
      .createQueryBuilder('confession')
      .select("DATE_TRUNC('day', confession.created_at)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('confession.created_at >= :start', { start })
      .andWhere('confession.created_at <= :end', { end })
      .groupBy("DATE_TRUNC('day', confession.created_at)")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Banned users
    const bannedUsers = await this.userRepository.count({
      where: { is_active: false },
    });

    // Hidden confessions
    const hiddenConfessions = await this.confessionRepository.count({
      where: { isHidden: true },
    });

    // Deleted confessions
    const deletedConfessions = await this.confessionRepository.count({
      where: { isDeleted: true },
    });

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalConfessions,
        totalReports,
        bannedUsers,
        hiddenConfessions,
        deletedConfessions,
      },
      reports: {
        byStatus: reportsByStatus,
        byType: reportsByType,
      },
      trends: {
        confessionsOverTime,
      },
      period: {
        start,
        end,
      },
    };
  }
}
