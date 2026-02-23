import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

export enum AuditAction {
  // Report actions
  REPORT_RESOLVED = 'report_resolved',
  REPORT_DISMISSED = 'report_dismissed',
  
  // Confession actions
  CONFESSION_DELETED = 'confession_deleted',
  CONFESSION_HIDDEN = 'confession_hidden',
  CONFESSION_UNHIDDEN = 'confession_unhidden',
  
  // User actions
  USER_BANNED = 'user_banned',
  USER_UNBANNED = 'user_unbanned',
  USER_ADMIN_GRANTED = 'user_admin_granted',
  USER_ADMIN_REVOKED = 'user_admin_revoked',
  
  // Moderation actions
  MODERATION_OVERRIDE = 'moderation_override',
  BULK_ACTION = 'bulk_action',
}

@Entity('audit_logs')
@Index(['adminId'])
@Index(['action'])
@Index(['createdAt'])
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'admin_id' })
  adminId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', nullable: true })
  entityType: string | null; // 'confession', 'user', 'report', etc.

  @Column({ name: 'entity_id', type: 'varchar', nullable: true })
  entityId: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
