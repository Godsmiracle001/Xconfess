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
import { AiModerationService, ModerationStatus } from '../moderation/ai-moderation.service';
import { ModerationRepositoryService } from '../moderation/moderation-repository.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ConfessionService {
  constructor(
    private confessionRepo: AnonymousConfessionRepository,
    private viewCache: ConfessionViewCacheService,
    private readonly aiModerationService: AiModerationService,
    private readonly moderationRepoService: ModerationRepositoryService,
    private readonly eventEmitter: EventEmitter2,
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
      // Step 1: Moderate the content BEFORE encryption
      const moderationResult = await this.aiModerationService.moderateContent(msg);

      // Step 2: Encrypt and save the confession
      const encryptedMsg = encryptConfession(msg);
      const conf = this.confessionRepo.create({
        message: encryptedMsg,
        gender: dto.gender,
        moderationScore: moderationResult.score,
        moderationFlags: moderationResult.flags as any,
        moderationStatus: moderationResult.status as any,
        requiresReview: moderationResult.requiresReview,
        isHidden: moderationResult.status === ModerationStatus.REJECTED,
        moderationDetails: moderationResult.details,
      });

      const savedConfession = await this.confessionRepo.save(conf);

      // Step 3: Log moderation decision
      await this.moderationRepoService.createLog(
        msg,
        moderationResult,
        savedConfession.id,
        undefined,
        'openai',
      );

      // Step 4: Handle high-severity content
      if (moderationResult.status === ModerationStatus.REJECTED) {
        this.eventEmitter.emit('moderation.high-severity', {
          confessionId: savedConfession.id,
          score: moderationResult.score,
          flags: moderationResult.flags,
        });
      }

      // Step 5: Handle medium-severity content
      if (moderationResult.status === ModerationStatus.FLAGGED) {
        this.eventEmitter.emit('moderation.requires-review', {
          confessionId: savedConfession.id,
          score: moderationResult.score,
          flags: moderationResult.flags,
        });
      }

      return savedConfession;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to create confession');
    }
  }

  async getConfessions(dto: GetConfessionsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    if (limit < 1 || limit > 100) throw new BadRequestException('limit must be 1–100');

    const skip = (page - 1) * limit;
    const qb = this.confessionRepo
      .createQueryBuilder('confession')
      .andWhere('confession.isDeleted = false')
      .andWhere('confession.isHidden = false')
      .andWhere('confession.moderationStatus IN (:...statuses)', {
        statuses: [ModerationStatus.APPROVED, ModerationStatus.PENDING],
      })
      .leftJoinAndSelect('confession.reactions', 'reactions');

    if (dto.gender) {
      qb.andWhere('confession.gender = :gender', { gender: dto.gender });
    }

    if (dto.sort === SortOrder.TRENDING) {
      qb.addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from('reaction', 'r')
            .where('r.confession_id = confession.id'),
        'reaction_count',
      )
        .orderBy('reaction_count', 'DESC')
        .addOrderBy('confession.created_at', 'DESC');
    } else {
      qb.orderBy('confession.created_at', 'DESC');
    }

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();
      ...item,
      message: decryptConfession(item.message),
    }));

    return {
      data: decryptedItems,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdateConfessionDto) {
    const existing = await this.confessionRepo.findOne({
      where: { id, isDeleted: false },
    });
    if (!existing) throw new NotFoundException(`Confession ${id} not found`);

    if (dto.message) {
      const sanitized = this.sanitizeMessage(dto.message);
      if (!sanitized) throw new BadRequestException('Invalid content');

      // Re-moderate updated content
      const moderationResult = await this.aiModerationService.moderateContent(sanitized);
      
      dto.message = encryptConfession(sanitized);
      await this.confessionRepo.update(id, {
        ...dto,
        moderationScore: moderationResult.score,
        moderationFlags: moderationResult.flags as any,
        moderationStatus: moderationResult.status as any,
        requiresReview: moderationResult.requiresReview,
        isHidden: moderationResult.status === ModerationStatus.REJECTED,
        moderationDetails: moderationResult.details,
      });

      // Log the moderation
      await this.moderationRepoService.createLog(
        sanitized,
        moderationResult,
        id,
        undefined,
        'openai',
      );
    } else {
      await this.confessionRepo.update(id, dto);
    }

    const updated = await this.confessionRepo.findOne({ where: { id } });
    if (updated) updated.message = decryptConfession(updated.message);
    return updated;
  }

  async remove(id: string) {
    const existing = await this.confessionRepo.findOne({
      where: { id, isDeleted: false },
    });
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
    const conf = await this.confessionRepo.findOne({
      where: { id, isDeleted: false, isHidden: false },
    });
    if (!conf) throw new NotFoundException('Confession not found');

    type AuthenticatedRequest = Request & { user?: { id?: string } };
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id;
    let userOrIp: string = userId ?? String(req.headers['x-forwarded-for'] ?? req.ip);
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

  /**
   * Requirement: Trending Algorithm implementation
   * Formula: (Views * 0.5 + Reactions * 2) / (Age in Hours + 2)^1.5
   */
  async getTrendingConfessions() {
    const qb = this.confessionRepo.createQueryBuilder('confession')
      .leftJoinAndSelect('confession.reactions', 'reactions')
      .where('confession.isDeleted = false')
      .addSelect(
        `((confession.view_count * 0.5) + (
          SELECT COUNT(*) FROM reaction r WHERE r.confession_id = confession.id
        ) * 2) / POWER(EXTRACT(EPOCH FROM (NOW() - confession.created_at))/3600 + 2, 1.5)`,
        'trending_score',
      )
      .orderBy('trending_score', 'DESC')
      .limit(10);

    const items = await qb.getMany();

    const decryptedItems = items.map((item) => ({
      ...item,
      message: decryptConfession(item.message),
    }));

    return {
      data: decryptedItems,
    };
  }

