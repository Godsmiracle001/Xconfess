import { maskUserId } from '../utils/mask-user-id';
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  GoneException,
  UnprocessableEntityException,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { PasswordResetService } from './password-reset.service';
import { AnonymousUserService } from '../user/anonymous-user.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { UserResponse } from '../user/user.controller';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { CryptoUtil } from '../common/crypto.util';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserRole } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private passwordResetService: PasswordResetService,
    private anonymousUserService: AnonymousUserService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponse | null> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.is_active) {
        throw new UnauthorizedException(
          'Account is deactivated. Please reactivate your account to continue.',
        );
      }
      const decryptedEmail = CryptoUtil.decrypt(
        user.emailEncrypted,
        user.emailIv,
        user.emailTag,
      );
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        email: decryptedEmail,
        resetPasswordToken: user.resetPasswordToken,
        resetPasswordExpires: user.resetPasswordExpires,
        notificationPreferences: user.notificationPreferences || {},
        privacy: {
          isDiscoverable: user.isDiscoverable(),
          canReceiveReplies: user.canReceiveReplies(),
          showReactions: user.shouldShowReactions(),
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }
    return null;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{
    access_token: string;
    user: UserResponse;
    anonymousUserId: string;
  }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Create a new AnonymousUser (or reuse per 24h)
    const anonymousUser =
      await this.anonymousUserService.getOrCreateForUserSession(user.id);
    const role = user.role || UserRole.USER;
    const scopes = role === UserRole.ADMIN ? ['stellar:invoke-contract'] : [];
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id, // Keep as number for consistency
      username: user.username,
      role,
      scopes,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
      anonymousUserId: anonymousUser.id,
    };
  }

  async generateResetPasswordToken(email: string): Promise<string> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');

    // Set token expiration to 1 hour from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store the token in the database
    await this.userService.setResetPasswordToken(user.id, token, expiresAt);

    return token;
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const { reset, reason } =
        await this.passwordResetService.consumeValidToken(token);

      if (!reset) {
        const tokenPrefix =
          token.length <= 8 ? '[redacted]' : `${token.slice(0, 8)}...`;
        this.logger.warn(`Reset token rejected`, { tokenPrefix, reason });

        switch (reason) {
          case 'invalid':
            throw new BadRequestException('Invalid reset token');
          case 'expired':
            throw new UnprocessableEntityException('Reset token expired');
          case 'reused':
            throw new GoneException('Reset token already used');
          default:
            throw new BadRequestException('Invalid reset token');
        }
      }

      // Atomic token consumption already marked the token as used.
      await this.userService.updatePassword(reset.userId, newPassword);

      this.logger.log(`Password reset successful`, {
        maskedUserId: maskUserId(reset.userId),
        tokenId: reset.id,
      });

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const err = error instanceof Error ? error : new Error(String(error));
      const tokenPrefix =
        token.length <= 8 ? '[redacted]' : `${token.slice(0, 8)}...`;
      this.logger.error(
        `Password reset failed (tokenPrefix=${tokenPrefix}): ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to reset password');
    }
  }

  async validateUserById(userId: number): Promise<UserResponse | null> {
    const user = await this.userService.findById(userId);
    if (user && user.is_active) {
      const decryptedEmail = CryptoUtil.decrypt(
        user.emailEncrypted,
        user.emailIv,
        user.emailTag,
      );
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        is_active: user.is_active,
        email: decryptedEmail,
        resetPasswordToken: user.resetPasswordToken,
        resetPasswordExpires: user.resetPasswordExpires,
        notificationPreferences: user.notificationPreferences || {},
        privacy: {
          isDiscoverable: user.isDiscoverable(),
          canReceiveReplies: user.canReceiveReplies(),
          showReactions: user.shouldShowReactions(),
        },
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }
    return null;
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    try {
      // Validate that at least one identifier is provided
      if (!ForgotPasswordDto.validate(forgotPasswordDto)) {
        throw new BadRequestException(
          'Either email or userId must be provided',
        );
      }

      let user;

      // Find user by email or userId
      if (forgotPasswordDto.email) {
        user = await this.userService.findByEmail(forgotPasswordDto.email);
        this.logger.log(`Password reset requested for email: [PROTECTED]`, {
          email: '[PROTECTED]',
          ipAddress,
        });
      } else if (forgotPasswordDto.userId) {
        user = await this.userService.findById(forgotPasswordDto.userId);
        this.logger.log(
          `Password reset requested for masked user ID: ${maskUserId(forgotPasswordDto.userId)}`,
          {
            maskedUserId: maskUserId(forgotPasswordDto.userId),
            ipAddress,
          },
        );
      }

      if (!user) {
        // For security, we don't reveal whether the user exists or not
        this.logger.warn(`Password reset attempted for non-existent user`, {
          maskedUserId: forgotPasswordDto.userId
            ? maskUserId(forgotPasswordDto.userId)
            : undefined,
          ipAddress,
        });
        return {
          message: 'If the user exists, a password reset email has been sent.',
        };
      }

      // Invalidate any existing tokens for this user
      await this.passwordResetService.invalidateUserTokens(user.id);

      // Generate new reset token
      const token = await this.passwordResetService.createResetToken(
        user.id,
        ipAddress,
        userAgent,
      );

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(
        CryptoUtil.decrypt(user.emailEncrypted, user.emailIv, user.emailTag),
        token,
        user.username,
      );

      this.logger.log(`Password reset email sent successfully`, {
        maskedUserId: maskUserId(user.id),
        ipAddress,
        userAgent,
      });

      return {
        message: 'If the user exists, a password reset email has been sent.',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Forgot password process failed: ${errorMessage}`, {
        maskedUserId: forgotPasswordDto.userId
          ? maskUserId(forgotPasswordDto.userId)
          : undefined,
        ipAddress,
        error: errorMessage,
      });

      // Don't expose internal errors to the user
      return {
        message: 'If the user exists, a password reset email has been sent.',
      };
    }
  }
}
