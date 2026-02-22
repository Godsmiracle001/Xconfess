import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { getRateLimitConfig } from 'src/config/rate-limit.config';
import Redis from 'ioredis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly rateLimitStore = new Map<string, RateLimitEntry>();
  private readonly config;
  private readonly shouldUseRedis: boolean;
  private readonly keyPrefix: string;
  private redisClient: Redis | null = null;
  private redisAvailable = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private configService: ConfigService,
  ) {
    this.config = getRateLimitConfig(configService);
    this.keyPrefix = this.config.keyPrefix;
    this.shouldUseRedis = this.resolveRedisUsage();

    if (this.shouldUseRedis) {
      this.initializeRedisClient();
    }

    // Clean up expired entries every minute for memory backend/fallback
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Get client identifier (IP address)
    const clientId = this.getClientId(request);
    const key = `${clientId}:${method}`;

    // Determine rate limit based on HTTP method
    const { limit, window } = this.getRateLimitForMethod(method);

    if (this.shouldUseRedis && this.redisAvailable && this.redisClient) {
      const allowed = await this.checkRateLimitWithRedis(key, limit, window);
      if (!allowed) {
        return false;
      }
      return true;
    }

    if (this.shouldUseRedis && !this.config.memoryFallback) {
      this.logger.warn(
        'Rate limit redis backend configured but unavailable, blocking request because memory fallback is disabled',
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Rate limit backend unavailable',
          retryAfter: 1,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return this.checkRateLimitInMemory(key, limit, window);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.redisClient) {
      this.redisClient.disconnect();
      this.redisClient = null;
      this.redisAvailable = false;
    }
  }

  private resolveRedisUsage(): boolean {
    if (this.config.storeBackend === 'redis') {
      return true;
    }
    if (this.config.storeBackend === 'memory') {
      return false;
    }
    // auto mode: use redis outside development, memory in development
    return this.configService.get<string>('NODE_ENV', 'development') !== 'development';
  }

  private initializeRedisClient() {
    const redisOptions: ConstructorParameters<typeof Redis>[0] = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      db: this.config.redis.db,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    };

    if (this.config.redis.password) {
      redisOptions.password = this.config.redis.password;
    }
    if (this.config.redis.username) {
      redisOptions.username = this.config.redis.username;
    }
    if (this.config.redis.tls) {
      redisOptions.tls = {};
    }

    this.redisClient = new Redis(redisOptions);

    this.redisClient.on('ready', () => {
      this.redisAvailable = true;
      this.logger.log('Rate limiter connected to Redis backend');
    });

    this.redisClient.on('error', (error) => {
      this.redisAvailable = false;
      this.logger.warn(`Rate limiter Redis error: ${error.message}`);
    });

    this.redisClient.on('end', () => {
      this.redisAvailable = false;
      this.logger.warn('Rate limiter Redis connection ended');
    });

    this.redisClient.connect().catch((error) => {
      this.redisAvailable = false;
      this.logger.warn(`Rate limiter failed to connect to Redis: ${error.message}`);
    });
  }

  private async checkRateLimitWithRedis(
    key: string,
    limit: number,
    window: number,
  ): Promise<boolean> {
    if (!this.redisClient) {
      return this.checkRateLimitInMemory(key, limit, window);
    }

    const redisKey = `${this.keyPrefix}:${key}`;
    try {
      const count = await this.redisClient.incr(redisKey);
      if (count === 1) {
        await this.redisClient.expire(redisKey, window);
      }

      if (count > limit) {
        const ttl = await this.redisClient.ttl(redisKey);
        const retryAfter = ttl > 0 ? ttl : window;
        this.throwRateLimitExceeded(retryAfter);
        return false;
      }

      return true;
    } catch (error) {
      this.redisAvailable = false;

      if (this.config.memoryFallback) {
        this.logger.warn(
          `Rate limiter redis operation failed, using in-memory fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        return this.checkRateLimitInMemory(key, limit, window);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Rate limit backend unavailable',
          retryAfter: 1,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private checkRateLimitInMemory(
    key: string,
    limit: number,
    window: number,
  ): boolean {
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      this.rateLimitStore.set(key, {
        count: 1,
        resetTime: now + window * 1000,
      });
      return true;
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      this.throwRateLimitExceeded(retryAfter);
    }

    // Increment counter
    entry.count++;
    return true;
  }

  private throwRateLimitExceeded(retryAfter: number): never {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests, please try again later',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private getClientId(request: Request): string {
    // Get IP from various possible headers (for proxy support)
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private getRateLimitForMethod(method: string): {
    limit: number;
    window: number;
  } {
    switch (method) {
      case 'POST':
      case 'PUT':
      case 'PATCH':
      case 'DELETE':
        return {
          limit: this.config.postLimit,
          window: this.config.postWindow,
        };
      case 'GET':
      default:
        return {
          limit: this.config.getLimit,
          window: this.config.getWindow,
        };
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}
