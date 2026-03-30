import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from './rate-limit.guard';
import { getRateLimitConfig } from '../../config/rate-limit.config';

jest.mock('../../config/rate-limit.config');

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  const mockGetRateLimitConfig = getRateLimitConfig as jest.Mock;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    mockGetRateLimitConfig.mockReturnValue({
      postLimit: 5,
      postWindow: 60,
      getLimit: 50,
      getWindow: 60,
    });

    // Use fake timers to manipulate time for testing TTL/reset
    jest.useFakeTimers();

    guard = new RateLimitGuard(reflector, configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const createMockExecutionContext = (
    method: string,
    ip: string,
    handler: any = () => {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          ip,
          headers: {},
          socket: { remoteAddress: ip },
        }),
      }),
      getHandler: () => handler,
    } as unknown as ExecutionContext;
  };

  it('should allow requests within the default limit', async () => {
    const context = createMockExecutionContext('GET', '127.0.0.1');
    reflector.get.mockReturnValue(undefined); // No custom decorator

    for (let i = 0; i < 50; i++) {
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    }
  });

  it('should block requests exceeding the default limit', async () => {
    const context = createMockExecutionContext('POST', '127.0.0.2');
    reflector.get.mockReturnValue(undefined); // No custom decorator

    for (let i = 0; i < 5; i++) {
      await guard.canActivate(context);
    }

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('should use override limits from the decorator', async () => {
    const context = createMockExecutionContext('POST', '127.0.0.3');
    // Simulate @RateLimit(3, 300)
    reflector.get.mockReturnValue({ limit: 3, window: 300 });

    for (let i = 0; i < 3; i++) {
      const canActivate = await guard.canActivate(context);
      expect(canActivate).toBe(true);
    }

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
  });

  it('should reset the limit after the window expires', async () => {
    const context = createMockExecutionContext('POST', '127.0.0.4');
    reflector.get.mockReturnValue({ limit: 1, window: 60 });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);

    await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

    // Fast-forward past the window
    jest.advanceTimersByTime(61000);

    const canActivateAfterWindow = await guard.canActivate(context);
    expect(canActivateAfterWindow).toBe(true);
  });
});
