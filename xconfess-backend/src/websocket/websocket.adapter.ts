import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext } from '@nestjs/common';

export class WebSocketAdapter extends IoAdapter {
  constructor(
    private app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const corsOrigin = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    
    const serverOptions: ServerOptions = {
      ...options,
      cors: {
        origin: corsOrigin,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      // Connection pooling and performance settings
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
      upgradeTimeout: 10000, // 10 seconds
      maxHttpBufferSize: 1e6, // 1 MB
      // Transports in order of preference
      transports: ['websocket', 'polling'],
      // Allow upgrades from polling to websocket
      allowUpgrades: true,
      // Compression
      perMessageDeflate: {
        threshold: 1024, // Only compress messages larger than 1KB
      },
      httpCompression: {
        threshold: 1024,
      },
    };

    const server = super.createIOServer(port, serverOptions);

    // Add connection middleware for authentication and monitoring
    server.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      
      // Optional: Add JWT verification here if you want authenticated WebSocket connections
      // For now, we'll allow all connections and handle auth at the event level
      
      next();
    });

    return server;
  }
}