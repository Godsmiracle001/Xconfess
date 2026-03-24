import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Reaction } from '../reaction/entities/reaction.entity';
import { User } from '../user/entities/user.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { CacheService } from '../cache/cache.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const repoMock = () => ({
  createQueryBuilder: jest.fn(),
  count: jest.fn(),
  findOne: jest.fn(),
});

const makeCacheServiceMock = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  invalidateSegment: jest.fn().mockResolvedValue(1),
});

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let cacheService: ReturnType<typeof makeCacheServiceMock>;

  beforeEach(async () => {
    cacheService = makeCacheServiceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(AnonymousConfession),
          useFactory: repoMock,
        },
        { provide: getRepositoryToken(Reaction), useFactory: repoMock },
        { provide: getRepositoryToken(User), useFactory: repoMock },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── invalidateTrendingCache ──────────────────────────────────────────────

  describe('invalidateTrendingCache()', () => {
    it('calls invalidateSegment with the trending prefix', async () => {
      await service.invalidateTrendingCache('test');
      expect(cacheService.invalidateSegment).toHaveBeenCalledWith(
        'analytics:trending',
        'test',
      );
    });

    it('uses "mutation" as the default reason', async () => {
      await service.invalidateTrendingCache();
      expect(cacheService.invalidateSegment).toHaveBeenCalledWith(
        'analytics:trending',
        'mutation',
      );
    });
  });

  // ── invalidateReactionDistributionCache ─────────────────────────────────

  describe('invalidateReactionDistributionCache()', () => {
    it('calls invalidateSegment with the reactions prefix', async () => {
      await service.invalidateReactionDistributionCache('test');
      expect(cacheService.invalidateSegment).toHaveBeenCalledWith(
        'analytics:reactions',
        'test',
      );
    });
  });

  // ── invalidateGrowthCache ────────────────────────────────────────────────

  describe('invalidateGrowthCache()', () => {
    it('calls invalidateSegment with the growth prefix', async () => {
      await service.invalidateGrowthCache('test');
      expect(cacheService.invalidateSegment).toHaveBeenCalledWith(
        'analytics:growth',
        'test',
      );
    });
  });

  // ── invalidateUserActivityCache ──────────────────────────────────────────

  describe('invalidateUserActivityCache()', () => {
    it('calls invalidateSegment with the users prefix', async () => {
      await service.invalidateUserActivityCache('test');
      expect(cacheService.invalidateSegment).toHaveBeenCalledWith(
        'analytics:users',
        'test',
      );
    });
  });

  // ── invalidateStatsCache ─────────────────────────────────────────────────

  describe('invalidateStatsCache()', () => {
    it('deletes only the stats key', async () => {
      await service.invalidateStatsCache('test');
      expect(cacheService.del).toHaveBeenCalledWith('analytics:stats');
      expect(cacheService.invalidateSegment).not.toHaveBeenCalled();
    });
  });

  // ── invalidateCache (full flush) ─────────────────────────────────────────

  describe('invalidateCache()', () => {
    it('calls all targeted segment invalidation methods', async () => {
      const spyTrending = jest
        .spyOn(service, 'invalidateTrendingCache')
        .mockResolvedValue();
      const spyReactions = jest
        .spyOn(service, 'invalidateReactionDistributionCache')
        .mockResolvedValue();
      const spyGrowth = jest
        .spyOn(service, 'invalidateGrowthCache')
        .mockResolvedValue();
      const spyUsers = jest
        .spyOn(service, 'invalidateUserActivityCache')
        .mockResolvedValue();
      const spyStats = jest
        .spyOn(service, 'invalidateStatsCache')
        .mockResolvedValue();

      await service.invalidateCache();

      expect(spyTrending).toHaveBeenCalledWith('full-flush');
      expect(spyReactions).toHaveBeenCalledWith('full-flush');
      expect(spyGrowth).toHaveBeenCalledWith('full-flush');
      expect(spyUsers).toHaveBeenCalledWith('full-flush');
      expect(spyStats).toHaveBeenCalledWith('full-flush');
    });

    it('does NOT call invalidateSegment for keys outside the analytics namespace', async () => {
      jest.spyOn(service, 'invalidateTrendingCache').mockResolvedValue();
      jest
        .spyOn(service, 'invalidateReactionDistributionCache')
        .mockResolvedValue();
      jest.spyOn(service, 'invalidateGrowthCache').mockResolvedValue();
      jest.spyOn(service, 'invalidateUserActivityCache').mockResolvedValue();
      jest.spyOn(service, 'invalidateStatsCache').mockResolvedValue();

      await service.invalidateCache();

      // invalidateSegment should never be called with prefixes outside analytics:*
      const calls = cacheService.invalidateSegment.mock.calls;
      calls.forEach(([prefix]) => {
        expect(prefix).toMatch(/^analytics:/);
      });
    });
  });
});
