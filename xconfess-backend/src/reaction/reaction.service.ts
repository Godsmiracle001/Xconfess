import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { Reaction } from './entities/reaction.entity';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';
import { OutboxEvent, OutboxStatus } from '../common/entities/outbox-event.entity';

@Injectable()
export class ReactionService {
  private readonly logger = new Logger(ReactionService.name);

  constructor(
    @InjectRepository(Reaction)
    private reactionRepo: Repository<Reaction>,
    @InjectRepository(AnonymousConfession)
    private confessionRepo: Repository<AnonymousConfession>,
    @InjectRepository(AnonymousUser)
    private anonymousUserRepo: Repository<AnonymousUser>,
    @InjectRepository(OutboxEvent)
    private outboxRepo: Repository<OutboxEvent>,
    private readonly dataSource: DataSource,
  ) { }

  async createReaction(dto: CreateReactionDto): Promise<Reaction> {
    // 1. Verify confession exists.
    const confession = await this.confessionRepo.findOne({
      where: { id: dto.confessionId },
      relations: ['anonymousUser', 'anonymousUser.userLinks', 'anonymousUser.userLinks.user'],
    });

    if (!confession) {
      throw new NotFoundException('Confession not found');
    }

    // 2. Verify the reacting anonymous user exists.
    const anonymousUser = await this.anonymousUserRepo.findOne({
      where: { id: dto.anonymousUserId },
    });

    if (!anonymousUser) {
      throw new NotFoundException('Anonymous user not found');
    }

    return this.dataSource.transaction(async (manager) => {
      const reactionRepo = manager.getRepository(Reaction);
      const outboxRepo = manager.getRepository(OutboxEvent);

      // 3. Prevent duplicate reactions
      const existing = await reactionRepo.findOne({
        where: {
          confession: { id: dto.confessionId },
          anonymousUser: { id: dto.anonymousUserId },
        },
      });

      if (existing) {
        if (existing.emoji === dto.emoji) {
          return existing;
        }

        existing.emoji = dto.emoji;
        const updated = await reactionRepo.save(existing);

        // Update outbox event for the change?
        // Usually reactions are high volume, but let's notify the author.
        await this.createOutboxEvent(outboxRepo, confession, updated, 'reaction_update');

        return updated;
      }

      // 4. Persist new reaction
      const reaction = reactionRepo.create({
        emoji: dto.emoji,
        confession,
        anonymousUser,
      });

      const savedReaction = await reactionRepo.save(reaction);

      await this.createOutboxEvent(outboxRepo, confession, savedReaction, 'reaction_notification');

      return savedReaction;
    });
  }

  private async createOutboxEvent(
    outboxRepo: Repository<OutboxEvent>,
    confession: AnonymousConfession,
    reaction: Reaction,
    type: string,
  ) {
    const recipientEmail = this.getRecipientEmail(confession.anonymousUser);
    if (recipientEmail) {
      await outboxRepo.save(
        outboxRepo.create({
          type,
          payload: {
            reactionId: reaction.id,
            confessionId: confession.id,
            recipientEmail,
            emoji: reaction.emoji,
          },
          // Idempotency key for reactions can be user-confession-emoji if we want to limit alerts
          idempotencyKey: `${type}:${reaction.id}:${reaction.emoji}`,
          status: OutboxStatus.PENDING,
        }),
      );
    }
  }

  private getRecipientEmail(anonymousUser: AnonymousUser): string | null {
    if (!anonymousUser) return null;
    const link = anonymousUser.userLinks?.[0];
    if (link?.user) {
      return link.user.getEmail();
    }
    return null;
  }
}
