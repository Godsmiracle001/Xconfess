import { Reaction } from '../../reaction/entities/reaction.entity';
import { User } from '../../user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Gender } from '../dto/get-confessions.dto';

/**
 * Entity representing an anonymous confession in the system.
 * Each confession is stored with a unique identifier and timestamp.
 */


@Entity('anonymous_confessions')
export class AnonymousConfession {
  /**
   * Unique identifier for the confession.
   * Generated automatically using UUID v4.
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The content of the confession.
   * Stored as text to allow for longer messages.
   */
  @Column('text')
  @Index()
  message: string;

  /**
   * The gender of the confessor.
   * Can be male, female, or other.
   */
  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true
  })
  gender: Gender;

  /**
   * Associated reactions to this confession.
   * One confession can have multiple reactions.
   */
  @OneToMany(() => Reaction, (reaction) => reaction.confession)
  reactions: Reaction[];


  @Column({
    default: 0,
  })
  @Index()
  view_count: number;

  /**
   * Timestamp when the confession was created.
   * Automatically set when the confession is created.
   */
  @CreateDateColumn({ name: 'created_at' })
  @Index()
  created_at: Date;

  /**
   * The user who created this confession.
   * Can be null if the confession is truly anonymous.
   */
  @ManyToOne(() => User, user => user.confessions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  /**
   * Getter for message alias to content for consistency
   */
  get content(): string {
    return this.message;
  }
}
