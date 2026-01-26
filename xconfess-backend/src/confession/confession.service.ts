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
import {
  encryptConfession,
  decryptConfession,
} from '../utils/confession-encryption';
import { ConfessionViewCacheService } from './confession-view-cache.service';
import { Request } from 'express';
import {
  AiModerationService,
  ModerationStatus,
} from '../moderation/ai-moderation.service';
import { ModerationRepositoryService } from '../moderation/moderation-repository.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnonymousUserService } from '../user/anonymous-user.service';
import { EntityManager, Repository } from 'typeorm';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';
import { AnonymousConfession } from './entities/confession.entity';
import { AppLogger } from 'src/logger/logger.service';
import { maskUserId } from 'src/utils/mask-user-id';
import { EncryptionService } from 'src/encryption/encryption.service';
import { ConfessionResponseDto } from './dto/confession-response.dto';
import { StellarService } from '../stellar/stellar.service';
import { AnchorConfessionDto } from '../stellar/dto/anchor-confession.dto';

@Injectable()
export class ConfessionService {
  constructor(
    private confessionRepo: AnonymousConfessionRepository,
    private viewCache: ConfessionViewCacheService,
    private readonly aiModerationService: AiModerationService,
    private readonly moderationRepoService: ModerationRepositoryService,
    private readonly eventEmitter: EventEmitter2,
    private readonly anonymousUserService: AnonymousUserService,
    private readonly logger: AppLogger,
    private encryptionService: EncryptionService,
    private readonly stellarService: StellarService,
  ) {}

