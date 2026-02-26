import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { AnonymousConfession } from '../../confession/entities/confession.entity';
import { Comment } from '../../comment/entities/comment.entity';
import { Reaction } from '../../reaction/entities/reaction.entity';
import { UserAnonymousUser } from './user-anonymous-link.entity';

@Entity()
export class AnonymousUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  // Relations to anonymous actions
  @OneToMany(() => AnonymousConfession, confession => confession.anonymousUser)
  confessions: AnonymousConfession[];

  @OneToMany(() => Comment, comment => comment.anonymousUser)
  comments: Comment[];

  @OneToMany(() => Reaction, reaction => reaction.anonymousUser)
  reactions: Reaction[];

  @OneToMany(() => UserAnonymousUser, link => link.anonymousUser)
  userLinks: UserAnonymousUser[];
}
