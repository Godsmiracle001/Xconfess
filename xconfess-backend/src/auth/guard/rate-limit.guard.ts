import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  getRateLimitConfig,
  RateLimitConfig,
} from 'src/config/rate-limit.config';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard
  implements CanActivate, OnModuleInit, OnModuleDestroy
{
  private rateLimitStore = new Map<string, RateLimitEntry>();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.config = getRateLimitConfig(configService);
  }

  onModuleInit() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Get client identifier (IP address)
    const clientId = this.getClientId(request);
    const key = `${clientId}:${method}`;

    // Determine rate limit based on HTTP method
    const { limit, window } = this.getRateLimitForMethod(method);

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
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    entry.count++;
    return true;
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
