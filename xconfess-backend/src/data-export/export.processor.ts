import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as archiver from 'archiver';
import * as crypto from 'crypto';
import { Writable } from 'stream';
import { ExportRequest } from './entities/export-request.entity';
import { ExportChunk } from './entities/export-chunk.entity';
import { User } from '../user/entities/user.entity';
import { DataExportService } from './data-export.service';
import { EmailService } from '../email/email.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Processor('export-queue')
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);
  private readonly CHUNK_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB per chunk

  constructor(
    @InjectRepository(ExportRequest)
    private exportRepository: Repository<ExportRequest>,
    @InjectRepository(ExportChunk)
    private chunkRepository: Repository<ExportChunk>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataExportService: DataExportService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) { }

  @Process('process-export')
  async handleExport(job: Job<{ userId: string; requestId: string }>) {
    const { userId, requestId } = job.data;

    try {
      this.logger.log(`Starting chunked export for user ${userId}...`);

      const data = await this.dataExportService.compileUserData(userId);
      const result = await this.generateChunkedZip(requestId, data);

      await this.exportRepository.update(requestId, {
        status: 'READY',
        isChunked: true,
        chunkCount: result.chunkCount,
        totalSize: result.totalSize.toString(),
        combinedChecksum: result.combinedChecksum,
      });

      const user = await this.userRepository.findOneBy({ id: parseInt(userId) });
      if (user && user.emailEncrypted) {
        const settingsUrl = `${this.configService.get<string>('app.frontendUrl', 'http://localhost:3000')}/settings/data-export`;
        await this.emailService.sendWelcomeEmail(user.emailEncrypted, user.username);
      }

      this.logger.log(`Chunked export ${requestId} completed with ${result.chunkCount} chunks.`);

    } catch (error) {
      this.logger.error(`Export ${requestId} failed: ${error.message}`);
      await this.exportRepository.update(requestId, { status: 'FAILED' });
    }
  }

  private async generateChunkedZip(
    requestId: string,
    data: any,
  ): Promise<{ chunkCount: number; totalSize: number; combinedChecksum: string }> {
    return new Promise((resolve, reject) => {
      const archive = (archiver as any)('zip', { zlib: { level: 9 } });
      const combinedHash = crypto.createHash('sha256');
      let chunkCount = 0;
      let totalSize = 0;
      let currentChunkBuffer: Buffer[] = [];
      let currentChunkSize = 0;

      const saveChunk = async (buffer: Buffer, index: number) => {
        const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
        await this.chunkRepository.save({
          exportRequestId: requestId,
          chunkIndex: index,
          fileData: buffer,
          chunkSize: buffer.length,
          checksum,
        });
      };

      const chunkProcessor = new Writable({
        write: async (chunk, encoding, callback) => {
          try {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding as BufferEncoding);
            combinedHash.update(buf);
            totalSize += buf.length;

            currentChunkBuffer.push(buf);
            currentChunkSize += buf.length;

            if (currentChunkSize >= this.CHUNK_SIZE_LIMIT) {
              const fullBuffer = Buffer.concat(currentChunkBuffer);
              await saveChunk(fullBuffer, chunkCount++);
              currentChunkBuffer = [];
              currentChunkSize = 0;
            }
            callback();
          } catch (err) {
            callback(err as Error);
          }
        },
        final: async (callback) => {
          try {
            if (currentChunkBuffer.length > 0) {
              const fullBuffer = Buffer.concat(currentChunkBuffer);
              await saveChunk(fullBuffer, chunkCount++);
            }
            callback();
          } catch (err) {
            callback(err as Error);
          }
        },
      });

      archive.on('error', (err) => reject(err));
      chunkProcessor.on('error', (err) => reject(err));
      chunkProcessor.on('finish', () => {
        resolve({
          chunkCount,
          totalSize,
          combinedChecksum: combinedHash.digest('hex'),
        });
      });

      archive.pipe(chunkProcessor);

      archive.append(JSON.stringify(data, null, 2), { name: 'complete_data.json' });
      if (data.confessions) {
        const csvContent = this.dataExportService.convertToCsv(data.confessions);
        archive.append(csvContent, { name: 'confessions.csv' });
      }

      archive.finalize();
    });
  }
}
