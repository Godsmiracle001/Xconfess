// src/data-export/data-export.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ExportRequest } from './entities/export-request.entity';

@Injectable()
export class DataExportService {
  constructor(
    @InjectRepository(ExportRequest)
    private exportRepository: Repository<ExportRequest>,
    @InjectQueue('export-queue') private exportQueue: Queue,
    private readonly configService: ConfigService,
  ) { }

  async requestExport(userId: string) {
    // 1. Rate Limit Check: Find any request created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRequest = await this.exportRepository.findOne({
      where: {
        userId,
        createdAt: MoreThan(sevenDaysAgo)
      },
    });

    if (recentRequest) {
      throw new BadRequestException('Export allowed once every 7 days.');
    }

    // 2. Create record
    const request = this.exportRepository.create({ userId, status: 'PENDING' });
    await this.exportRepository.save(request);

    // 3. Kick off Bull queue
    await this.exportQueue.add('process-export', {
      userId,
      requestId: request.id
    });

    return { requestId: request.id, status: 'PENDING' };
  }


  generateSignedDownloadUrl(requestId: string, userId: string): string {
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
    const secret = this.configService.get<string>('app.appSecret', '');

    // Create a hash of the payload
    const dataToSign = `${requestId}:${userId}:${expires}`;
    const signature = crypto
      .createHmac('sha256', secret || 'APP_SECRET_NOT_SET')
      .update(dataToSign)
      .digest('hex');

    const baseUrl = this.configService.get<string>('app.backendUrl', '');
    return `${baseUrl}/api/data-export/download/${requestId}?userId=${userId}&expires=${expires}&signature=${signature}`;
  }

  async getExportFile(requestId: string, userId: string) {
    return this.exportRepository.findOne({
      where: { id: requestId, userId },
      select: ['fileData', 'status'],
    });
  }

  async compileUserData(userId: string): Promise<any> {
    return {
      userId,
      confessions: [],
      messages: [],
      reactions: [],
    };
  }

  convertToCsv(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    return `${headers}\n${rows}`;
  }

}