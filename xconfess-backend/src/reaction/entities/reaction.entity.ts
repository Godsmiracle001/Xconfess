import { AnonymousUser } from '../../user/entities/anonymous-user.entity';
import { AnonymousConfession } from '../../confession/entities/confession.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  emoji: string;

  @ManyToOne(() => AnonymousConfession, (confession) => confession.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'confession_id' })
  confession: AnonymousConfession;

  @ManyToOne(() => AnonymousUser, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'anonymous_user_id' })
  anonymousUser: AnonymousUser;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
