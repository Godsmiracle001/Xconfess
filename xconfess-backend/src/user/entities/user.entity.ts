import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { AnonymousUser } from './anonymous-user.entity';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity()
@Unique(['username'])
@Unique(['emailHash'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  password: string;

  // Encrypted email fields
  @Column({ name: 'email_encrypted', type: 'text' })
  emailEncrypted: string;

  @Column({ name: 'email_iv', type: 'varchar', length: 32 })
  emailIv: string;

  @Column({ name: 'email_tag', type: 'varchar', length: 32 })
  emailTag: string;

  // Searchable hash
  @Column({ name: 'email_hash', type: 'varchar', length: 64, unique: true })
  emailHash: string;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  resetPasswordToken: string | null;

  @Column({ nullable: true })
  resetPasswordExpires: Date | null;

  // Profile fields
  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender: Gender | null;

  @Column({ nullable: true })
  age: number | null;

  @Column({ name: 'can_receive_messages', default: true })
  canReceiveMessages: boolean;

  @Column({ name: 'is_profile_public', default: false })
  isProfilePublic: boolean;

  // Link to anonymous user for tracking confessions/reactions
  @OneToOne(() => AnonymousUser, { nullable: true })
  @JoinColumn({ name: 'anonymous_user_id' })
  anonymousUser: AnonymousUser | null;

  @Column({ name: 'anonymous_user_id', nullable: true })
  anonymousUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}