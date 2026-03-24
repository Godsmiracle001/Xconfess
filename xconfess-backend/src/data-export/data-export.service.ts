// src/data-export/data-export.service.ts
import { Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ExportRequest } from './entities/export-request.entity';
import { ExportChunk } from './entities/export-chunk.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

export type ExportHistoryStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'EXPIRED';

export interface ExportHistoryItem {
  id: string;
  status: ExportHistoryStatus;
  createdAt: Date;
  expiresAt: number | null;
  canRedownload: boolean;
  canRequestNewLink: boolean;
  downloadUrl: string | null;
}

@Injectable()
export class DataExportService {
  constructor(
    @InjectRepository(ExportRequest)
    private exportRepository: Repository<ExportRequest>,
    @InjectRepository(ExportChunk)
    private chunkRepository: Repository<ExportChunk>,
    @InjectQueue('export-queue') private exportQueue: Queue,
    private readonly configService: ConfigService,
    @Optional() private readonly auditLogService?: AuditLogService,
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

    await this.auditLogService?.logExportLifecycleEvent({
      action: 'request_created',
      actorType: 'user',
      actorId: userId,
      requestId: request.id,
      exportId: request.id,
      metadata: {
        status: request.status,
      },
    });

    // 3. Kick off Bull queue
    await this.exportQueue.add('process-export', {
      userId,
      requestId: request.id
    });

    return { requestId: request.id, status: 'PENDING' };
  }


  generateSignedDownloadUrl(requestId: string, userId: string, chunkIndex?: number): string {
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
    const secret = this.configService.get<string>('app.appSecret', '');

    // Create a hash of the payload
    const dataToSign = chunkIndex !== undefined
      ? `${requestId}:${userId}:${chunkIndex}:${expires}`
      : `${requestId}:${userId}:${expires}`;

    const signature = crypto
      .createHmac('sha256', secret || 'APP_SECRET_NOT_SET')
      .update(dataToSign)
      .digest('hex');

    const baseUrl = this.configService.get<string>('app.backendUrl', '');

    void this.auditLogService
      ?.logExportLifecycleEvent({
        action: 'link_refreshed',
        actorType: 'user',
        actorId: userId,
        requestId,
        exportId: requestId,
        metadata: {
          expiresAt: new Date(expires).toISOString(),
        },
      })
      .catch(() => undefined);

    const chunkParam = chunkIndex !== undefined ? `&chunk=${chunkIndex}` : '';
    return `${baseUrl}/api/data-export/download/${requestId}?userId=${userId}&expires=${expires}&signature=${signature}${chunkParam}`;
  }

  async getExportFile(requestId: string, userId: string) {
    const exportRecord = await this.exportRepository.findOne({
      where: { id: requestId, userId },
      select: ['fileData', 'status', 'isChunked', 'chunkCount', 'totalSize', 'combinedChecksum'],
    });

    if (exportRecord?.fileData) {
      await this.auditLogService?.logExportLifecycleEvent({
        action: 'downloaded',
        actorType: 'user',
        actorId: userId,
        requestId,
        exportId: requestId,
        metadata: {
          status: exportRecord.status,
        },
      });
    }

    return exportRecord;
  }

  async getExportChunk(requestId: string, userId: string, chunkIndex: number) {
    // First verify ownership of the request
    const request = await this.exportRepository.findOne({
      where: { id: requestId, userId },
    });

    if (!request) {
      throw new NotFoundException('Export request not found or unauthorized');
    }

    return this.chunkRepository.findOne({
      where: { exportRequestId: requestId, chunkIndex },
    });
  }

  async markExportGenerated(
    requestId: string,
    userId: string,
    fileData: Buffer,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.exportRepository.update(requestId, {
      fileData,
      status: 'READY',
    });

    await this.auditLogService?.logExportLifecycleEvent({
      action: 'generation_completed',
      actorType: 'system',
      actorId: 'export-queue',
      requestId,
      exportId: requestId,
      metadata: {
        userId,
        status: 'READY',
        ...(metadata || {}),
      },
    });
  }

  private getExpiryTimestamp(createdAt: Date): number {
    return new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
  }

  private isDownloadStillValid(request: Pick<ExportRequest, 'status' | 'createdAt'>): boolean {
    if (request.status !== 'READY') {
      return false;
    }

    return Date.now() <= this.getExpiryTimestamp(request.createdAt);
  }

  private toHistoryItem(request: Pick<ExportRequest, 'id' | 'status' | 'createdAt' | 'userId'>): ExportHistoryItem {
    const expiresAt = request.status === 'READY' ? this.getExpiryTimestamp(request.createdAt) : null;
    const canRedownload = this.isDownloadStillValid(request);
    const normalizedStatus: ExportHistoryStatus =
      request.status === 'READY' && !canRedownload
        ? 'EXPIRED'
        : (request.status as ExportHistoryStatus);

    return {
      id: request.id,
      status: normalizedStatus,
      createdAt: request.createdAt,
      expiresAt,
      canRedownload,
      canRequestNewLink: normalizedStatus === 'EXPIRED',
      downloadUrl: canRedownload ? this.generateSignedDownloadUrl(request.id, request.userId) : null,
    };
  }

  async getExportHistory(userId: string, limit = 20): Promise<ExportHistoryItem[]> {
    const requests = await this.exportRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'status', 'createdAt', 'userId'],
    });

    return requests.map((request) => this.toHistoryItem(request));
  }

  async getLatestExport(userId: string): Promise<ExportHistoryItem | null> {
    const latestRequest = await this.exportRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'status', 'createdAt', 'userId'],
    });

    return latestRequest ? this.toHistoryItem(latestRequest) : null;
  }

  async getRedownloadLink(requestId: string, userId: string): Promise<{ downloadUrl: string }> {
    const request = await this.exportRepository.findOne({
      where: { id: requestId, userId },
      select: ['id', 'status', 'createdAt', 'userId'],
    });

    if (!request || !this.isDownloadStillValid(request)) {
      throw new BadRequestException('Secure download link is no longer available. Request a new export.');
    }

    return { downloadUrl: this.generateSignedDownloadUrl(request.id, request.userId) };
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
