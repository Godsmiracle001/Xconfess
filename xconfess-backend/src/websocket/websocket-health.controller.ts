import { Controller, Get } from '@nestjs/common';
import { ReactionsGateway } from '../reaction/reactions.gateway';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('websocket')
@Controller('websocket')
export class WebSocketHealthController {
  constructor(private readonly reactionsGateway: ReactionsGateway) {}

  @Get('health')
  @ApiOperation({ summary: 'Check WebSocket server health' })
  @ApiResponse({ status: 200, description: 'WebSocket server is healthy' })
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      websocket: {
        enabled: true,
        namespace: '/reactions',
      },
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get WebSocket connection statistics' })
  @ApiResponse({ status: 200, description: 'Returns connection statistics' })
  getStats() {
    const stats = this.reactionsGateway.getConnectionStats();
    return {
      ...stats,
      timestamp: new Date().toISOString(),
    };
  }
}