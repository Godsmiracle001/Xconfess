import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  limit: number;
  window: number; // in seconds
}

export const RateLimit = (limit: number, window: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, window });
