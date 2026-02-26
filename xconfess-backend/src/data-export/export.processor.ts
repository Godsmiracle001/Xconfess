import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as archiver from 'archiver';
import { ExportRequest } from './entities/export-request.entity';
import { User } from '../user/entities/user.entity';
import { DataExportService } from './data-export.service';
import { EmailService } from '../email/email.service';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Processor('export-queue')
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(
    @InjectRepository(ExportRequest)
    private exportRepository: Repository<ExportRequest>,
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
      this.logger.log(`Starting export for user ${userId}...`);

      // 1. Compile the data (Confessions, Messages, etc.)
      const data = await this.dataExportService.compileUserData(userId);

      // 2. Generate ZIP Buffer
      const buffer = await this.generateZipBuffer(data);

      // 3. Save to Postgres (byte column)
      await this.exportRepository.update(requestId, {
        fileData: buffer,
        status: 'READY'
      });

      // 4. Fetch User Email & Notify
      const user = await this.userRepository.findOneBy({ id: parseInt(userId) });
      if (user && user.emailEncrypted) {
        const settingsUrl = `${this.configService.get<string>('app.frontendUrl', 'http://localhost:3000')}/settings/data-export`;
        await this.emailService.sendWelcomeEmail(user.emailEncrypted, user.username); // Using welcome email as placeholder for notification
      }

      this.logger.log(`Export ${requestId} completed successfully.`);

    } catch (error) {
      this.logger.error(`Export ${requestId} failed: ${error.message}`);
      await this.exportRepository.update(requestId, { status: 'FAILED' });
    }
  }

  private async generateZipBuffer(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = (archiver as any)('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('error', (err) => reject(err));
      archive.on('end', () => resolve(Buffer.concat(chunks)));

      // Add JSON file
      archive.append(JSON.stringify(data, null, 2), { name: 'complete_data.json' });

      // Add CSV version of confessions for better readability
      if (data.confessions) {
        // You can use json2csv here if installed
        const csvContent = this.dataExportService.convertToCsv(data.confessions);
        archive.append(csvContent, { name: 'confessions.csv' });
      }

      archive.finalize();
    });
  }
}