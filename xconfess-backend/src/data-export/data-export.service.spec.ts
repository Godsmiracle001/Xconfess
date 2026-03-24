import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { DataExportService } from './data-export.service';
import { ExportRequest } from './entities/export-request.entity';
import { ExportChunk } from './entities/export-chunk.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

describe('DataExportService', () => {
  let service: DataExportService;

  const mockExportRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockChunkRepository = {
    findOne: jest.fn(),
  };

  const mockExportQueue = {
    add: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'app.appSecret') return 'test-secret';
      if (key === 'app.backendUrl') return 'https://backend.example.com';
      return fallback;
    }),
  };

  const mockAuditLogService = {
    logExportLifecycleEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportService,
        {
          provide: getRepositoryToken(ExportRequest),
          useValue: mockExportRepository,
        },
        {
          provide: getRepositoryToken(ExportChunk),
          useValue: mockChunkRepository,
        },
        {
          provide: getQueueToken('export-queue'),
          useValue: mockExportQueue,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<DataExportService>(DataExportService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('creates export request and emits request-created audit entry', async () => {
    const created = { id: 'req-1', userId: '42', status: 'PENDING' } as ExportRequest;

    mockExportRepository.findOne.mockResolvedValue(null);
    mockExportRepository.create.mockReturnValue(created);
    mockExportRepository.save.mockResolvedValue(created);
    mockExportQueue.add.mockResolvedValue({ id: 'job-1' });

    const result = await service.requestExport('42');

    expect(result).toEqual({ requestId: 'req-1', status: 'PENDING' });
    expect(mockExportQueue.add).toHaveBeenCalledWith('process-export', {
      userId: '42',
      requestId: 'req-1',
    });
    expect(mockAuditLogService.logExportLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'request_created',
        actorType: 'user',
        actorId: '42',
        requestId: 'req-1',
        exportId: 'req-1',
      }),
    );
  });

  it('rejects duplicate request within seven days', async () => {
    mockExportRepository.findOne.mockResolvedValue({
      id: 'existing-1',
      userId: '42',
      createdAt: new Date(),
    });

    await expect(service.requestExport('42')).rejects.toThrow(
      'Export allowed once every 7 days.',
    );
    expect(mockExportRepository.save).not.toHaveBeenCalled();
    expect(mockExportQueue.add).not.toHaveBeenCalled();
    expect(mockAuditLogService.logExportLifecycleEvent).not.toHaveBeenCalled();
  });

  it('emits link-refreshed audit record when signed URL is generated', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T10:00:00.000Z'));

    try {
      const url = service.generateSignedDownloadUrl('req-2', '77');

      const parsed = new URL(url);
      const expires = parsed.searchParams.get('expires');
      const signature = parsed.searchParams.get('signature');
      const expectedSignature = crypto
        .createHmac('sha256', 'test-secret')
        .update(`req-2:77:${expires}`)
        .digest('hex');

      expect(parsed.origin).toBe('https://backend.example.com');
      expect(parsed.pathname).toBe('/api/data-export/download/req-2');
      expect(parsed.searchParams.get('userId')).toBe('77');
      expect(signature).toBe(expectedSignature);
      expect(mockAuditLogService.logExportLifecycleEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'link_refreshed',
          actorType: 'user',
          actorId: '77',
          requestId: 'req-2',
          exportId: 'req-2',
        }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('logs download access when export file is retrieved', async () => {
    const exportFile = { fileData: Buffer.from('zip'), status: 'READY' };
    mockExportRepository.findOne.mockResolvedValue(exportFile);

    const result = await service.getExportFile('req-3', '11');

    expect(result).toEqual(exportFile);
    expect(mockAuditLogService.logExportLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'downloaded',
        actorType: 'user',
        actorId: '11',
        requestId: 'req-3',
        exportId: 'req-3',
      }),
    );
  });

  it('does not emit download audit log when file is missing', async () => {
    mockExportRepository.findOne.mockResolvedValue({ fileData: null, status: 'EXPIRED' });

    await service.getExportFile('req-4', '11');

    expect(mockAuditLogService.logExportLifecycleEvent).not.toHaveBeenCalled();
  });

  it('marks export as ready and emits system generation-completed audit entry', async () => {
    mockExportRepository.update.mockResolvedValue({ affected: 1 });

    await service.markExportGenerated('req-5', '12', Buffer.from('payload'), {
      jobId: 'job-22',
    });

    expect(mockExportRepository.update).toHaveBeenCalledWith('req-5', {
      fileData: Buffer.from('payload'),
      status: 'READY',
    });
    expect(mockAuditLogService.logExportLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'generation_completed',
        actorType: 'system',
        actorId: 'export-queue',
        requestId: 'req-5',
        exportId: 'req-5',
        metadata: expect.objectContaining({
          userId: '12',
          status: 'READY',
          jobId: 'job-22',
        }),
      }),
    );
  });

  // --- Chunked export tests ---
  describe('generateSignedDownloadUrl', () => {
    it('should generate a valid URL for non-chunked export', () => {
      const url = service.generateSignedDownloadUrl('req-123', 'user-456');
      expect(url).toContain('/api/data-export/download/req-123');
      expect(url).toContain('userId=user-456');
      expect(url).toContain('signature=');
      expect(url).not.toContain('chunk=');
    });

    it('should generate a valid URL for a specific chunk', () => {
      const url = service.generateSignedDownloadUrl('req-123', 'user-456', 5);
      expect(url).toContain('/api/data-export/download/req-123');
      expect(url).toContain('userId=user-456');
      expect(url).toContain('chunk=5');
      expect(url).toContain('signature=');
    });
  });

  describe('getExportChunk', () => {
    it('should throw NotFoundException if request does not exist', async () => {
      mockExportRepository.findOne.mockResolvedValue(null);
      await expect(service.getExportChunk('req-1', 'user-1', 0)).rejects.toThrow('Export request not found or unauthorized');
    });

    it('should return the chunk if it exists and user owns the request', async () => {
      mockExportRepository.findOne.mockResolvedValue({ id: 'req-1', userId: 'user-1' });
      const mockChunk = { id: 'chunk-1', chunkIndex: 0 };
      mockChunkRepository.findOne.mockResolvedValue(mockChunk);

      const result = await service.getExportChunk('req-1', 'user-1', 0);
      expect(result).toEqual(mockChunk);
      expect(mockExportRepository.findOne).toHaveBeenCalledWith({ where: { id: 'req-1', userId: 'user-1' } });
      expect(mockChunkRepository.findOne).toHaveBeenCalledWith({ where: { exportRequestId: 'req-1', chunkIndex: 0 } });
    });
  });
});
