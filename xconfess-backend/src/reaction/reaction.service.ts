import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { Reaction } from './entities/reaction.entity';

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);

  constructor(
    @InjectRepository(Reaction)
    private reactionRepo: Repository<Reaction>,
    @InjectRepository(AnonymousConfession)
    private confessionRepo: Repository<AnonymousConfession>,
  ) {}

  async createReaction(dto: CreateReactionDto): Promise<Reaction> {
    const confession = await this.confessionRepo.findOne({ 
      where: { id: dto.confessionId },
      relations: ['anonymousUser']
    });

    if (!confession) {
      throw new NotFoundException('Confession not found');
    }

    const anonymousUser = confession.anonymousUser;
    if (!anonymousUser) {
      throw new NotFoundException('Anonymous user not found');
    }

    // Create the reaction
    const reaction = this.reactionRepo.create({
      emoji: dto.emoji,
      confession,
      anonymousUser,
    });

    const savedReaction = await this.reactionRepo.save(reaction);

    return savedReaction;
  }
}
