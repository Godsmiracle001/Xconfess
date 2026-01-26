// src/services/logger.service.ts
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { UserIdMasker } from 'src/utils/mask-user-id';

@Injectable()
export class AppLogger implements NestLoggerService {
  /**
   * Sanitizes log message by masking any user IDs
   */
  private sanitize(message: any): any {
    if (typeof message === 'string') {
      return message;
    }

    if (typeof message === 'object' && message !== null) {
      return UserIdMasker.maskObject(message);
    }

    return message;
  }

  log(message: any, context?: string) {
    console.log(`[${context || 'App'}]`, this.sanitize(message));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(`[${context || 'App'}]`, this.sanitize(message), trace || '');
  }

  warn(message: any, context?: string) {
    console.warn(`[${context || 'App'}]`, this.sanitize(message));
  }

  debug(message: any, context?: string) {
    console.debug(`[${context || 'App'}]`, this.sanitize(message));
  }

  verbose(message: any, context?: string) {
    console.log(`[VERBOSE][${context || 'App'}]`, this.sanitize(message));
  }

  /**
   * Log with explicit user context (auto-masks)
   */
  logWithUser(message: string, userId: string | number, context?: string) {
    const maskedId = UserIdMasker.mask(userId);
    this.log(`${message} [${maskedId}]`, context);
  }

  /**
   * Log error with user context (auto-masks)
   */
  errorWithUser(
    message: string,
    userId: string | number,
    trace?: string,
    context?: string,
  ) {
    const maskedId = UserIdMasker.mask(userId);
    this.error(`${message} [${maskedId}]`, trace, context);
  }
}
