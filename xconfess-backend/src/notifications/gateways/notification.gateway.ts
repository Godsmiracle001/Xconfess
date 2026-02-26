import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from '../../auth/guards/ws-jwt.guard';
import { NotificationService } from '../services/notification.service';

@WebSocketGateway({
  cors: true,
  namespace: '/notifications',
})
@UseGuards(WsJwtGuard)
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socket IDs

  constructor(
    private notificationService: NotificationService,
    private configService: ConfigService,
  ) { }

  afterInit(server: Server) {
    // Configure CORS dynamically from ConfigService
    const frontendUrl = this.configService.get<string>('app.frontendUrl', 'http://localhost:3000');
    server.engine.opts.cors = {
      origin: frontendUrl,
      credentials: true,
    };
    this.logger.log('Notification Gateway initialized');
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId;

    if (!userId) {
      client.disconnect();
      return;
    }

    // Add socket to user's socket set
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.add(client.id);
    }

    this.logger.log(`Client connected: ${client.id} (User: ${userId})`);

    // Join user-specific room
    client.join(`user:${userId}`);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId && this.userSockets.has(userId)) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);

        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('mark-read')
  async handleMarkRead(client: Socket, payload: { notificationId: string }) {
    const userId = client.data.userId;

    try {
      await this.notificationService.markAsRead(payload.notificationId, userId);

      client.emit('notification-read', {
        notificationId: payload.notificationId,
      });
    } catch (error) {
      this.logger.error(`Error marking notification as read:`, error);
      client.emit('error', { message: 'Failed to mark notification as read' });
    }
  }

  @SubscribeMessage('mark-all-read')
  async handleMarkAllRead(client: Socket) {
    const userId = client.data.userId;

    try {
      await this.notificationService.markAllAsRead(userId);

      client.emit('all-notifications-read', {});
    } catch (error) {
      this.logger.error(`Error marking all notifications as read:`, error);
      client.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  }

  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(client: Socket) {
    const userId = client.data.userId;

    try {
      const { unreadCount } = await this.notificationService.getUserNotifications(
        userId,
        { page: 1, limit: 1, unreadOnly: true },
      );

      client.emit('unread-count', { count: unreadCount });
    } catch (error) {
      this.logger.error(`Error getting unread count:`, error);
      client.emit('error', { message: 'Failed to get unread count' });
    }
  }

  // Public method to send notifications to users
  async sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new-notification', notification);

    // Also send updated unread count
    const { unreadCount } = await this.notificationService.getUserNotifications(
      userId,
      { page: 1, limit: 1, unreadOnly: true },
    );

    this.server.to(`user:${userId}`).emit('unread-count', { count: unreadCount });
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }
}