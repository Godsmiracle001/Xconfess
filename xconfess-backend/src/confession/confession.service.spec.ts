import { Test, TestingModule } from '@nestjs/testing';
import { ConfessionService } from './confession.service';
import { AnonymousConfessionRepository } from '../confession/repository/confession.repository';
import { GetTrendingConfessionsDto } from './dto/get-trending-confessions.dto';
import { SortOrder } from './dto/get-confessions.dto';
import { Gender } from './dto/get-trending-confessions.dto';

describe('ConfessionService', () => {
  let service: ConfessionService;
  let confessionRepo: Partial<Record<keyof AnonymousConfessionRepository, jest.Mock>>;

  beforeEach(async () => {
    confessionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        getMany: jest.fn().mockResolvedValue([
          { id: 1, message: 'Trending 1', reactions: [] },
          { id: 2, message: 'Trending 2', reactions: [] },
        ]),
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfessionService,
        { provide: AnonymousConfessionRepository, useValue: confessionRepo },
      ],
    }).compile();

    service = module.get<ConfessionService>(ConfessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return trending confessions with meta', async () => {
    const dto: GetTrendingConfessionsDto = { page: 1, limit: 2, sort: SortOrder.TRENDING };
    const result = await service.getTrendingConfessions(dto);
    expect(result.data.length).toBe(2);
    expect(result.meta.total).toBe(2);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(2);
    expect(result.meta.totalPages).toBe(1);
  });

  it('should call andWhere with correct gender filter', async () => {
    const mockQueryBuilder = confessionRepo.createQueryBuilder!();
    const andWhereSpy = jest.spyOn(mockQueryBuilder, 'andWhere');
    const dto: GetTrendingConfessionsDto = { gender: Gender.MALE };
    await service.getTrendingConfessions(dto);
    expect(andWhereSpy).toHaveBeenCalledWith('confession.gender = :gender', { gender: Gender.MALE });
    expect(andWhereSpy).toHaveBeenCalledWith('confession.gender = :gender', { gender: 'male' });
  });

  it('should handle errors gracefully', async () => {
    confessionRepo.createQueryBuilder = jest.fn().mockImplementation(() => {
      throw new Error('DB error');
    });
    await expect(service.getTrendingConfessions({})).rejects.toThrow('Failed to fetch trending confessions');
  });
});
