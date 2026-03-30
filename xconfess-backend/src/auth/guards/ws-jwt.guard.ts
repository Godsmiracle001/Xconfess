import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { UserService } from '../../user/user.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn({
        event: 'WS_AUTH_FAILURE',
        reason: 'NO_TOKEN_PROVIDED',
        socketId: client.id,
        msg: 'No authentication token provided on socket handshake',
      });
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload: any = await this.jwtService.verifyAsync(token);

      // Attach useful user info to the socket for downstream handlers
      client.data = client.data || {};
      client.data.userId = payload.sub;
      client.data.username = payload.username;

      // Try to fetch user (optional) to populate role or other fields
      try {
        const user = await this.userService.findById(Number(payload.sub));
        if (user) {
          client.data.user = {
            id: user.id,
            username: user.username,
            role: user.role,
            is_active: user.is_active,
          };
        }
      } catch (err) {
        // non-fatal: log and continue with minimal payload
        this.logger.warn({
          event: 'WS_AUTH_USER_FETCH_ERROR',
          reason: 'USER_MAPPING_FAILED',
          socketId: client.id,
          userId: payload.sub,
          msg: `Failed to fetch user for WS auth: ${err instanceof Error ? err.message : err}`,
        });
      }

      return true;
    } catch (err) {
      this.logger.warn({
        event: 'WS_AUTH_FAILURE',
        reason: 'INVALID_TOKEN',
        socketId: client.id,
        error: err instanceof Error ? err.message : String(err),
        msg: 'Invalid or expired WS token',
      });
      throw new UnauthorizedException(
        'Invalid or expired authentication token',
      );
    }
  }

  private extractToken(client: Socket): string | null {
    // 1) Prefer handshake.auth.token (socket.io client can send via auth)
    const auth = client.handshake?.auth as any;
    if (auth && typeof auth.token === 'string' && auth.token.trim()) {
      return auth.token.trim();
    }

    // 2) Authorization header (Bearer token)
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length).trim();
    }

    // 3) Cookies: look for common cookie names like 'token' or 'jwt' or 'access_token'
    const cookieHeader = client.handshake?.headers?.cookie;
    if (cookieHeader) {
      const pairs = cookieHeader.split(';').map((p) => p.trim());
      for (const pair of pairs) {
        const [key, ...rest] = pair.split('=');
        const value = rest.join('=');
        if (!key || !value) continue;
        const k = key.trim();
        if (['token', 'jwt', 'access_token'].includes(k)) {
          return decodeURIComponent(value.trim());
        }
      }
    }

    return null;
  }
}

export default WsJwtGuard;
