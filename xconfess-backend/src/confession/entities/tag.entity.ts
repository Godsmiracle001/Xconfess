import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { AnonymousConfession } from './confession.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  @Index()
  name: string;

  @Column({ name: 'display_name', length: 60 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToMany(() => AnonymousConfession, (confession) => confession.tags)
  confessions: AnonymousConfession[];
}
