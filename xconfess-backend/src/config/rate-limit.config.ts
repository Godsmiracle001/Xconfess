import { registerAs } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

export interface RateLimitConfig {
  postLimit: number;
  postWindow: number;
  getLimit: number;
  getWindow: number;
}

export const getRateLimitConfig = (
  configService: ConfigService,
): RateLimitConfig => ({
  postLimit: configService.get<number>('RATE_LIMIT_POST_MAX', 5),
  postWindow: configService.get<number>('RATE_LIMIT_POST_WINDOW', 60), // seconds
  getLimit: configService.get<number>('RATE_LIMIT_GET_MAX', 50),
  getWindow: configService.get<number>('RATE_LIMIT_GET_WINDOW', 60), // seconds
});

export default registerAs('rateLimit', () => ({
  notification: {
    dedupeTtlSeconds: parseInt(
      process.env.NOTIFICATION_DEDUPE_TTL_SECONDS ?? '60',
      10,
    ),
  },
}));
