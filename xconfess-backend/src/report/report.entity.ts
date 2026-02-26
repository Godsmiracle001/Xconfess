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
import { ReportReason } from './enums/report-reason.enum';

export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Entity('reports')
@Index(['confessionId', 'reporterId'])
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  confessionId: string;

  @Column({ nullable: true })
  reporterId?: number;

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  @Column({ nullable: true })
  details?: string;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
  })
  status: ReportStatus;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedById?: number;

  @ManyToOne(() => User, { 
    nullable: true,
    onDelete: 'SET NULL' 
  })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy?: User;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'resolution_reason', nullable: true })
  resolutionReason?: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
idempotencyKey: string | null;

/**
 * Serialised response payload captured at first creation.
 * Replayed requests with the same key return this instead of re-inserting.
 */
@Column({ type: 'jsonb', nullable: true, default: null })
idempotencyResponse: Record<string, unknown> | null;
}

