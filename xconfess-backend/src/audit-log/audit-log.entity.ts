import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../user/entities/user.entity';

export enum AuditActionType {
  CONFESSION_DELETE = 'confession_delete',
  COMMENT_DELETE = 'comment_delete',
  FAILED_LOGIN = 'failed_login',
  REPORT_CREATED = 'report_created',
  CONFESSION_UPDATE = 'confession_update',
  COMMENT_UPDATE = 'comment_update',
  USER_BANNED = 'user_banned',
  USER_UNBANNED = 'user_unbanned',
}

@Entity('audit_logs')
@Index(['userId', 'timestamp'])
@Index(['actionType', 'timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: AuditActionType,
    name: 'action_type',
  })
  actionType: AuditActionType;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  timestamp: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;
}