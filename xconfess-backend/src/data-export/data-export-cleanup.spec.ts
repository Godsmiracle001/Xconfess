import { LessThan, Repository, UpdateResult } from 'typeorm';
import { DataCleanupService } from './data-export-cleanup';
import { ExportRequest } from './entities/export-request.entity';
import { AuditActionType } from '../audit-log/audit-log.entity';

describe('DataCleanupService', () => {
  it('expires old exports and records a system-attributed audit entry', async () => {
    const repo = {
      update: jest.fn().mockResolvedValue({ affected: 3 } as UpdateResult),
    } as unknown as Repository<ExportRequest>;
    const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = new DataCleanupService(repo, auditLogService as any);

    await service.purgeOldExports();

    expect((repo.update as jest.Mock).mock.calls[0][0]).toEqual({
      createdAt: LessThan(expect.any(Date)),
    });
    expect((repo.update as jest.Mock).mock.calls[0][1]).toEqual({
      fileData: null,
      status: 'EXPIRED',
    });
    expect(auditLogService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.EXPORT_CLEANUP_EXPIRED,
        metadata: expect.objectContaining({
          entityType: 'data_export_cleanup',
          affected: 3,
        }),
        context: {
          actorType: 'system',
          actorId: 'data-export-cleanup',
        },
      }),
    );
  });
});
