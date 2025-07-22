import { Injectable, Inject } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class ConfessionViewCacheService {
  /**
   * Checks if the user/IP has viewed recently and marks as viewed if not.
   * Returns true if this is a new view (should increment view count).
   */
  async checkAndMarkView(confessionId: string, userOrIp: string): Promise<boolean> {
    const alreadyViewed = await this.hasViewedRecently(confessionId, userOrIp);
    if (!alreadyViewed) {
      await this.markViewed(confessionId, userOrIp);
      return true;
    }
    return false;
  }
  private readonly VIEW_CACHE_EXPIRY: number;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject('VIEW_CACHE_EXPIRY') cacheExpiry: number = 60 * 60
  ) {
    this.VIEW_CACHE_EXPIRY = cacheExpiry;
  }

  async hasViewedRecently(confessionId: string, userOrIp: string): Promise<boolean> {
    const key = `confession:viewed:${confessionId.replace(/:/g, '_')}:${userOrIp.replace(/:/g, '_')}`;
   try {
     const exists = await this.redis.exists(key);
     return exists === 1;
   } catch (error) {
     console.error('Redis error in hasViewedRecently:', error);
     return false; // Fail open - allow view count increment on Redis errors
   }
  }

  async markViewed(confessionId: string, userOrIp: string): Promise<void> {
    const key = `confession:viewed:${confessionId.replace(/:/g, '_')}:${userOrIp.replace(/:/g, '_')}`;
    await this.redis.set(key, '1', 'EX', 60 * 60); // 1 hour expiry
  }
}
