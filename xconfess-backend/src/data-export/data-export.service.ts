// src/data-export/data-export.service.ts
import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { AnonymousConfession } from '../confession/entities/confession.entity';
import { Comment } from '../comment/entities/comment.entity';
import { Message } from '../messages/entities/message.entity';
import { Reaction } from '../reaction/entities/reaction.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ExportRequest } from './entities/export-request.entity';
import { AuditLogService } from '../audit-log/audit-log.service';

export type ExportHistoryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'EXPIRED';

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AnonymousConfession)
    private confessionRepository: Repository<AnonymousConfession>,
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
    @InjectQueue('export-queue') private exportQueue: Queue,
    private readonly configService: ConfigService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async requestExport(userId: string) {
    // 1. Rate Limit Check: Find any request created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRequest = await this.exportRepository.findOne({
      where: {
        userId,
        createdAt: MoreThan(sevenDaysAgo),
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
      requestId: request.id,
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

    return `${baseUrl}/api/data-export/download/${requestId}?userId=${userId}&expires=${expires}&signature=${signature}`;
  }

  async getExportFile(requestId: string, userId: string) {
    const exportRecord = await this.exportRepository.findOne({
      where: { id: requestId, userId },
      select: ['fileData', 'status'],
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

  private isDownloadStillValid(
    request: Pick<ExportRequest, 'status' | 'createdAt'>,
  ): boolean {
    if (request.status !== 'READY') {
      return false;
    }

    return Date.now() <= this.getExpiryTimestamp(request.createdAt);
  }

  private toHistoryItem(
    request: Pick<ExportRequest, 'id' | 'status' | 'createdAt' | 'userId'>,
  ): ExportHistoryItem {
    const expiresAt =
      request.status === 'READY'
        ? this.getExpiryTimestamp(request.createdAt)
        : null;
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
      downloadUrl: canRedownload
        ? this.generateSignedDownloadUrl(request.id, request.userId)
        : null,
    };
  }

  async getExportHistory(
    userId: string,
    limit = 20,
  ): Promise<ExportHistoryItem[]> {
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

  async getRedownloadLink(
    requestId: string,
    userId: string,
  ): Promise<{ downloadUrl: string }> {
    const request = await this.exportRepository.findOne({
      where: { id: requestId, userId },
      select: ['id', 'status', 'createdAt', 'userId'],
    });

    if (!request || !this.isDownloadStillValid(request)) {
      throw new BadRequestException(
        'Secure download link is no longer available. Request a new export.',
      );
    }

    return {
      downloadUrl: this.generateSignedDownloadUrl(request.id, request.userId),
    };
  }

  async compileUserData(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: parseInt(userId) },
    });

    const isUserDeactivated = user && !user.is_active;

    const confessions = await this.confessionRepository.find({
      where: { anonymousUser: { id: parseInt(userId) } },
      relations: ['anonymousUser'],
    });

    const messages = await this.messageRepository.find({
      where: { sender: { id: parseInt(userId) } },
      relations: ['sender', 'confession'],
    });

    const reactions = await this.reactionRepository.find({
      where: { user: { id: parseInt(userId) } },
      relations: ['user', 'confession'],
    });

    const comments = await this.commentRepository.find({
      where: { authorId: parseInt(userId) },
    });

    const redactConfession = (confession: any): any => {
      if (confession.isDeleted) {
        return {
          id: confession.id,
          isDeleted: true,
          deletedAt: confession.deletedAt,
          message: '[deleted by user]',
          gender: null,
          createdAt: confession.createdAt,
        };
      }
      if (isUserDeactivated) {
        return {
          ...confession,
          author: '[deactivated user]',
          authorId: null,
          message: '[content hidden - account deactivated]',
        };
      }
      return {
        ...confession,
        author: confession.anonymousUser?.username || '[anonymous]',
        authorId: confession.anonymousUser?.id,
      };
    };

    const redactMessage = (message: any): any => {
      if (message.confession?.isDeleted) {
        return {
          ...message,
          content: '[confession deleted]',
          confessionId: message.confessionId,
        };
      }
      if (isUserDeactivated) {
        return {
          ...message,
          content: '[content hidden - account deactivated]',
          sender: '[deactivated user]',
        };
      }
      return { ...message, sender: message.sender?.username || '[anonymous]' };
    };

    const redactReaction = (reaction: any): any => {
      if (reaction.confession?.isDeleted) {
        return {
          ...reaction,
          type: '[redacted]',
          confessionId: reaction.confessionId,
        };
      }
      if (isUserDeactivated) {
        return { ...reaction, user: '[deactivated user]', userId: null };
      }
      return {
        ...reaction,
        user: reaction.user?.username || '[anonymous]',
        userId: reaction.user?.id,
      };
    };

    const redactComment = (comment: any): any => {
      if (comment.isDeleted) {
        return {
          id: comment.id,
          isDeleted: true,
          content: '[deleted]',
          author: '[redacted]',
          createdAt: comment.createdAt,
        };
      }
      if (isUserDeactivated) {
        return {
          ...comment,
          author: '[deactivated user]',
          authorId: null,
          content: '[content hidden - account deactivated]',
        };
      }
      return { ...comment, author: comment.author || '[anonymous]' };
    };

    return {
      userId,
      isDeactivated: isUserDeactivated,
      exportDate: new Date().toISOString(),
      confessions: confessions.map(redactConfession),
      messages: messages.map(redactMessage),
      reactions: reactions.map(redactReaction),
      comments: comments.map(redactComment),
    };
  }

  convertToCsv(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((obj) => Object.values(obj).join(',')).join('\n');
    return `${headers}\n${rows}`;
  }
}
