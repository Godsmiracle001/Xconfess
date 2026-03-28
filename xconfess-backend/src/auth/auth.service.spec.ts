import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { PasswordResetService } from './password-reset.service';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  GoneException,
  InternalServerErrorException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { User, UserRole } from '../user/entities/user.entity';
import { PasswordReset } from './entities/password-reset.entity';
import * as bcrypt from 'bcryptjs';
import { AnonymousUserService } from '../user/anonymous-user.service';
import { CryptoUtil } from '../common/crypto.util';
import { UserResponse } from '../user/user.controller';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let emailService: EmailService;
  let passwordResetService: PasswordResetService;
  let jwtService: JwtService;

  const enc = CryptoUtil.encrypt('test@example.com');

  const mockUser = {
    id: 1,
    username: 'testuser',
    emailEncrypted: enc.encrypted,
    emailIv: enc.iv,
    emailTag: enc.tag,
    emailHash: CryptoUtil.hash('test@example.com'),
    password: 'hashedpassword',
    role: UserRole.USER,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    notificationPreferences: {},
    privacySettings: {
      isDiscoverable: true,
      canReceiveReplies: true,
      showReactions: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    is_active: true,
    isNotificationEnabled: () => true,
    isDiscoverable: () => true,
    canReceiveReplies: () => true,
    shouldShowReactions: () => true,
  } as unknown as User;

  const mockPasswordReset: PasswordReset = {
    id: 1,
    token: 'test-token-123',
    userId: 1,
    user: mockUser,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    used: false,
    usedAt: null,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date(),
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findByResetToken: jest.fn(),
    setResetPasswordToken: jest.fn(),
    updatePassword: jest.fn(),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  const mockPasswordResetService = {
    createResetToken: jest.fn(),
    consumeValidToken: jest.fn(),
    invalidateUserTokens: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockAnonymousUserService = {
    getOrCreateForUserSession: jest.fn().mockResolvedValue({ id: 'anon-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: PasswordResetService,
          useValue: mockPasswordResetService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AnonymousUserService,
          useValue: mockAnonymousUserService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    emailService = module.get<EmailService>(EmailService);
    passwordResetService =
      module.get<PasswordResetService>(PasswordResetService);
    jwtService = module.get<JwtService>(JwtService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('should process forgot password request with email successfully', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetService.invalidateUserTokens.mockResolvedValue(
        undefined,
      );
      mockPasswordResetService.createResetToken.mockResolvedValue(
        'new-token-123',
      );
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(
        { email: 'test@example.com' },
        '192.168.1.1',
        'Mozilla/5.0...',
      );

      expect(mockUserService.findByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(
        mockPasswordResetService.invalidateUserTokens,
      ).toHaveBeenCalledWith(1);
      expect(mockPasswordResetService.createResetToken).toHaveBeenCalledWith(
        1,
        '192.168.1.1',
        'Mozilla/5.0...',
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'new-token-123',
        'testuser',
      );
      expect(result).toEqual({
        message: 'If the user exists, a password reset email has been sent.',
      });
    });

    it('should process forgot password request with userId successfully', async () => {
      mockUserService.findById.mockResolvedValue(mockUser);
      mockPasswordResetService.invalidateUserTokens.mockResolvedValue(
        undefined,
      );
      mockPasswordResetService.createResetToken.mockResolvedValue(
        'new-token-123',
      );
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword(
        { userId: 1 },
        '192.168.1.1',
        'Mozilla/5.0...',
      );

      expect(mockUserService.findById).toHaveBeenCalledWith(1);
      expect(
        mockPasswordResetService.invalidateUserTokens,
      ).toHaveBeenCalledWith(1);
      expect(mockPasswordResetService.createResetToken).toHaveBeenCalledWith(
        1,
        '192.168.1.1',
        'Mozilla/5.0...',
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        'new-token-123',
        'testuser',
      );
      expect(result).toEqual({
        message: 'If the user exists, a password reset email has been sent.',
      });
    });

    it('should return success message for non-existent user (security)', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(result).toEqual({
        message: 'If the user exists, a password reset email has been sent.',
      });
      expect(mockPasswordResetService.createResetToken).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when neither email nor userId provided', async () => {
      await expect(service.forgotPassword({})).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.forgotPassword({})).rejects.toThrow(
        'Either email or userId must be provided',
      );
    });

    it('should handle email service errors gracefully', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetService.invalidateUserTokens.mockResolvedValue(
        undefined,
      );
      mockPasswordResetService.createResetToken.mockResolvedValue(
        'new-token-123',
      );
      mockEmailService.sendPasswordResetEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result).toEqual({
        message: 'If the user exists, a password reset email has been sent.',
      });
    });

    it('should handle token creation errors gracefully', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockPasswordResetService.invalidateUserTokens.mockResolvedValue(
        undefined,
      );
      mockPasswordResetService.createResetToken.mockRejectedValue(
        new Error('Token creation error'),
      );

      const result = await service.forgotPassword({
        email: 'test@example.com',
      });

      expect(result).toEqual({
        message: 'If the user exists, a password reset email has been sent.',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      mockPasswordResetService.consumeValidToken.mockResolvedValue({
        reset: mockPasswordReset,
        reason: 'valid',
      });
      mockUserService.updatePassword.mockResolvedValue(undefined);

      const result = await service.resetPassword(
        'test-token-123',
        'newPassword123',
      );

      expect(mockPasswordResetService.consumeValidToken).toHaveBeenCalledWith(
        'test-token-123',
      );
      expect(mockUserService.updatePassword).toHaveBeenCalledWith(
        1,
        'newPassword123',
      );
      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPasswordResetService.consumeValidToken.mockResolvedValue({
        reset: null,
        reason: 'invalid',
      });

      await expect(
        service.resetPassword('invalid-token', 'newPassword123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.resetPassword('invalid-token', 'newPassword123'),
      ).rejects.toThrow('Invalid reset token');
    });

    it('should throw UnprocessableEntityException for expired token', async () => {
      mockPasswordResetService.consumeValidToken.mockResolvedValue({
        reset: null,
        reason: 'expired',
      });

      await expect(
        service.resetPassword('expired-token', 'newPassword123'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw GoneException for reused token', async () => {
      mockPasswordResetService.consumeValidToken.mockResolvedValue({
        reset: null,
        reason: 'reused',
      });

      await expect(
        service.resetPassword('reused-token', 'newPassword123'),
      ).rejects.toThrow(GoneException);
    });

    it('should rethrow InternalServerErrorException from consumeValidToken', async () => {
      mockPasswordResetService.consumeValidToken.mockRejectedValue(
        new InternalServerErrorException(
          'Password reset is temporarily unavailable',
        ),
      );

      await expect(
        service.resetPassword('test-token-123', 'newPassword123'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should map password update errors to InternalServerErrorException', async () => {
      mockPasswordResetService.consumeValidToken.mockResolvedValue({
        reset: mockPasswordReset,
        reason: 'valid',
      });
      mockUserService.updatePassword.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.resetPassword('test-token-123', 'newPassword123'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.resetPassword('test-token-123', 'newPassword123'),
      ).rejects.toThrow('Failed to reset password');
    });
  });

  describe('validateUser', () => {
    it('should return user without password for valid credentials', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).toEqual({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        notificationPreferences: {},
        privacy: {
          isDiscoverable: true,
          canReceiveReplies: true,
          showReactions: true,
        },
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        is_active: true,
      });
    });

    it('should return null for invalid credentials', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should validate user with correct credentials', async () => {
      const mockUserResponse: UserResponse = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: UserRole.USER,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        notificationPreferences: {},
        privacy: {
          isDiscoverable: true,
          canReceiveReplies: true,
          showReactions: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        is_active: true,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUserResponse);

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('access_token');
      expect(result.user).toEqual(mockUserResponse);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('generateResetPasswordToken', () => {
    it('should generate and store reset token for valid email', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);
      mockUserService.setResetPasswordToken.mockResolvedValue(undefined);

      const result =
        await service.generateResetPasswordToken('test@example.com');

      expect(result).toMatch(/^[a-f0-9]{64}$/);
      expect(mockUserService.setResetPasswordToken).toHaveBeenCalledWith(
        1,
        result,
        expect.any(Date),
      );
    });

    it('should throw BadRequestException for non-existent email', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      await expect(
        service.generateResetPasswordToken('nonexistent@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
