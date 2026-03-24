import { ModerationService } from './moderation.service';
import { AuditAction } from '../entities/audit-log.entity';

describe('ModerationService', () => {
  it('logAction saves an audit log with ip/userAgent', async () => {
    const repo: any = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ ...x, id: 'log1' })),
      createQueryBuilder: jest.fn(),
    };

    const svc = new ModerationService(repo);
    const req: any = {
      ip: '1.2.3.4',
      headers: { 'user-agent': 'jest' },
      socket: { remoteAddress: '9.9.9.9' },
    };

    const saved = await svc.logAction(
      1,
      AuditAction.REPORT_RESOLVED,
      'report',
      'r1',
      { k: 'v' },
      'note',
      req,
    );

    expect(repo.create).toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalled();
    expect(saved.id).toBe('log1');
    expect(saved.ipAddress).toBe('1.2.3.4');
    expect(saved.userAgent).toBe('jest');
  });

  it('getAuditLogs builds query with filters', async () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: '1' }], 1]),
    };
    const repo: any = {
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    const svc = new ModerationService(repo);
    const [logs, total] = await svc.getAuditLogs(
      1,
      AuditAction.REPORT_RESOLVED,
      'report',
      'r1',
      10,
      0,
    );
    expect(total).toBe(1);
    expect(logs[0].id).toBe('1');
    expect(qb.andWhere).toHaveBeenCalled();
  });
});
