import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { User } from './entities/user.entity';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { CryptoUtil } from '../common/crypto.util';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let authService: AuthService;

  const emailPlain = 'test@example.com';
  const emailEnc = CryptoUtil.encrypt(emailPlain);

  const mockUser: User = {
    id: 1,
    username: 'testuser',
    emailEncrypted: emailEnc.encrypted,
    emailIv: emailEnc.iv,
    emailTag: emailEnc.tag,
    emailHash: CryptoUtil.hash(emailPlain),
    password: 'hashedpassword',
    resetPasswordToken: null,
    resetPasswordExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isAdmin: false,
    is_active: true,
  };

  const mockUserService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...rest } = mockUser as any;
      const expectedResult = { ...rest, email: emailPlain };
      const result = await controller.getProfile(mockUser);
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Profile error');
      jest.spyOn(controller, 'getProfile').mockRejectedValue(error);

      await expect(controller.getProfile(mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('register', () => {
    const validRegistrationData: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    };

    it('should create a new user successfully', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue(mockUser);

      const result = await controller.register(validRegistrationData);

      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...rest } = mockUser as any;
      const expectedResult = { ...rest, email: emailPlain };
      expect(result).toEqual(expectedResult);
      expect(mockUserService.findByEmail).toHaveBeenCalledWith(validRegistrationData.email);
      expect(mockUserService.create).toHaveBeenCalledWith(
        validRegistrationData.email,
        validRegistrationData.password,
        validRegistrationData.username,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserService.findByEmail.mockResolvedValue(mockUser);

      await expect(controller.register(validRegistrationData)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid email format', async () => {
      const invalidEmailData = {
        ...validRegistrationData,
        email: 'invalid-email',
      };

      await expect(controller.register(invalidEmailData)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserService.findByEmail).not.toHaveBeenCalled();
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for short password', async () => {
      const shortPasswordData = {
        ...validRegistrationData,
        password: '123',
      };

      await expect(controller.register(shortPasswordData)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserService.findByEmail).not.toHaveBeenCalled();
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty username', async () => {
      const emptyUsernameData = {
        ...validRegistrationData,
        username: '',
      };

      await expect(controller.register(emptyUsernameData)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockUserService.findByEmail).not.toHaveBeenCalled();
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it('should handle special characters in username', async () => {
      const specialUsernameData = {
        ...validRegistrationData,
        username: 'test-user_123',
      };
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockResolvedValue({ ...mockUser, username: specialUsernameData.username });

      const result = await controller.register(specialUsernameData);

      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...rest } = { ...mockUser, username: specialUsernameData.username };
      const expectedResult = { ...rest, email: emailPlain };
      expect(result).toEqual(expectedResult);
      expect(mockUserService.create).toHaveBeenCalledWith(
        specialUsernameData.email,
        specialUsernameData.password,
        specialUsernameData.username,
      );
    });

    it('should handle database errors gracefully', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);
      mockUserService.create.mockRejectedValue(new Error('Database error'));

      await expect(controller.register(validRegistrationData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle service errors gracefully', async () => {
      mockUserService.findByEmail.mockRejectedValue(new Error('Service error'));

      await expect(controller.register(validRegistrationData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const { password, emailEncrypted, emailIv, emailTag, emailHash, ...rest } = mockUser as any;
      const mockResponse = {
        access_token: 'mock-token',
        user: { ...rest, email: emailPlain },
      };
      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await controller.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException());

      await expect(
        controller.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid email format', async () => {
      await expect(
        controller.login({
          email: 'invalid-email',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty password', async () => {
      await expect(
        controller.login({
          email: 'test@example.com',
          password: '',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });
}); 