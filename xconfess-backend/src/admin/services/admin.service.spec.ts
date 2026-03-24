import { AdminService } from './admin.service';
import { ModerationService } from './moderation.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportStatus } from '../entities/report.entity';
import { AuditAction } from '../entities/audit-log.entity';

function createChainableQB(overrides: Partial<any> = {}) {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    ...overrides,
  };
  return qb;
}

describe('AdminService', () => {
  const moderationService: Partial<ModerationService> = {
    logAction: jest.fn(),
  };

  const reportRepository: any = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };

  const confessionRepository: any = {
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const userRepository: any = {
    findOne: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const userAnonRepository: any = {
    find: jest.fn(),
  };

  let service: AdminService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AdminService(
      reportRepository,
      confessionRepository,
      userRepository,
      userAnonRepository,
      moderationService as ModerationService,
    );
  });

  it('getReports returns list + total and does not throw on decrypt failure', async () => {
    const qb = createChainableQB({
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 'r1',
            confession: { message: 'not-encrypted' },
          },
        ],
        1,
      ]),
    });
    reportRepository.createQueryBuilder.mockReturnValue(qb);

    const [rows, total] = await service.getReports(
      undefined,
      undefined,
      undefined,
      undefined,
      50,
      0,
    );
    expect(total).toBe(1);
    expect(rows[0].id).toBe('r1');
    expect(qb.getManyAndCount).toHaveBeenCalled();
  });

  it('getReportById throws if missing', async () => {
    reportRepository.findOne.mockResolvedValue(null);
    await expect(service.getReportById('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('resolveReport updates status and logs audit action', async () => {
    const report: any = {
      id: 'r1',
      status: ReportStatus.PENDING,
      type: 'spam',
      confessionId: 'c1',
      confession: { message: 'not-encrypted' },
    };
    reportRepository.findOne.mockResolvedValue(report);
    reportRepository.save.mockImplementation(async (r: any) => r);

    const res = await service.resolveReport('r1', 1, 'ok', {} as any);
    expect(res.status).toBe(ReportStatus.RESOLVED);
    expect(moderationService.logAction).toHaveBeenCalledWith(
      1,
      AuditAction.REPORT_RESOLVED,
      'report',
      'r1',
      expect.any(Object),
      'ok',
      expect.anything(),
    );
  });

  it('resolveReport throws if already resolved', async () => {
    reportRepository.findOne.mockResolvedValue({
      id: 'r1',
      status: ReportStatus.RESOLVED,
    });
    await expect(
      service.resolveReport('r1', 1, null, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('dismissReport updates status and logs audit action', async () => {
    const report: any = {
      id: 'r1',
      status: ReportStatus.PENDING,
      type: 'spam',
      confessionId: 'c1',
    };
    reportRepository.findOne.mockResolvedValue(report);
    reportRepository.save.mockImplementation(async (r: any) => r);

    const res = await service.dismissReport('r1', 2, 'no violation', {} as any);
    expect(res.status).toBe(ReportStatus.DISMISSED);
    expect(moderationService.logAction).toHaveBeenCalledWith(
      2,
      AuditAction.REPORT_DISMISSED,
      'report',
      'r1',
      expect.any(Object),
      'no violation',
      expect.anything(),
    );
  });

  it('bulkResolveReports returns 0 when none pending', async () => {
    reportRepository.find.mockResolvedValue([]);
    const count = await service.bulkResolveReports(['a'], 1, null, undefined);
    expect(count).toBe(0);
  });

  it('bulkResolveReports resolves pending reports and logs bulk action', async () => {
    reportRepository.find.mockResolvedValue([
      { id: 'a', status: ReportStatus.PENDING },
    ]);
    reportRepository.save.mockResolvedValue(undefined);
    const count = await service.bulkResolveReports(
      ['a'],
      1,
      'notes',
      {} as any,
    );
    expect(count).toBe(1);
    expect(moderationService.logAction).toHaveBeenCalledWith(
      1,
      AuditAction.BULK_ACTION,
      'report',
      null,
      expect.any(Object),
      'notes',
      expect.anything(),
    );
  });

  it('deleteConfession throws if confession missing', async () => {
    confessionRepository.findOne.mockResolvedValue(null);
    await expect(
      service.deleteConfession('c1', 1, null, undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('hide/unhide confession toggles isHidden and logs', async () => {
    const confession: any = { id: 'c1', isHidden: false };
    confessionRepository.findOne.mockResolvedValue(confession);
    confessionRepository.save.mockImplementation(async (c: any) => c);

    const hidden = await service.hideConfession('c1', 1, 'reason', {} as any);
    expect(hidden.isHidden).toBe(true);

    const confession2: any = { id: 'c1', isHidden: true };
    confessionRepository.findOne.mockResolvedValue(confession2);
    const unhidden = await service.unhideConfession('c1', 1, {} as any);
    expect(unhidden.isHidden).toBe(false);
  });

  it('ban/unban user toggles is_active and logs', async () => {
    const user: any = { id: 10, is_active: true };
    userRepository.findOne.mockResolvedValue(user);
    userRepository.save.mockImplementation(async (u: any) => u);
    const banned = await service.banUser(10, 1, 'reason', {} as any);
    expect(banned.is_active).toBe(false);

    const user2: any = { id: 10, is_active: false };
    userRepository.findOne.mockResolvedValue(user2);
    const unbanned = await service.unbanUser(10, 1, {} as any);
    expect(unbanned.is_active).toBe(true);
  });

  it('getUserHistory returns user + confessions + reports', async () => {
    userRepository.findOne.mockResolvedValue({
      id: 1,
      username: 'u',
      isAdmin: false,
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    reportRepository.find.mockResolvedValue([]);
    userAnonRepository.find.mockResolvedValue([{ anonymousUserId: 'anon1' }]);
    const qb = createChainableQB({
      getMany: jest.fn().mockResolvedValue([{ id: 'c1', message: 'x' }]),
    });
    confessionRepository.createQueryBuilder.mockReturnValue(qb);

    const res = await service.getUserHistory(1);
    expect(res.user.id).toBe(1);
    expect(Array.isArray(res.confessions)).toBe(true);
  });

  it('getAnalytics returns expected shape', async () => {
    userRepository.count.mockResolvedValueOnce(10).mockResolvedValueOnce(1);
    confessionRepository.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    reportRepository.count.mockResolvedValue(3);

    const qbActive = createChainableQB({
      getCount: jest.fn().mockResolvedValue(4),
    });
    userRepository.createQueryBuilder.mockReturnValue(qbActive);

    const qbStatus = createChainableQB({
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ status: 'pending', count: '1' }]),
    });
    const qbType = createChainableQB({
      getRawMany: jest.fn().mockResolvedValue([{ type: 'spam', count: '1' }]),
    });
    reportRepository.createQueryBuilder
      .mockReturnValueOnce(qbStatus)
      .mockReturnValueOnce(qbType);

    const qbTrend = createChainableQB({
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ date: new Date().toISOString(), count: '2' }]),
    });
    confessionRepository.createQueryBuilder.mockReturnValue(qbTrend);

    const res = await service.getAnalytics(undefined, undefined);
    expect(res.overview.totalUsers).toBeDefined();
    expect(res.reports.byStatus).toBeDefined();
    expect(res.trends.confessionsOverTime).toBeDefined();
  });
});
