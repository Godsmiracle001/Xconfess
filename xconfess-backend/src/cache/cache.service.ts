import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheManager.get<T>(key);
      if (cached) {
        this.logger.debug(`Cache HIT for key: ${key}`);
      } else {
        this.logger.debug(`Cache MISS for key: ${key}`);
      }
      return cached || null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(
        `Cache SET for key: ${key} (TTL: ${ttl || 'default'}s)`,
      );
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL for key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const manager = this.cacheManager as any;
      const store = manager.store || (manager.stores && manager.stores[0]);
      if (store && store.keys) {
        const keys = await store.keys(`${pattern}*`);
        if (keys && keys.length > 0) {
          await Promise.all(
            keys.map((key: string) => this.cacheManager.del(key)),
          );
          this.logger.debug(
            `Cache DEL pattern: ${pattern}* (${keys.length} keys)`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Invalidates all keys matching a given prefix and emits a structured log
   * entry so cache churn can be observed (e.g. by a log aggregator).
   *
   * @param prefix - The key prefix to match (e.g. "analytics:trending").
   *                 A trailing wildcard is appended automatically.
   * @param reason - Human-readable reason for the invalidation, used only
   *                 for observability logging.
   * @returns The number of keys that were evicted.
   */
  async invalidateSegment(prefix: string, reason: string): Promise<number> {
    const startMs = Date.now();
    try {
      const manager = this.cacheManager as any;
      const store = manager.store || (manager.stores && manager.stores[0]);
      if (store && typeof store.keys === 'function') {
        const keys: string[] = await store.keys(`${prefix}*`);
        if (keys.length > 0) {
          await Promise.all(keys.map((key) => this.cacheManager.del(key)));
          this.logger.log(
            `Cache segment invalidated: prefix="${prefix}*", evicted=${keys.length}, reason="${reason}", elapsed=${Date.now() - startMs}ms`,
          );
          return keys.length;
        }
        this.logger.debug(
          `Cache segment invalidate noop: prefix="${prefix}*", reason="${reason}" (no matching keys)`,
        );
        return 0;
      }
      this.logger.warn(
        `Cache store does not support key enumeration; segment invalidation skipped for prefix="${prefix}"`,
      );
      return 0;
    } catch (error) {
      this.logger.error(
        `Cache invalidateSegment error for prefix "${prefix}" (reason="${reason}"):`,
        error,
      );
      return 0;
    }
  }

  async reset(): Promise<void> {
    try {
      const manager = this.cacheManager as any;
      if (typeof manager.reset === 'function') {
        await manager.reset();
      } else if (typeof manager.clear === 'function') {
        await manager.clear();
      }
      this.logger.warn('Cache RESET: All keys deleted');
    } catch (error) {
      this.logger.error('Cache reset error:', error);
    }
  }

  buildKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }
}
