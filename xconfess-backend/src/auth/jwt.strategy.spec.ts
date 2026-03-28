import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/entities/user.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userService: UserService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-jwt-secret'),
  };

  const mockUserService = {
    findById: jest.fn(),
  };

  const basePayload: JwtPayload = {
    sub: 1,
    username: 'tester',
    email: 'test@example.com',
    role: UserRole.USER,
    scopes: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userService = module.get<UserService>(UserService);
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-jwt-secret');
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('returns RequestUser when user exists', async () => {
      mockUserService.findById.mockResolvedValue({
        id: 1,
        role: UserRole.ADMIN,
      });

      const result = await strategy.validate(basePayload);

      expect(userService.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 1,
        username: 'tester',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        scopes: [],
      });
    });

    it('throws UnauthorizedException when user is missing', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(strategy.validate(basePayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rethrows InternalServerErrorException from findById', async () => {
      const err = new InternalServerErrorException('Error finding user by ID');
      mockUserService.findById.mockRejectedValue(err);

      await expect(strategy.validate(basePayload)).rejects.toBe(err);
    });
  });
});
