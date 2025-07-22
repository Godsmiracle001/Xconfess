import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AnonymousConfessionRepository } from './repository/confession.repository';
import { CreateConfessionDto } from './dto/create-confession.dto';
import { UpdateConfessionDto } from './dto/update-confession.dto';
import { SearchConfessionDto } from './dto/search-confession.dto';
import { GetConfessionsDto, SortOrder } from './dto/get-confessions.dto';
import sanitizeHtml from 'sanitize-html';
import { encryptConfession, decryptConfession } from '../utils/confession-encryption';
import { ConfessionViewCacheService } from './confession-view-cache.service';
import { Request } from 'express';

@Injectable()
export class ConfessionService {
  constructor(
    private confessionRepo: AnonymousConfessionRepository,
    private viewCache: ConfessionViewCacheService,
  ) {}

  private sanitizeMessage(message: string): string {
    return sanitizeHtml(message, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape',
    }).trim();
  }

  async create(dto: CreateConfessionDto) {
    const msg = this.sanitizeMessage(dto.message);
    if (!msg) throw new BadRequestException('Invalid confession content');
    try {
      const encryptedMsg = encryptConfession(msg);
      const conf = this.confessionRepo.create({ message: encryptedMsg, gender: dto.gender });
      return await this.confessionRepo.save(conf);
    } catch {
      throw new InternalServerErrorException('Failed to create confession');
    }
  }

  async getConfessions(dto: GetConfessionsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    if (limit < 1 || limit > 100) throw new BadRequestException('limit must be 1–100');

    const skip = (page - 1) * limit;
    const qb = this.confessionRepo.createQueryBuilder('confession')
      .andWhere('confession.isDeleted = false')
      .leftJoinAndSelect('confession.reactions', 'reactions');

    if (dto.gender) {
      qb.andWhere('confession.gender = :gender', { gender: dto.gender });
    }

    if (dto.sort === SortOrder.TRENDING) {
      qb.addSelect(sub =>
        sub.select('COUNT(*)')
           .from('reaction', 'r')
           .where('r.confession_id = confession.id'), 'reaction_count')
        .orderBy('reaction_count', 'DESC')
        .addOrderBy('confession.created_at', 'DESC');
    } else {
      qb.orderBy('confession.created_at', 'DESC');
    }

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();
    // Decrypt message before returning
    const decryptedItems = items.map(item => ({
      ...item,
      message: decryptConfession(item.message),
    }));
    return {
      data: decryptedItems,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdateConfessionDto) {
    const existing = await this.confessionRepo.findOne({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException(`Confession ${id} not found`);
    if (dto.message) {
      const sanitized = this.sanitizeMessage(dto.message);
      if (!sanitized) throw new BadRequestException('Invalid content');
      dto.message = encryptConfession(sanitized);
    }
    await this.confessionRepo.update(id, dto);
    const updated = await this.confessionRepo.findOne({ where: { id } });
    if (updated) updated.message = decryptConfession(updated.message);
    return updated;
  }

  async remove(id: string) {
    const existing = await this.confessionRepo.findOne({ where: { id, isDeleted: false } });
    if (!existing) throw new NotFoundException(`Confession ${id} not found`);
    await this.confessionRepo.update(id, { isDeleted: true });
    return { message: 'Confession soft‑deleted' };
  }

  async search(dto: SearchConfessionDto) {
    if (!dto.q.trim()) throw new BadRequestException('Search term cannot be empty');
    const limit = typeof dto.limit === 'number' ? dto.limit : Number(dto.limit) || 10;
    const result = await this.confessionRepo.hybridSearch(dto.q.trim(), dto.page, limit);
    return {
      data: result?.confessions || [],
      meta: {
        total: result?.total || 0,
        page: dto.page,
        limit,
        totalPages: Math.ceil((result?.total || 0) / limit),
        searchTerm: dto.q.trim(),
      },
    };
  }

  async fullTextSearch(dto: SearchConfessionDto) {
    if (!dto.q.trim()) throw new BadRequestException('Search term cannot be empty');
    const limit = typeof dto.limit === 'number' ? dto.limit : Number(dto.limit) || 10;
    const result = await this.confessionRepo.fullTextSearch(dto.q.trim(), dto.page, limit);
    return {
      data: result?.confessions || [],
      meta: {
        total: result?.total || 0,
        page: dto.page,
        limit,
        totalPages: Math.ceil((result?.total || 0) / limit),
        searchTerm: dto.q.trim(),
        searchType: 'fulltext',
      },
    };
  }

  async getConfessionByIdWithViewCount(id: string, req: Request) {
    const conf = await this.confessionRepo.findOne({ where: { id, isDeleted: false } });
    if (!conf) throw new NotFoundException('Confession not found');

    // Type-safe extraction of user id or IP
    // Extend Request type to include 'user' property
    type AuthenticatedRequest = Request & { user?: { id?: string } };
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    let userOrIp: string = userId ?? String(req.headers['x-forwarded-for'] ?? req.ip);
    // If x-forwarded-for is an array, use the first element
    if (Array.isArray(userOrIp)) {
      userOrIp = userOrIp[0] ?? req.ip;
    }
    if (!userOrIp) userOrIp = req.ip ?? '';

    if (await this.viewCache.checkAndMarkView(id, userOrIp)) {
      await this.confessionRepo.increment({ id }, 'view_count', 1);
      const updated = await this.confessionRepo.findOne({ where: { id } });
      if (updated) updated.message = decryptConfession(updated.message);
      return updated;
    }
    conf.message = decryptConfession(conf.message);
    return conf;
  }

  async getTrendingConfessions() {
    const confs = await this.confessionRepo.findTrending(10);
    return { data: confs };
  }
}
