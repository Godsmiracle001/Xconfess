import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/user.service';
import { Logger } from '@nestjs/common';
import { UserRole } from '../../user/entities/user.entity';

@WebSocketGateway({
  namespace: 'admin',
  cors: { origin: '*' },
})
export class AdminGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AdminGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload: any = this.jwtService.verify(token);
      const userId = Number(payload?.sub ?? payload?.userId);
      if (!Number.isFinite(userId)) {
        client.disconnect(true);
        return;
      }

      const user = await this.userService.findById(userId);
      if (user?.role !== UserRole.ADMIN) {
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      this.logger.log(`Admin connected: ${userId} (${client.id})`);
    } catch (e) {
      this.logger.warn(
        `Admin socket auth failed (${client.id}): ${e instanceof Error ? e.message : 'unknown'}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(
      `Admin disconnected: ${client.data?.userId ?? 'unknown'} (${client.id})`,
    );
  }

  emitNewReport(payload: any) {
    this.server.emit('new-report', payload);
  }
}
