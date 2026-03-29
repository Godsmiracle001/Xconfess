import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SearchDiscoveryService } from './search-discovery.service';
import { SavedSearch } from './entities/saved-search.entity';
import { SearchHistory } from './entities/search-history.entity';

describe('SearchDiscoveryService', () => {
  let service: SearchDiscoveryService;
  let savedSearchRepo: jest.Mocked<Repository<SavedSearch>>;
  let searchHistoryRepo: jest.Mocked<Repository<SearchHistory>>;

  beforeEach(async () => {
    savedSearchRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    } as any;

    searchHistoryRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchDiscoveryService,
        {
          provide: getRepositoryToken(SavedSearch),
          useValue: savedSearchRepo,
        },
        {
          provide: getRepositoryToken(SearchHistory),
          useValue: searchHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<SearchDiscoveryService>(SearchDiscoveryService);
  });

  describe('savePreset', () => {
    it('should save a new preset', async () => {
      savedSearchRepo.findOne.mockResolvedValue(null);
      savedSearchRepo.create.mockImplementation((x) => x as any);
      savedSearchRepo.save.mockImplementation(async (x) => x as any);

      const dto = { name: 'test', filters: { q: 'hello', gender: 'male' } };
      const result = await service.savePreset(1, dto);

      expect(result.name).toBe('test');
      expect(result.filters).toEqual({ gender: 'male' }); // q is normalized out
      expect(savedSearchRepo.create).toHaveBeenCalled();
    });

    it('should update existing preset', async () => {
      const existing = { id: 'uuid', name: 'test', userId: 1, filters: {} };
      savedSearchRepo.findOne.mockResolvedValue(existing as any);
      savedSearchRepo.save.mockImplementation(async (x) => x as any);

      const dto = { name: 'test', filters: { tags: ['tag1'] } };
      const result = await service.savePreset(1, dto);

      expect(result.filters).toEqual({ tags: ['tag1'] });
      expect(savedSearchRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('recordSearch', () => {
    it('should record a new search entry', async () => {
      searchHistoryRepo.findOne.mockResolvedValue(null);
      searchHistoryRepo.create.mockImplementation((x) => x as any);
      searchHistoryRepo.save.mockResolvedValue({} as any);
      searchHistoryRepo.count.mockResolvedValue(1);

      await service.recordSearch(1, { q: 'find me' });

      expect(searchHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'find me',
          filters: {},
        }),
      );
    });

    it('should update usedAt for existing search entry', async () => {
      const existing = { id: 'uuid', query: 'find me', queryHash: '...' };
      searchHistoryRepo.findOne.mockResolvedValue(existing as any);
      searchHistoryRepo.save.mockResolvedValue(existing as any);
      searchHistoryRepo.count.mockResolvedValue(1);

      await service.recordSearch(1, { q: 'find me' });

      expect(searchHistoryRepo.save).toHaveBeenCalledWith(existing);
      expect(searchHistoryRepo.create).not.toHaveBeenCalled();
    });

    it('should prune history if it exceeds 20 entries', async () => {
      searchHistoryRepo.findOne.mockResolvedValue(null);
      searchHistoryRepo.create.mockImplementation((x) => x as any);
      searchHistoryRepo.save.mockResolvedValue({} as any);
      searchHistoryRepo.count.mockResolvedValue(25);
      const oldest = [{ id: 'old1' }, { id: 'old2' }];
      searchHistoryRepo.find.mockResolvedValue(oldest as any);

      await service.recordSearch(1, { q: 'new search' });

      expect(searchHistoryRepo.remove).toHaveBeenCalledWith(oldest);
    });
  });
});
