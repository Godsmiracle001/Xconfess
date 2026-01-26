import { Test, TestingModule } from '@nestjs/testing';
import { ConfessionService } from './confession.service';
import { AnonymousConfessionRepository } from './repository/confession.repository';
import { ConfessionViewCacheService } from './confession-view-cache.service';


describe('ConfessionService - View Count Logic', () => {
  let service: ConfessionService;
  let repo: AnonymousConfessionRepository;
  let cache: ConfessionViewCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfessionService,
        {
          provide: AnonymousConfessionRepository,
          useValue: {
            findOne: jest.fn(),
            increment: jest.fn(),
          },
        },
        {
          provide: ConfessionViewCacheService,
          useValue: {
            checkAndMarkView: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConfessionService>(ConfessionService);
    repo = module.get<AnonymousConfessionRepository>(AnonymousConfessionRepository);
    cache = module.get<ConfessionViewCacheService>(ConfessionViewCacheService);
  });

  it('should increment view count if not viewed recently', async () => {
    const base = { id: '1', message: 'iv:deadbeef', view_count: 0 };
    (repo.findOne as jest.Mock).mockResolvedValue(base);
    (cache.checkAndMarkView as jest.Mock).mockResolvedValue(true);
    (repo.increment as jest.Mock).mockResolvedValue(undefined);
    (repo.findOne as jest.Mock).mockResolvedValueOnce(base).mockResolvedValueOnce({ ...base, view_count: 1 });
    const req = { user: { id: 'user1' }, ip: '127.0.0.1' };
    const confession = await service.getConfessionByIdWithViewCount('1', req as any);
    expect(confession).not.toBeNull();
    expect(confession!.view_count).toBe(1);
  });

  it('should not increment view count if viewed recently', async () => {
    const base = { id: '1', message: 'iv:deadbeef', view_count: 5 };
    (repo.findOne as jest.Mock).mockResolvedValue(base);
    (cache.checkAndMarkView as jest.Mock).mockResolvedValue(false);
    const req = { user: { id: 'user1' }, ip: '127.0.0.1' };
    const confession = await service.getConfessionByIdWithViewCount('1', req as any);
    expect(confession).not.toBeNull();
    expect(confession!.view_count).toBe(5);
    expect(cache.checkAndMarkView).toHaveBeenCalledWith('1', 'user1');
    expect(repo.increment).not.toHaveBeenCalled();
  });

  it('should handle anonymous users using IP address', async () => {
    const base = { id: '1', message: 'iv:deadbeef', view_count: 0 };
    (repo.findOne as jest.Mock).mockResolvedValueOnce(base).mockResolvedValueOnce({ ...base, view_count: 1 });
    (cache.checkAndMarkView as jest.Mock).mockResolvedValue(true);
    (repo.increment as jest.Mock).mockResolvedValue(undefined);

    const req = { ip: '192.168.1.1' }; // No user property
    const result = await service.getConfessionByIdWithViewCount('1', req as any);

    expect(result).not.toBeNull();
    expect(result!.view_count).toBe(1);
    expect(cache.checkAndMarkView).toHaveBeenCalledWith('1', expect.any(String));
  });

 it('should propagate cache service failures', async () => {
   const base = { id: '1', message: 'iv:deadbeef', view_count: 0 };
   (repo.findOne as jest.Mock).mockResolvedValue(base);
   (cache.checkAndMarkView as jest.Mock).mockRejectedValue(new Error('Redis error'));

   const req = { user: { id: 'user1' }, ip: '127.0.0.1' };
   await expect(service.getConfessionByIdWithViewCount('1', req as any)).rejects.toThrow();
 });

  
});
