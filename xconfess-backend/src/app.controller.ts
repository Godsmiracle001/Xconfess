import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './health/redis.health';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AdminGuard } from './auth/admin.guard';
import { NotificationQueue } from './notification/notification.queue';
// import { RedisHealthIndicator } from './health/redis.health';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private redis: RedisHealthIndicator,
    private readonly notificationQueue: NotificationQueue,
  ) {}

  @Get()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get the welcome message for the API' })
  @ApiResponse({
    status: 200,
    description: 'Returns a greeting message',
    schema: { example: 'Hello, world!' },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  // ✅ NEW HEALTH ENDPOINT
  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Application health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Returns application health status',
  })
  check() {
    return this.health.check([
      async () => ({ app: { status: 'up' } }),
      async () => this.db.pingCheck('database'),
      // async () => this.redis.isHealthy('redis'),
    ]);
  }

  @Get('diagnostics/notifications')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Notification delivery metrics and queue health diagnostics',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns queue depth, DLQ depth, counters, and timer metrics for notification processing',
  })
  async getNotificationDiagnostics() {
    return this.notificationQueue.getDiagnostics();
  }
}
