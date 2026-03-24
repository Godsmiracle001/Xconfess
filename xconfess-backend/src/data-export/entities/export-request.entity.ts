// src/data-export/entities/export-request.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('export_requests')
export class ExportRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ default: 'PENDING' })
  status: string;

  // Storing the actual ZIP file in the DB (fallback for small exports)
  @Column({ type: 'bytea', nullable: true, select: false })
  fileData: Buffer | null;

  @Column({ default: false })
  isChunked: boolean;

  @Column({ default: 0 })
  chunkCount: number;

  @Column({ type: 'bigint', default: 0 })
  totalSize: string; // Stored as string to handle bigint safely in JS

  @Column({ nullable: true })
  combinedChecksum: string; // SHA-256 of the concatenated chunks

  @CreateDateColumn()
  createdAt: Date;
}