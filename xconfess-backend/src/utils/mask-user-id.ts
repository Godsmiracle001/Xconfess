// src/utils/user-id-masker.ts
import { createHash } from 'crypto';

/**
 * Masks user IDs for logging to preserve anonymity
 * Uses SHA256 hashing and truncates to 12 characters for readability
 */
export class UserIdMasker {
  private static readonly PREFIX = 'user_';
  private static readonly HASH_LENGTH = 12;

  /**
   * Masks a user ID using SHA256 hashing
   * @param userId - The raw user ID to mask
   * @returns Masked identifier (e.g., "user_a3f9c2d1b5e7")
   */
  static mask(userId: string | number): string {
    if (!userId) {
      return 'user_anonymous';
    }

    const hash = createHash('sha256')
      .update(String(userId))
      .digest('hex')
      .substring(0, this.HASH_LENGTH);

    return `${this.PREFIX}${hash}`;
  }

  /**
   * Masks multiple user IDs
   * @param userIds - Array of user IDs to mask
   * @returns Array of masked identifiers
   */
  static maskMany(userIds: (string | number)[]): string[] {
    return userIds.map((id) => this.mask(id));
  }

  /**
   * Masks user ID in an object (useful for logging objects)
   * @param obj - Object containing userId field
   * @returns New object with masked userId
   */
  static maskObject<T extends Record<string, any>>(
    obj: T,
    idField: string = 'userId',
  ): T {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const masked = { ...obj };
    if (idField in masked) {
      masked[idField] = this.mask(masked[idField]);
    }

    return masked;
  }
}

// Convenience function for quick masking
export const maskUserId = (userId: string | number): string =>
  UserIdMasker.mask(userId);