  private sanitizeMessage(message: string): string {
    return sanitizeHtml(message, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'recursiveEscape',
    }).trim();
  }

  async create(dto: CreateConfessionDto, manager?: EntityManager) {
    const msg = this.sanitizeMessage(dto.message);
    if (!msg) throw new BadRequestException('Invalid confession content');

    try {
      // Step 1: Moderate the content BEFORE encryption
      const moderationResult =
        await this.aiModerationService.moderateContent(msg);

      // Step 1.5: Create an AnonymousUser to associate with this confession
      const anonymousUser = manager
        ? await manager
            .getRepository(AnonymousUser)
            .save(manager.getRepository(AnonymousUser).create())
        : await this.anonymousUserService.create();

      // Step 2: Encrypt and save the confession
      const encryptedMsg = encryptConfession(msg);
      const confessionRepo: Repository<AnonymousConfession> = manager
        ? manager.getRepository(AnonymousConfession)
        : (this.confessionRepo as unknown as Repository<AnonymousConfession>);

      // Prepare Stellar anchoring data if transaction hash provided
      let stellarData: {
        stellarTxHash?: string;
        stellarHash?: string;
        isAnchored?: boolean;
        anchoredAt?: Date;
      } = {};

      if (dto.stellarTxHash) {
        const anchorData = this.stellarService.processAnchorData(
          msg,
          dto.stellarTxHash,
        );
        if (anchorData) {
          stellarData = {
            stellarTxHash: anchorData.stellarTxHash,
            stellarHash: anchorData.stellarHash,
            isAnchored: true,
            anchoredAt: anchorData.anchoredAt,
          };
        }
      }

      const conf = confessionRepo.create({
        message: encryptedMsg,
        gender: dto.gender,
        anonymousUser,
        moderationScore: moderationResult.score,
        moderationFlags: moderationResult.flags as any,
        moderationStatus: moderationResult.status as any,
        requiresReview: moderationResult.requiresReview,
        isHidden: moderationResult.status === ModerationStatus.REJECTED,
        moderationDetails: moderationResult.details,
        ...stellarData,
      });

      const savedConfession = await confessionRepo.save(conf);

      // Step 3: Log moderation decision
      await this.moderationRepoService.createLog(
        msg,
        moderationResult,
        savedConfession.id,
        undefined,
        'openai',
        manager,
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
    if (limit < 1 || limit > 100)
      throw new BadRequestException('limit must be 1–100');

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

    const decryptedItems = items.map((item) => ({
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
      const moderationResult =
        await this.aiModerationService.moderateContent(sanitized);

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
    if (!dto.q.trim())
      throw new BadRequestException('Search term cannot be empty');
    const limit =
      typeof dto.limit === 'number' ? dto.limit : Number(dto.limit) || 10;
    const result = await this.confessionRepo.hybridSearch(
      dto.q.trim(),
      dto.page,
      limit,
    );
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
    if (!dto.q.trim())
      throw new BadRequestException('Search term cannot be empty');
    const limit =
      typeof dto.limit === 'number' ? dto.limit : Number(dto.limit) || 10;
    const result = await this.confessionRepo.fullTextSearch(
      dto.q.trim(),
      dto.page,
      limit,
    );
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
    let userOrIp: string =
      userId ?? String(req.headers['x-forwarded-for'] ?? req.ip);
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

  async updateModerationStatus(
    confessionId: string,
    status: ModerationStatus,
    moderatorId: string,
    notes?: string,
  ) {
    const confession = await this.confessionRepo.findOne({
      where: { id: confessionId },
    });

    if (!confession) {
      throw new NotFoundException('Confession not found');
    }

    confession.moderationStatus = status as any;
    confession.isHidden = status === ModerationStatus.REJECTED;
    confession.requiresReview = false;

    const updated = await this.confessionRepo.save(confession);

    const logs =
      await this.moderationRepoService.getLogsByConfession(confessionId);
    if (logs.length > 0) {
      await this.moderationRepoService.updateReview(
        logs[0].id,
        status,
        moderatorId,
        notes,
      );
    }

    return updated;
  }

  async getFlaggedConfessions(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.confessionRepo.findAndCount({
      where: [
        { requiresReview: true },
        { moderationStatus: ModerationStatus.FLAGGED as any },
      ],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async createConfession(userId: string, data: any) {
    // Option 1: Use the logger's built-in method
    this.logger.logWithUser(
      'Creating confession',
      userId,
      'ConfessionsService',
    );

    try {
      // Your logic here
      const confession = await this.saveConfession(data);

      this.logger.logWithUser(
        'Confession created successfully',
        userId,
        'ConfessionsService',
      );

      return confession;
    } catch (error) {
      // Option 2: Use maskUserId helper for custom messages
      this.logger.error(
        `Failed to create confession for ${maskUserId(userId)}: ${error.message}`,
        error.stack,
        'ConfessionsService',
      );
      throw error;
    }
  }

  async getUserConfessions(userId: string) {
    // Option 3: Mask in object logging
    this.logger.log(
      { action: 'fetch_confessions', userId: maskUserId(userId) },
      'ConfessionsService',
    );

    return this.findByUser(userId);
  }

  // Private methods (examples)
  private async saveConfession(data: any) {
    // Implementation
    return data;
  }

  private async findByUser(userId: string) {
    // Implementation
    return [];
  }

  async findAll(): Promise<ConfessionResponseDto[]> {
    try {
      const confessions = await this.confessionRepo.find({
        order: { created_at: 'DESC' },
      });

      // Decrypt all confessions and convert to DTO
      return confessions.map((confession) => this.toResponseDto(confession));
    } catch (error) {
      this.logger.error(
        'Failed to fetch confessions',
        error.stack,
        'ConfessionsService',
      );
      throw error;
    }
  }

  async findOne(id: string): Promise<ConfessionResponseDto> {
    try {
      const confession = await this.confessionRepo.findOne({
        where: { id },
      });

      if (!confession) {
        throw new NotFoundException(`Confession with ID ${id} not found`);
      }

      return this.toResponseDto(confession);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        'Failed to fetch confession',
        error.stack,
        'ConfessionsService',
      );
      throw error;
    }
  }

  /**
   * Anchor an existing confession on Stellar blockchain
   */
  async anchorConfession(id: string, dto: AnchorConfessionDto) {
    const confession = await this.confessionRepo.findOne({
      where: { id, isDeleted: false },
    });

    if (!confession) {
      throw new NotFoundException(`Confession ${id} not found`);
    }

    if (confession.isAnchored) {
      throw new BadRequestException('Confession is already anchored on Stellar');
    }

    if (!this.stellarService.isValidTxHash(dto.stellarTxHash)) {
      throw new BadRequestException('Invalid Stellar transaction hash format');
    }

    // Decrypt confession to generate hash
    const decryptedMessage = decryptConfession(confession.message);
    const anchorData = this.stellarService.processAnchorData(
      decryptedMessage,
      dto.stellarTxHash,
    );

    if (!anchorData) {
      throw new BadRequestException('Failed to process anchoring data');
    }

    // Update confession with Stellar data
    await this.confessionRepo.update(id, {
      stellarTxHash: anchorData.stellarTxHash,
      stellarHash: anchorData.stellarHash,
      isAnchored: true,
      anchoredAt: anchorData.anchoredAt,
    });

    const updated = await this.confessionRepo.findOne({ where: { id } });
    if (updated) {
      updated.message = decryptConfession(updated.message);
    }

    return {
      ...updated,
      stellarExplorerUrl: this.stellarService.getExplorerUrl(dto.stellarTxHash),
    };
  }

  /**
   * Verify if a confession is anchored on Stellar
   */
  async verifyStellarAnchor(id: string) {
    const confession = await this.confessionRepo.findOne({
      where: { id, isDeleted: false },
    });

    if (!confession) {
      throw new NotFoundException(`Confession ${id} not found`);
    }

    if (!confession.isAnchored || !confession.stellarTxHash) {
      return {
        isAnchored: false,
        message: 'Confession is not anchored on Stellar',
      };
    }

    const isVerified = await this.stellarService.verifyTransaction(
      confession.stellarTxHash,
    );

    return {
      isAnchored: true,
      isVerified,
      stellarTxHash: confession.stellarTxHash,
      stellarHash: confession.stellarHash,
      anchoredAt: confession.anchoredAt,
      stellarExplorerUrl: this.stellarService.getExplorerUrl(
        confession.stellarTxHash,
      ),
    };
  }

  private toResponseDto(
    confession: AnonymousConfession,
  ): ConfessionResponseDto {
    const decryptedMessage = decryptConfession(confession.message);

    return new ConfessionResponseDto({
      id: String(confession.id),
      body: String(decryptedMessage),
      createdAt: confession.created_at,
      updatedAt: confession.created_at,
    });
  }
}
