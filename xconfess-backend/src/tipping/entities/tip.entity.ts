import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AnonymousConfession } from '../../confession/entities/confession.entity';

export enum TipVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  CONFLICT = 'conflict',
}

@Entity('tips')
export class Tip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'confession_id', type: 'uuid' })
  @Index()
  confessionId: string;

  @ManyToOne(() => AnonymousConfession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'confession_id' })
  confession: AnonymousConfession;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amount: number;

  @Column({ name: 'tx_id', type: 'varchar', length: 64, unique: true })
  @Index()
  txId: string;

  @Column({
    name: 'sender_address',
    type: 'varchar',
    length: 56,
    nullable: true,
  })
  senderAddress: string | null;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: TipVerificationStatus,
    default: TipVerificationStatus.VERIFIED,
  })
  verificationStatus: TipVerificationStatus;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
