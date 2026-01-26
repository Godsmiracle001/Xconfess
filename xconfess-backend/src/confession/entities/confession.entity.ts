// src/confession/entities/confession.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Reaction } from '../../reaction/entities/reaction.entity';
import { AnonymousUser } from '../../user/entities/anonymous-user.entity';
import { Gender } from '../dto/get-confessions.dto';
import { Comment } from '../../comment/entities/comment.entity';

@Entity('anonymous_confessions')
export class AnonymousConfession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  @Index()
  message: string;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender;

  @OneToMany(() => Reaction, (reaction) => reaction.confession)
  reactions: Reaction[];

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => AnonymousUser, (anonymousUser) => anonymousUser.confessions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'anonymous_user_id' })
  anonymousUser: AnonymousUser;

  @Column({ type: 'int', default: 0 })
  view_count: number;

  @Column({ default: false })
  isDeleted: boolean;

  @OneToMany(() => Comment, (comment) => comment.confession)
  comments: Comment[];

  // Moderation fields
  @Column('decimal', { name: 'moderation_score', precision: 5, scale: 4, default: 0 })
  moderationScore: number;

  @Column('simple-array', { name: 'moderation_flags', default: '' })
  moderationFlags: string[];

  @Column({
    type: 'varchar',
    name: 'moderation_status',
    default: 'pending',
  })
  moderationStatus: string;

  @Column({ name: 'requires_review', default: false })
  requiresReview: boolean;

  @Column({ name: 'is_hidden', default: false })
  isHidden: boolean;

  @Column('json', { name: 'moderation_details', nullable: true })
  moderationDetails: Record<string, number>;

  // Stellar blockchain anchoring fields
  @Column({ name: 'stellar_tx_hash', nullable: true })
  stellarTxHash: string;

  @Column({ name: 'stellar_hash', nullable: true })
  stellarHash: string;

  @Column({ name: 'is_anchored', default: false })
  isAnchored: boolean;

  @Column({ name: 'anchored_at', type: 'timestamp', nullable: true })
  anchoredAt: Date;

  get content(): string {
    return this.message;
  }
}