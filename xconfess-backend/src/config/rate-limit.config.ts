import { ConfigService } from '@nestjs/config';
import { registerAs } from '@nestjs/config';

export type RateLimitStoreBackend = 'memory' | 'redis' | 'auto';

export interface RateLimitConfig {
  postLimit: number;
  postWindow: number;
  getLimit: number;
  getWindow: number;
  storeBackend: RateLimitStoreBackend;
  keyPrefix: string;
  memoryFallback: boolean;
  redis: {
    host: string;
    port: number;
    password?: string;
    username?: string;
    db: number;
    tls: boolean;
  };
}

const parseNumber = (value: string | number | undefined, defaultValue: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return defaultValue;
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (typeof value !== 'string') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return defaultValue;
};

const parseStoreBackend = (value: string | undefined): RateLimitStoreBackend => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'memory' || normalized === 'redis' || normalized === 'auto') {
    return normalized;
  }
  return 'auto';
};

export const getRateLimitConfig = (
  configService: ConfigService,
): RateLimitConfig => {
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const memoryFallbackDefault = nodeEnv === 'development';

  return {
    postLimit: parseNumber(configService.get<string>('RATE_LIMIT_POST_MAX'), 5),
    postWindow: parseNumber(configService.get<string>('RATE_LIMIT_POST_WINDOW'), 60), // seconds
    getLimit: parseNumber(configService.get<string>('RATE_LIMIT_GET_MAX'), 50),
    getWindow: parseNumber(configService.get<string>('RATE_LIMIT_GET_WINDOW'), 60), // seconds
    storeBackend: parseStoreBackend(configService.get<string>('RATE_LIMIT_STORE')),
    keyPrefix: configService.get<string>('RATE_LIMIT_KEY_PREFIX', 'rate_limit'),
    memoryFallback: parseBoolean(
      configService.get<string>('RATE_LIMIT_MEMORY_FALLBACK'),
      memoryFallbackDefault,
    ),
    redis: {
      host: configService.get<string>('RATE_LIMIT_REDIS_HOST')
        || configService.get<string>('REDIS_HOST', 'localhost'),
      port: parseNumber(
        configService.get<string>('RATE_LIMIT_REDIS_PORT')
          || configService.get<string>('REDIS_PORT'),
        6379,
      ),
      password: configService.get<string>('RATE_LIMIT_REDIS_PASSWORD')
        || configService.get<string>('REDIS_PASSWORD'),
      username: configService.get<string>('RATE_LIMIT_REDIS_USERNAME')
        || configService.get<string>('REDIS_USERNAME'),
      db: parseNumber(configService.get<string>('RATE_LIMIT_REDIS_DB'), 0),
      tls: parseBoolean(configService.get<string>('RATE_LIMIT_REDIS_TLS'), false),
    },
  };
};

export default registerAs('rateLimit', () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const memoryFallbackDefault = nodeEnv === 'development';

  return {
    postLimit: parseNumber(process.env.RATE_LIMIT_POST_MAX, 5),
    postWindow: parseNumber(process.env.RATE_LIMIT_POST_WINDOW, 60),
    getLimit: parseNumber(process.env.RATE_LIMIT_GET_MAX, 50),
    getWindow: parseNumber(process.env.RATE_LIMIT_GET_WINDOW, 60),
    storeBackend: parseStoreBackend(process.env.RATE_LIMIT_STORE),
    keyPrefix: process.env.RATE_LIMIT_KEY_PREFIX || 'rate_limit',
    memoryFallback: parseBoolean(
      process.env.RATE_LIMIT_MEMORY_FALLBACK,
      memoryFallbackDefault,
    ),
    redis: {
      host: process.env.RATE_LIMIT_REDIS_HOST || process.env.REDIS_HOST || 'localhost',
      port: parseNumber(process.env.RATE_LIMIT_REDIS_PORT || process.env.REDIS_PORT, 6379),
      password: process.env.RATE_LIMIT_REDIS_PASSWORD || process.env.REDIS_PASSWORD,
      username: process.env.RATE_LIMIT_REDIS_USERNAME || process.env.REDIS_USERNAME,
      db: parseNumber(process.env.RATE_LIMIT_REDIS_DB, 0),
      tls: parseBoolean(process.env.RATE_LIMIT_REDIS_TLS, false),
    },
  };
});
