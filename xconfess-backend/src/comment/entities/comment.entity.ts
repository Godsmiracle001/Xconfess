import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { AnonymousConfession } from '../../confession/entities/confession.entity';
import { AnonymousUser } from '../../user/entities/anonymous-user.entity';

@Entity('comments')
@Index(['confession', 'createdAt', 'id']) // Composite index for stable ordering
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => AnonymousUser, (anonymousUser) => anonymousUser.comments)
  @JoinColumn({ name: 'anonymous_user_id' })
  anonymousUser: AnonymousUser;

  @ManyToOne(() => AnonymousConfession, (c) => c.comments)
  @JoinColumn({ name: 'confessionId' })
  confession: AnonymousConfession;

  @Column({ nullable: true })
  anonymousContextId?: string;

  // Parent comment (optional) for nested replies
  @ManyToOne(() => Comment, (comment) => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Comment;

  @OneToMany(() => Comment, (comment) => comment.parent)
  replies?: Comment[];

  @RelationId((comment: Comment) => comment.parent)
  parentId?: number;

  @Column({ default: false })
  isDeleted: boolean;
}
