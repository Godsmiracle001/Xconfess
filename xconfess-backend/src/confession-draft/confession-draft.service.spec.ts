import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfessionDraftService } from './confession-draft.service';
import { ConfessionDraft, ConfessionDraftStatus } from './entities/confession-draft.entity';
import { ConfessionService } from '../confession/confession.service';

describe('ConfessionDraftService', () => {
  let service: ConfessionDraftService;
  let repo: jest.Mocked<Repository<ConfessionDraft>>;

  beforeEach(async () => {
    process.env.CONFESSION_AES_KEY = '12345678901234567890123456789012';

    repo = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfessionDraftService,
        { provide: getRepositoryToken(ConfessionDraft), useValue: repo },
        { provide: ConfessionService, useValue: { create: jest.fn() } },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb: any) => cb({ getRepository: () => repo })),
          },
        },
      ],
    }).compile();

    service = module.get(ConfessionDraftService);
  });

  it('createDraft encrypts content and returns decrypted content', async () => {
    repo.count.mockResolvedValue(0);
    repo.create.mockImplementation((x: any) => x);
    repo.save.mockImplementation(async (x: any) => ({
      ...x,
      id: 'draft1',
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledFor: null,
      timezone: null,
      status: ConfessionDraftStatus.DRAFT,
      publishAttempts: 0,
      lastPublishError: null,
    }));

    const res = await service.createDraft(1, 'hello');
    expect(res.content).toBe('hello');
  });
});
