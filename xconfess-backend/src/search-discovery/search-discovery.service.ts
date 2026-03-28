import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SavedSearch } from './entities/saved-search.entity';
import { SearchHistory } from './entities/search-history.entity';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { SearchConfessionDto } from '../confession/dto/search-confession.dto';

@Injectable()
export class SearchDiscoveryService {
  constructor(
    @InjectRepository(SavedSearch)
    private savedSearchRepo: Repository<SavedSearch>,
    @InjectRepository(SearchHistory)
    private searchHistoryRepo: Repository<SearchHistory>,
  ) {}

  private normalizeFilters(dto: SearchConfessionDto): any {
    const { q, page, limit, ...filters } = dto;
    // Remove undefined/null values
    return Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v != null),
    );
  }

  private generateQueryHash(q: string, filters: any): string {
    const data = JSON.stringify(
      { q, ...filters },
      Object.keys({ q, ...filters }).sort(),
    );
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async savePreset(userId: number, dto: CreateSavedSearchDto) {
    const filters = this.normalizeFilters(dto.filters as SearchConfessionDto);
    let preset = await this.savedSearchRepo.findOne({
      where: { userId, name: dto.name },
    });

    if (preset) {
      preset.filters = filters;
      return this.savedSearchRepo.save(preset);
    }

    preset = this.savedSearchRepo.create({
      userId,
      name: dto.name,
      filters,
    });
    return this.savedSearchRepo.save(preset);
  }

  async listPresets(userId: number) {
    return this.savedSearchRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async deletePreset(userId: number, id: string) {
    return this.savedSearchRepo.delete({ id, userId });
  }

  async recordSearch(userId: number, dto: SearchConfessionDto) {
    const q = dto.q?.trim() || '';
    const filters = this.normalizeFilters(dto);
    const queryHash = this.generateQueryHash(q, filters);

    // Update if exists (upsert)
    const existing = await this.searchHistoryRepo.findOne({
      where: { userId, queryHash },
    });

    if (existing) {
      // usedAt will be updated automatically by @UpdateDateColumn
      await this.searchHistoryRepo.save(existing);
    } else {
      const history = this.searchHistoryRepo.create({
        userId,
        query: q,
        filters,
        queryHash,
      });
      await this.searchHistoryRepo.save(history);
    }

    // Bound history to 20 entries
    const count = await this.searchHistoryRepo.count({ where: { userId } });
    if (count > 20) {
      const oldest = await this.searchHistoryRepo.find({
        where: { userId },
        order: { usedAt: 'ASC' },
        take: count - 20,
      });
      if (oldest.length > 0) {
        await this.searchHistoryRepo.remove(oldest);
      }
    }
  }

  async getRecentSearches(userId: number) {
    return this.searchHistoryRepo.find({
      where: { userId },
      order: { usedAt: 'DESC' },
      take: 20,
    });
  }
}
