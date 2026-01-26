import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('reports')
@Index(['confessionId', 'reporterId'])
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  confessionId: string;


  @Column({ nullable: true })
  reporterId?: number;

  @Column()
  reason: string;

  @Column({ nullable: true })
  details?: string;

 @CreateDateColumn({ name: 'created_at' })
 created_at: Date;

}
