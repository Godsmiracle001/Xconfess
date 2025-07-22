import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { PasswordResetService } from './password-reset.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserResponse } from '../user/user.controller';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { CryptoUtil } from '../common/crypto.util';

interface JwtPayload {
  email: string;
  sub: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private passwordResetService: PasswordResetService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserResponse | null> {
    const user = await this.userService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.is_active) {
        throw new UnauthorizedException('Account is deactivated. Please reactivate your account to continue.');
      }
      // Decrypt email for login response
      const decryptedEmail = CryptoUtil.decrypt(user.emailEncrypted, user.emailIv, user.emailTag);
      const { password: _, emailEncrypted, emailIv, emailTag, emailHash, ...result } = user;
      return { ...result, email: decryptedEmail };
    }
    return null;
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; user: UserResponse }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = {
      email: user.email,
      sub: user.id.toString(),
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
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

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      // Find and validate the reset token
      const passwordReset = await this.passwordResetService.findValidToken(token);
      if (!passwordReset) {
        this.logger.warn(`Invalid or expired reset token attempted`, { token });
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Update the user's password
      await this.userService.updatePassword(passwordReset.userId, newPassword);

      // Mark the token as used
      await this.passwordResetService.markTokenAsUsed(passwordReset.id);

      this.logger.log(`Password reset successful`, {
        userId: passwordReset.userId,
        tokenId: passwordReset.id,
      });

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Password reset failed: ${errorMessage}`, { token, error: errorMessage });
      throw new BadRequestException('Failed to reset password');
    }
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    try {
      // Validate that at least one identifier is provided
      if (!ForgotPasswordDto.validate(forgotPasswordDto)) {
        throw new BadRequestException('Either email or userId must be provided');
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
        this.logger.log(`Password reset requested for user ID: ${forgotPasswordDto.userId}`, {
          userId: forgotPasswordDto.userId,
          ipAddress,
        });
      }

      if (!user) {
        // For security, we don't reveal whether the user exists or not
        this.logger.warn(`Password reset attempted for non-existent user`, {
          email: forgotPasswordDto.email,
          userId: forgotPasswordDto.userId,
          ipAddress,
        });
        return { message: 'If the user exists, a password reset email has been sent.' };
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
        userId: user.id,
        email: user.email,
        ipAddress,
      });

      return { message: 'If the user exists, a password reset email has been sent.' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Forgot password process failed: ${errorMessage}`, {
        email: forgotPasswordDto.email,
        userId: forgotPasswordDto.userId,
        ipAddress,
        error: errorMessage,
      });

      // Don't expose internal errors to the user
      return { message: 'If the user exists, a password reset email has been sent.' };
    }
  }
}
