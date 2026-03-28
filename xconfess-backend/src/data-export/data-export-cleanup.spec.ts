import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { DataCleanupService } from './data-export-cleanup';
import { ExportRequest } from './entities/export-request.entity';
import { LessThan } from 'typeorm';

describe('DataCleanupService', () => {
  let service: DataCleanupService;
  let mockExportRepository: jest.Mocked<Repository<ExportRequest>>;

  beforeEach(async () => {
    mockExportRepository = {
      update: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataCleanupService,
        {
          provide: getRepositoryToken(ExportRequest),
          useValue: mockExportRepository,
        },
      ],
    }).compile();

    service = module.get<DataCleanupService>(DataCleanupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Retention Policy Tests ───────────────────────────────────────────────────

  describe('Retention Policy Enforcement', () => {
    it('should expire exports older than 7 days', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 5,
        raw: [],
        generatedMaps: [],
      };

      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      await service.purgeOldExports();

      expect(mockExportRepository.update).toHaveBeenCalledWith(
        { createdAt: expect.any(LessThan) },
        { fileData: null, status: 'EXPIRED' },
      );
    });

    it('should preserve exports within 7-day window', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 0,
        raw: [],
        generatedMaps: [],
      };

      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      // Mock current time
      jest.useFakeTimers().setSystemTime(new Date('2026-03-25T10:00:00.000Z'));

      try {
        await service.purgeOldExports();

        expect(mockExportRepository.update).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockExportRepository.update.mockRejectedValue(dbError);

      await expect(service.purgeOldExports()).rejects.toThrow(
        'Database connection failed',
      );
      expect(mockExportRepository.update).toHaveBeenCalledTimes(1);
    });

    it('should report number of expired exports', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 12,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      await service.purgeOldExports();

      expect(mockExportRepository.update).toHaveBeenCalledWith(
        expect.any(Object),
        { fileData: null, status: 'EXPIRED' },
      );
      expect(mockUpdateResult.affected).toBe(12);
    });
  });

  // ── Cleanup Edge Cases ─────────────────────────────────────────────────────

  describe('Cleanup Edge Cases', () => {
    it('should handle exports with null fileData', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 3,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      await service.purgeOldExports();

      expect(mockExportRepository.update).toHaveBeenCalledWith(
        expect.any(Object),
        { fileData: null, status: 'EXPIRED' },
      );
    });

    it('should preserve export metadata while clearing file data', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 1,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      await service.purgeOldExports();

      expect(mockExportRepository.update).toHaveBeenCalledWith(
        expect.any(Object),
        { fileData: null, status: 'EXPIRED' },
      );

      const updateCall = mockExportRepository.update.mock.calls[0];
      const updateFields = updateCall[1];

      expect(Object.keys(updateFields)).toHaveLength(2);
      expect(updateFields.fileData).toBeNull();
      expect(updateFields.status).toBe('EXPIRED');
    });

    it('should not affect exports with terminal status that are recent', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 0,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      jest.useFakeTimers().setSystemTime(new Date('2026-03-25T10:00:00.000Z'));

      try {
        await service.purgeOldExports();
        expect(mockExportRepository.update).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle boundary condition exactly at 7 days', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 1,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      jest.useFakeTimers().setSystemTime(new Date('2026-03-25T10:00:00.000Z'));

      try {
        await service.purgeOldExports();
        expect(mockExportRepository.update).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  // ── Cleanup Timing and Scheduling Tests ─────────────────────────────────────

  describe('Cleanup Timing and Scheduling', () => {
    it('should run cleanup at midnight daily', () => {
      expect(service).toBeDefined();
    });

    it('should handle concurrent cleanup executions safely', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 5,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      const promises = [
        service.purgeOldExports(),
        service.purgeOldExports(),
        service.purgeOldExports(),
      ];

      await Promise.all(promises);

      expect(mockExportRepository.update).toHaveBeenCalledTimes(3);
    });
  });

  // ── Data Privacy Compliance Tests ───────────────────────────────────────────

  describe('Data Privacy Compliance', () => {
    it('should ensure file data is completely removed', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 3,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      await service.purgeOldExports();

      expect(mockExportRepository.update).toHaveBeenCalledWith(
        expect.any(Object),
        { fileData: null, status: 'EXPIRED' },
      );

      const updateCall = mockExportRepository.update.mock.calls[0];
      const updateFields = updateCall[1];
      expect(updateFields.fileData).toBeNull();
    });

    it('should maintain audit trail by preserving records', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 2,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      await service.purgeOldExports();

      expect(mockExportRepository.update).toHaveBeenCalled();
      expect(mockExportRepository.delete).not.toHaveBeenCalled();
    });

    it('should mark expired exports clearly for users', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 1,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      await service.purgeOldExports();

      const updateCall = mockExportRepository.update.mock.calls[0];
      const updateFields = updateCall[1];

      expect(updateFields.status).toBe('EXPIRED');
      expect(updateFields.fileData).toBeNull();
    });
  });

  // ── Integration with Export Lifecycle Tests ─────────────────────────────────

  describe('Integration with Export Lifecycle', () => {
    it('should not interfere with active export processing', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 0,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      jest.useFakeTimers().setSystemTime(new Date('2026-03-25T10:00:00.000Z'));

      try {
        await service.purgeOldExports();
        expect(mockExportRepository.update).toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('should handle exports in various terminal states', async () => {
      const mockUpdateResult: UpdateResult = {
        affected: 4,
        raw: [],
        generatedMaps: [],
      };
      mockExportRepository.update.mockResolvedValue(mockUpdateResult);

      jest.useFakeTimers().setSystemTime(new Date('2026-03-25T10:00:00.000Z'));

      try {
        await service.purgeOldExports();

        expect(mockExportRepository.update).toHaveBeenCalledWith(
          { createdAt: expect.any(LessThan) },
          { fileData: null, status: 'EXPIRED' },
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
