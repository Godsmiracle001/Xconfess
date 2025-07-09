import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnonymousConfession } from './entities/confession.entity';
import { ConfessionService } from './confession.service';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ConfessionService', () => {
  let service: ConfessionService;
  let repo: jest.Mocked<Repository<AnonymousConfession>>;
  let qb: Partial<SelectQueryBuilder<AnonymousConfession>> & any;

  beforeEach(async () => {
    qb = {
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      update: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfessionService,
        { provide: AnonymousConfessionRepository, useValue: repo },
        { provide: ConfessionViewCacheService, useValue: { checkAndMarkView: jest.fn() } },
      ],
    }).compile();

    service = module.get(ConfessionService);
  });

  it('remove() soft‑deletes existing', async () => {
    repo.findOne.mockResolvedValue({ id: '1', isDeleted: false });
    await expect(service.remove('1')).resolves.toEqual({ message: 'Confession soft‑deleted' });
    expect(repo.update).toHaveBeenCalledWith('1', { isDeleted: true });
  });

  it('remove() throws if not found', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.remove('x')).rejects.toThrow(NotFoundException);
  });

  it('getConfessions paginates and filters', async () => {
    qb.getCount.mockResolvedValue(20);
    qb.getMany.mockResolvedValue([{ id: 'a' }]);

    const res = await service.getConfessions({ page: 2, limit: 5, sort: SortOrder.NEWEST });
    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(res.meta.total).toBe(20);
  });

  it('getConfessions rejects invalid limit', async () => {
    await expect(service.getConfessions({ page: 1, limit: 0 } as any)).rejects.toThrow(BadRequestException);
  });
});
