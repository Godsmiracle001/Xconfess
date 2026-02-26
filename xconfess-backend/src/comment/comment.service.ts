import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { User } from '../user/entities/user.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { NotificationQueue } from '../notification/notification.queue';
import {
  ModerationComment,
  ModerationStatus,
} from './entities/moderation-comment.entity';
import { AnonymousUser } from '../user/entities/anonymous-user.entity';
import { OutboxEvent, OutboxStatus } from '../common/entities/outbox-event.entity';

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    @InjectRepository(AnonymousConfession)
    private confessionRepo: Repository<AnonymousConfession>,
    @InjectRepository(ModerationComment)
    private moderationCommentRepo: Repository<ModerationComment>,
    @InjectRepository(OutboxEvent)
    private outboxRepo: Repository<OutboxEvent>,
    private readonly notificationQueue: NotificationQueue,
    private readonly dataSource: DataSource,
  ) { }

  async create(
    content: string,
    user: AnonymousUser,
    confessionId: string,
    anonymousContextId: string,
    parentId?: number,
  ): Promise<Comment> {
    const confession = await this.confessionRepo.findOne({
      where: { id: confessionId, isDeleted: false },
      relations: ['anonymousUser', 'anonymousUser.userLinks', 'anonymousUser.userLinks.user'],
    });

    if (!confession) {
      throw new NotFoundException('Confession not found');
    }

    return this.dataSource.transaction(async (manager) => {
      // ... (existing comment creation logic)
      const commentRepo = manager.getRepository(Comment);
      const moderationRepo = manager.getRepository(ModerationComment);
      const outboxRepo = manager.getRepository(OutboxEvent);

      const comment = commentRepo.create({
        content,
        anonymousUser: user,
        confession,
        anonymousContextId,
      });

      if (parentId) {
        const parentComment = new Comment();
        parentComment.id = parentId;
        comment.parent = parentComment;
      }

      const savedComment = await commentRepo.save(comment);

      // Add moderation entry
      await moderationRepo.save(
        moderationRepo.create({
          comment: savedComment,
          commentId: savedComment.id,
          status: ModerationStatus.PENDING,
        }),
      );

      // 4. Create Outbox Event for notification
      const recipientEmail = this.getRecipientEmail(confession.anonymousUser);
      if (recipientEmail) {
        const payload = {
          commentId: savedComment.id,
          confessionId: confession.id,
          recipientEmail,
          commenterContextId: anonymousContextId,
          commentPreview: content.substring(0, 100),
        };

        const idempotencyKey = `comment:${savedComment.id}`;

        await outboxRepo.save(
          outboxRepo.create({
            type: 'comment_notification',
            payload,
            idempotencyKey,
            status: OutboxStatus.PENDING,
          }),
        );
      }

      return savedComment;
    });
  }

  private getRecipientEmail(anonymousUser: AnonymousUser): string | null {
    if (!anonymousUser) return null;

    // Find linked user
    const link = anonymousUser.userLinks?.[0];
    if (link?.user) {
      return link.user.getEmail();
    }

    return null;
  }

  async findByConfessionId(
    confessionId: string,
    opts?: { page?: number; limit?: number },
  ): Promise<Comment[]> {
    // Only return comments with approved moderation status
    const qb = this.commentRepo
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.confession', 'confession')
      .leftJoinAndSelect('comment.anonymousUser', 'anonymousUser')
      .leftJoinAndSelect('comment.parent', 'parent')
      .leftJoinAndSelect('comment.replies', 'replies')
      .innerJoin(
        'moderation_comments',
        'moderation',
        'moderation.commentId = comment.id',
      )
      .where('comment.confession = :confessionId', { confessionId })
      .andWhere('comment.isDeleted = false')
      .andWhere('moderation.status = :status', {
        status: ModerationStatus.APPROVED,
      })
      .orderBy('comment.createdAt', 'DESC');

    if (opts?.page && opts?.limit) {
      // For pagination we only page top-level comments (parent IS NULL)
      qb.andWhere('comment.parent IS NULL');
      const skip = (opts.page - 1) * opts.limit;
      qb.skip(skip).take(opts.limit);
    } else if (opts?.limit) {
      qb.take(opts.limit);
    }

    const comments = await qb.getMany();
    return comments;
  }

  async delete(id: number, user: AnonymousUser): Promise<void> {
    const comment = await this.commentRepo.findOne({
      where: { id, isDeleted: false },
      relations: ['anonymousUser'],
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.anonymousUser.id !== user.id) {
      throw new BadRequestException('You can only delete your own comments');
    }

    await this.commentRepo.update(id, { isDeleted: true });
  }

  async moderateComment(
    commentId: number,
    status: ModerationStatus,
    moderator: User,
  ): Promise<{ success: boolean; message: string }> {
    const moderation = await this.moderationCommentRepo.findOne({
      where: { comment: { id: commentId } },
      relations: ['comment'],
    });
    if (!moderation) {
      throw new NotFoundException('Moderation entry not found for comment');
    }
    if (moderation.status !== ModerationStatus.PENDING) {
      throw new BadRequestException('Comment has already been moderated');
    }
    moderation.status = status;
    moderation.moderatedAt = new Date();
    moderation.moderatedBy = moderator;
    moderation.moderatedById = moderator.id;
    await this.moderationCommentRepo.save(moderation);
    return { success: true, message: `Comment ${status}` };
  }
}
