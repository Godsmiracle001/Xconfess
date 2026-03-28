import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { PasswordReset } from './entities/password-reset.entity';
import * as crypto from 'crypto';

export type PasswordResetConsumeReason =
  | 'valid'
  | 'invalid'
  | 'expired'
  | 'reused';

const PASSWORD_RESET_STORAGE_MESSAGE =
  'Password reset is temporarily unavailable';

function tokenPrefix(token: string): string {
  if (!token) return '[empty]';
  return token.length <= 8 ? '[redacted]' : `${token.slice(0, 8)}...`;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordReset)
    private passwordResetRepository: Repository<PasswordReset>,
  ) {}

  async createResetToken(
    userId: number,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    try {
      // Generate a secure random token
      const token = crypto.randomBytes(32).toString('hex');

      // Set expiration to 15 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      // Create password reset record
      const passwordReset = this.passwordResetRepository.create({
        token,
        userId,
        expiresAt,
        ipAddress,
        userAgent,
      });

      await this.passwordResetRepository.save(passwordReset);

      this.logger.log(`Password reset token created for user ID: ${userId}`, {
        userId,
        tokenId: passwordReset.id,
        expiresAt,
        ipAddress,
      });

      return token;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to create reset token for user ID ${userId}: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException(PASSWORD_RESET_STORAGE_MESSAGE);
    }
  }

  async findValidToken(token: string): Promise<PasswordReset | null> {
    try {
      const passwordReset = await this.passwordResetRepository.findOne({
        where: {
          token,
          used: false,
        },
        relations: ['user'],
      });

      if (!passwordReset) {
        this.logger.debug(`No unused token found`, {
          tokenPrefix: tokenPrefix(token),
        });
        return null;
      }

      // Check if token has expired
      if (new Date() > passwordReset.expiresAt) {
        this.logger.debug(`Token expired`, {
          tokenPrefix: tokenPrefix(token),
          tokenId: passwordReset.id,
          expiresAt: passwordReset.expiresAt,
        });
        return null;
      }

      return passwordReset;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error finding token: ${err.message}`, err.stack);
      throw new InternalServerErrorException(PASSWORD_RESET_STORAGE_MESSAGE);
    }
  }

  /**
   * Atomically consumes a reset token if it is valid.
   * This prevents concurrent reuse by marking `used=true` in a single DB update.
   */
  async consumeValidToken(
    token: string,
    now: Date = new Date(),
  ): Promise<{
    reset: PasswordReset | null;
    reason: PasswordResetConsumeReason;
  }> {
    try {
      const existing = await this.passwordResetRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (!existing) return { reset: null, reason: 'invalid' };
      if (existing.used) return { reset: null, reason: 'reused' };
      if (existing.expiresAt <= now) return { reset: null, reason: 'expired' };

      const updateResult = await this.passwordResetRepository.update(
        { token, used: false, expiresAt: MoreThan(now) },
        { used: true, usedAt: now },
      );

      if (!updateResult.affected) {
        return { reset: null, reason: 'reused' };
      }

      const consumed = await this.passwordResetRepository.findOne({
        where: { token },
        relations: ['user'],
      });

      if (!consumed) return { reset: null, reason: 'invalid' };
      return { reset: consumed, reason: 'valid' };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Error consuming reset token (prefix ${tokenPrefix(token)}): ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException(PASSWORD_RESET_STORAGE_MESSAGE);
    }
  }

  async markTokenAsUsed(tokenId: number): Promise<void> {
    try {
      await this.passwordResetRepository.update(tokenId, {
        used: true,
        usedAt: new Date(),
      });

      this.logger.log(`Password reset token marked as used`, {
        tokenId,
        usedAt: new Date(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to mark token as used: ${err.message}`, err.stack);
      throw new InternalServerErrorException(PASSWORD_RESET_STORAGE_MESSAGE);
    }
  }

  async invalidateUserTokens(userId: number): Promise<void> {
    try {
      await this.passwordResetRepository.update(
        { userId, used: false },
        { used: true, usedAt: new Date() },
      );

      this.logger.log(`All tokens invalidated for user ID: ${userId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Failed to invalidate tokens for user ${userId}: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException(PASSWORD_RESET_STORAGE_MESSAGE);
    }
  }

  async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.passwordResetRepository.delete({
        expiresAt: LessThan(now),
      });
      const deletedCount = result.affected || 0;
      this.logger.log(`Cleaned up expired password reset tokens`, {
        deletedCount,
        timestamp: now.toISOString(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to cleanup expired tokens: ${err.message}`, err.stack);
    }
  }
}
