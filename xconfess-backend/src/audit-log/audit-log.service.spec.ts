import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditActionType } from './audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<Repository<AuditLog>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getMany: jest.fn().mockResolvedValue([]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
    repository = module.get(getRepositoryToken(AuditLog));
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('logs generic audit records with request metadata', async () => {
    mockRepository.create.mockReturnValue({} as AuditLog);
    mockRepository.save.mockResolvedValue({} as AuditLog);

    await service.log({
      actionType: AuditActionType.FAILED_LOGIN,
      metadata: { identifier: 'user@example.com' },
      context: {
        userId: null,
        requestId: 'req-123',
        ipAddress: '127.0.0.1',
      },
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditActionType.FAILED_LOGIN,
        metadata: expect.objectContaining({
          identifier: 'user@example.com',
          requestId: 'req-123',
        }),
        ipAddress: '127.0.0.1',
      }),
    );
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('records rollout before/after diff snapshots', async () => {
    mockRepository.create.mockReturnValue({} as AuditLog);
    mockRepository.save.mockResolvedValue({} as AuditLog);

    await service.logTemplateRolloutDiff({
      templateKey: 'welcome',
      templateVersion: 'v2',
      changeType: 'canary_update',
      actorId: '2f4d4789-b665-4f8b-841b-94e7a41ca1c2',
      before: {
        activeVersion: 'v1',
        rollout: { canaryVersion: 'v2', canaryWeight: 5 },
      },
      after: {
        activeVersion: 'v1',
        rollout: { canaryVersion: 'v2', canaryWeight: 25 },
      },
      source: {
        reason: 'increase exposure',
        correlationId: 'corr-123',
        sourceEndpoint: '/admin/email/templates/rollout',
        sourceMethod: 'PATCH',
      },
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditActionType.TEMPLATE_ROLLOUT_DIFF_RECORDED,
        metadata: expect.objectContaining({
          templateKey: 'welcome',
          templateVersion: 'v2',
          actorType: 'admin',
          actorId: '2f4d4789-b665-4f8b-841b-94e7a41ca1c2',
          before: expect.any(Object),
          after: expect.any(Object),
          diff: expect.objectContaining({
            rollout: expect.objectContaining({
              before: expect.any(Object),
              after: expect.any(Object),
            }),
          }),
          correlationId: 'corr-123',
          sourceEndpoint: '/admin/email/templates/rollout',
        }),
      }),
    );
  });

  it('applies template filters in findAll', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'log-1' }], 1]);

    const result = await service.findAll({
      actorId: 'actor-123',
      templateKey: 'welcome',
      templateVersion: 'v2',
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2025-01-02T00:00:00.000Z'),
      limit: 10,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "audit_log.metadata->>'templateKey' = :templateKey",
      { templateKey: 'welcome' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "audit_log.metadata->>'templateVersion' = :templateVersion",
      { templateVersion: 'v2' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "audit_log.metadata->>'actorId' = :actorIdRaw",
      { actorId: null, actorIdRaw: 'actor-123' },
    );
  });

  it('records export lifecycle entries with stable metadata fields', async () => {
    mockRepository.create.mockReturnValue({} as AuditLog);
    mockRepository.save.mockResolvedValue({} as AuditLog);

    await service.logExportLifecycleEvent({
      action: 'downloaded',
      actorType: 'user',
      actorId: 'user-42',
      requestId: 'export-req-1',
      exportId: 'export-req-1',
      occurredAt: '2026-03-24T00:00:00.000Z',
      metadata: {
        source: 'signed_link',
      },
    });

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditActionType.EXPORT_DOWNLOADED,
        metadata: expect.objectContaining({
          entityType: 'data_export',
          entityId: 'export-req-1',
          exportId: 'export-req-1',
          requestId: 'export-req-1',
          actorType: 'user',
          actorId: 'user-42',
          actorUserId: 'user-42',
          lifecycleAction: 'downloaded',
          occurredAt: '2026-03-24T00:00:00.000Z',
          source: 'signed_link',
        }),
      }),
    );
  });

  it('tags admin moderation actions with admin actor metadata', async () => {
    mockRepository.create.mockReturnValue({} as AuditLog);
    mockRepository.save.mockResolvedValue({} as AuditLog);

    await service.logReportResolved(
      'report-1',
      'admin-7',
      { previousStatus: 'pending' },
      { requestId: 'req-admin-1' },
    );

    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.REPORT_RESOLVED,
        metadata: expect.objectContaining({
          reportId: 'report-1',
          actorType: 'admin',
          actorId: 'admin-7',
          actorUserId: 'admin-7',
        }),
      }),
    );
  });

  it('returns template rollout history with action-type scoping', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'log-2' }], 1]);

    const result = await service.getTemplateRolloutHistory({
      templateKey: 'welcome',
      templateVersion: 'v1',
      actorId: 'actor-2',
      limit: 20,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'audit_log.action IN (:...actionTypes)',
      expect.objectContaining({
        actionTypes: expect.arrayContaining([
          AuditActionType.TEMPLATE_STATE_TRANSITION,
          AuditActionType.TEMPLATE_ROLLOUT_DIFF_RECORDED,
        ]),
      }),
    );
  });

  it('returns export access trail scoped to export lifecycle actions', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[{ id: 'log-3' }], 1]);

    const result = await service.getExportAccessTrail({
      requestId: 'export-req-1',
      actorType: 'system',
      limit: 10,
      offset: 0,
    });

    expect(result.total).toBe(1);
    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'audit_log.action IN (:...actionTypes)',
      expect.objectContaining({
        actionTypes: expect.arrayContaining([
          AuditActionType.EXPORT_REQUEST_CREATED,
          AuditActionType.EXPORT_GENERATION_COMPLETED,
          AuditActionType.EXPORT_LINK_REFRESHED,
          AuditActionType.EXPORT_DOWNLOADED,
        ]),
      }),
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'audit_log.entity_type = :entityType',
      { entityType: 'data_export' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "audit_log.metadata->>'requestId' = :requestId",
      { requestId: 'export-req-1' },
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      "audit_log.metadata->>'actorType' = :actorType",
      { actorType: 'system' },
    );
  });

  it('does not throw when repository save fails', async () => {
    mockRepository.create.mockReturnValue({} as AuditLog);
    mockRepository.save.mockRejectedValue(new Error('db error'));

    await expect(
      service.logConfessionDelete('conf-1', 'user-1'),
    ).resolves.not.toThrow();
  });
});
