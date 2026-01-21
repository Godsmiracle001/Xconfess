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

/**
 * Entity representing an anonymous confession.
 */
@Index(['view_count', 'created_at']) // THIS IS YOUR QUERY OPTIMIZATION
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

  get content(): string {
    return this.message;
  }
}