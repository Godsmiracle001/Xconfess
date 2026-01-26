import { Test, TestingModule } from '@nestjs/testing';
import { ConfessionService } from './confession.service';
import { AnonymousConfessionRepository } from './repository/confession.repository';
import { SearchConfessionDto } from './dto/search-confession.dto';
import { AnonymousConfession } from './entities/confession.entity';

describe('ConfessionService - Search Functionality', () => {
  let service: ConfessionService;
  let repository: AnonymousConfessionRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfessionService,
        {
          provide: AnonymousConfessionRepository,
          useValue: {
            hybridSearch: jest.fn(),
            fullTextSearch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ConfessionService>(ConfessionService);
    repository = module.get<AnonymousConfessionRepository>(AnonymousConfessionRepository);
  });

  describe('search', () => {
    it('should return search results with metadata', async () => {
      const searchDto: SearchConfessionDto = { q: 'love', page: 1, limit: 10 };
      const mockResult = {
        confessions: [
          ({ id: '1', message: 'I love programming', created_at: new Date(), reactions: [] } as unknown as AnonymousConfession)
        ],
        total: 1
      };

      jest.spyOn(repository, 'hybridSearch').mockResolvedValue(mockResult);

      const result = await service.search(searchDto);

      expect(result.data).toEqual(mockResult.confessions);
      expect(result.meta.total).toBe(1);
      expect(result.meta.searchTerm).toBe('love');
    });

    it('should handle empty search terms', async () => {
      const searchDto: SearchConfessionDto = { q: '', page: 1, limit: 10 };

      await expect(service.search(searchDto)).rejects.toThrow('Search term cannot be empty');
    });

    it('should trim search terms', async () => {
      const searchDto: SearchConfessionDto = { q: '  love  ', page: 1, limit: 10 };
      const mockResult = { confessions: [], total: 0 };

      jest.spyOn(repository, 'hybridSearch').mockResolvedValue(mockResult);

      await service.search(searchDto);

      expect(repository.hybridSearch).toHaveBeenCalledWith('love', 1, 10);
    });
  });

  describe('fullTextSearch', () => {
    it('should perform full-text search', async () => {
      const searchDto: SearchConfessionDto = { q: 'relationship advice', page: 1, limit: 10 };
      const mockResult = {
        confessions: [
          ({ id: '1', message: 'Need relationship advice', created_at: new Date(), reactions: [] } as unknown as AnonymousConfession)
        ],
        total: 1
      };

      jest.spyOn(repository, 'fullTextSearch').mockResolvedValue(mockResult);

      const result = await service.fullTextSearch(searchDto);

      expect(result.data).toEqual(mockResult.confessions);
      expect(result.meta.searchType).toBe('fulltext');
    });
  });
});