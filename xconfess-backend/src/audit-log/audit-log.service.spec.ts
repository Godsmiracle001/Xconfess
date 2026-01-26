import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditActionType } from './audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: Repository<AuditLog>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logConfessionDelete', () => {
    it('should log confession deletion with correct metadata', async () => {
      const confessionId = 'confession-123';
      const userId = 'user-456';
      const context = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = {
        id: 'audit-log-1',
        userId,
        actionType: AuditActionType.CONFESSION_DELETE,
        metadata: {
          confessionId,
          deletedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logConfessionDelete(confessionId, userId, context);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        actionType: AuditActionType.CONFESSION_DELETE,
        metadata: {
          confessionId,
          deletedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });
  });

  describe('logCommentDelete', () => {
    it('should log comment deletion with correct metadata', async () => {
      const commentId = 'comment-123';
      const confessionId = 'confession-456';
      const userId = 'user-789';
      const context = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = {
        id: 'audit-log-2',
        userId,
        actionType: AuditActionType.COMMENT_DELETE,
        metadata: {
          commentId,
          confessionId,
          deletedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logCommentDelete(commentId, confessionId, userId, context);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        actionType: AuditActionType.COMMENT_DELETE,
        metadata: {
          commentId,
          confessionId,
          deletedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });
  });

  describe('logFailedLogin', () => {
    it('should log failed login attempt with correct metadata', async () => {
      const identifier = 'user@example.com';
      const reason = 'Invalid password';
      const context = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = {
        id: 'audit-log-3',
        userId: null,
        actionType: AuditActionType.FAILED_LOGIN,
        metadata: {
          identifier,
          reason,
          attemptedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logFailedLogin(identifier, reason, context);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: null,
        actionType: AuditActionType.FAILED_LOGIN,
        metadata: {
          identifier,
          reason,
          attemptedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should log failed login with userId if user exists', async () => {
      const identifier = 'user@example.com';
      const reason = 'Invalid password';
      const context = {
        userId: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = {
        id: 'audit-log-4',
        userId: context.userId,
        actionType: AuditActionType.FAILED_LOGIN,
        metadata: {
          identifier,
          reason,
          attemptedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logFailedLogin(identifier, reason, context);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: context.userId,
        actionType: AuditActionType.FAILED_LOGIN,
        metadata: {
          identifier,
          reason,
          attemptedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    });
  });

  describe('logReport', () => {
    it('should log report creation with correct metadata', async () => {
      const reportId = 'report-123';
      const targetType = 'confession';
      const targetId = 'confession-456';
      const reporterId = 'user-789';
      const reason = 'Inappropriate content';
      const context = {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockAuditLog = {
        id: 'audit-log-5',
        userId: reporterId,
        actionType: AuditActionType.REPORT_CREATED,
        metadata: {
          reportId,
          targetType,
          targetId,
          reason,
          reportedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };

      mockRepository.create.mockReturnValue(mockAuditLog);
      mockRepository.save.mockResolvedValue(mockAuditLog);

      await service.logReport(
        reportId,
        targetType as any,
        targetId,
        reporterId,
        reason,
        context,
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId: reporterId,
        actionType: AuditActionType.REPORT_CREATED,
        metadata: {
          reportId,
          targetType,
          targetId,
          reason,
          reportedAt: expect.any(String),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });
  });

  describe('error handling', () => {
    it('should not throw error when logging fails', async () => {
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.logConfessionDelete('conf-1', 'user-1'),
      ).resolves.not.toThrow();
    });

    it('should log error when save fails', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockRejectedValue(new Error('Database error'));

      await service.logConfessionDelete('conf-1', 'user-1');

      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          actionType: AuditActionType.CONFESSION_DELETE,
          metadata: {},
          timestamp: new Date(),
        },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockLogs, 1]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({
        userId: 'user-1',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('getStatistics', () => {
    it('should return audit log statistics', async () => {
      const mockStats = [
        { actionType: 'confession_delete', count: '5' },
        { actionType: 'failed_login', count: '3' },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockStats),
        getCount: jest.fn().mockResolvedValue(8),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalLogs: 8,
        actionTypeCounts: mockStats,
      });
    });
  });
});