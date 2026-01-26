import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { TagResponseDto } from './dto/tag-response.dto';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  /**
   * Get all active tags
   */
  async getAllTags(): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return tags.map(
      (tag) =>
        new TagResponseDto({
          id: tag.id,
          name: tag.name,
          displayName: tag.displayName,
          description: tag.description,
        }),
    );
  }

  /**
   * Get a tag by name
   */
  async getTagByName(name: string): Promise<Tag | null> {
    return this.tagRepository.findOne({
      where: { name: name.toLowerCase(), isActive: true },
    });
  }

  /**
   * Get a tag by ID
   */
  async getTagById(id: string): Promise<Tag | null> {
    return this.tagRepository.findOne({
      where: { id, isActive: true },
    });
  }

  /**
   * Get all tags with confession counts
   */
  async getTagsWithCount(): Promise<TagResponseDto[]> {
    const tags = await this.tagRepository
      .createQueryBuilder('tag')
      .leftJoin('tag.confessions', 'confession')
      .where('tag.isActive = :isActive', { isActive: true })
      .andWhere('confession.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('confession.isHidden = :isHidden', { isHidden: false })
      .select('tag.id', 'id')
      .addSelect('tag.name', 'name')
      .addSelect('tag.displayName', 'displayName')
      .addSelect('tag.description', 'description')
      .addSelect('COUNT(DISTINCT confession.id)', 'confessionCount')
      .groupBy('tag.id')
      .orderBy('tag.name', 'ASC')
      .getRawMany();

    return tags.map(
      (tag) =>
        new TagResponseDto({
          id: tag.id,
          name: tag.name,
          displayName: tag.displayName,
          description: tag.description,
          confessionCount: parseInt(tag.confessionCount, 10) || 0,
        }),
    );
  }

  /**
   * Validate that all provided tag IDs exist and are active
   * Returns the valid Tag entities
   */
  async validateTagIds(tagIds: string[]): Promise<Tag[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    // Remove duplicates
    const uniqueTagIds = [...new Set(tagIds)];

    if (uniqueTagIds.length > 3) {
      throw new BadRequestException('Maximum 3 tags allowed per confession');
    }

    const tags = await this.tagRepository.find({
      where: { id: In(uniqueTagIds), isActive: true },
    });

    if (tags.length !== uniqueTagIds.length) {
      const foundIds = tags.map((t) => t.id);
      const missingIds = uniqueTagIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Invalid or inactive tag IDs: ${missingIds.join(', ')}`,
      );
    }

    return tags;
  }

  /**
   * Get tags by IDs (for internal use)
   */
  async getTagsByIds(tagIds: string[]): Promise<Tag[]> {
    if (!tagIds || tagIds.length === 0) {
      return [];
    }

    return this.tagRepository.find({
      where: { id: In(tagIds), isActive: true },
    });
  }
}
