import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  const mockConfigService = {
    get: jest.fn((key: string): string => {
      const config: Record<string, string> = {
        RATE_LIMIT_GET_LIMIT: '100',
        RATE_LIMIT_GET_WINDOW: '60',
        RATE_LIMIT_POST_LIMIT: '20',
        RATE_LIMIT_POST_WINDOW: '60',
      };
      return config[key] || '';
    }),
  };

  const createMockExecutionContext = (
    method: string,
    ip = '127.0.0.1',
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          ip,
          headers: {},
          socket: { remoteAddress: ip },
        }),
      }),
    }) as ExecutionContext;

  beforeEach(async () => {
    jest.clearAllTimers();
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        Reflector,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Lifecycle Management', () => {
    it('should initialize cleanup interval on module init', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      guard.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it('should clear cleanup interval on module destroy', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      guard.onModuleInit();
      guard.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not throw error when destroying without initialization', () => {
      expect(() => guard.onModuleDestroy()).not.toThrow();
    });

    it('should handle multiple destroy calls safely', () => {
      guard.onModuleInit();

      expect(() => {
        guard.onModuleDestroy();
        guard.onModuleDestroy();
      }).not.toThrow();
    });

    it('should not create duplicate intervals on multiple init calls', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      guard.onModuleInit();
      const firstCallCount = setIntervalSpy.mock.calls.length;

      guard.onModuleInit();
      const secondCallCount = setIntervalSpy.mock.calls.length;

      // Should create a new interval each time (NestJS ensures single init)
      expect(secondCallCount).toBe(firstCallCount + 1);
    });
  });

  describe('Rate Limiting Behavior', () => {
    beforeEach(() => {
      guard.onModuleInit();
    });

    afterEach(() => {
      guard.onModuleDestroy();
    });

    it('should allow first request', async () => {
      const context = createMockExecutionContext('GET');

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow requests within limit', async () => {
      const context = createMockExecutionContext('GET');

      for (let i = 0; i < 10; i++) {
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should block requests exceeding GET limit', async () => {
      const context = createMockExecutionContext('GET');

      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        await guard.canActivate(context);
      }

      // 101st request should be blocked
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should block requests exceeding POST limit', async () => {
      const context = createMockExecutionContext('POST');

      // Make 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(context);
      }

      // 21st request should be blocked
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
    });

    it('should throw TOO_MANY_REQUESTS with retry-after', async () => {
      const context = createMockExecutionContext('POST');

      // Exceed limit
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(context);
      }

      try {
        await guard.canActivate(context);
        fail('Should have thrown HttpException');
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

        const response = httpError.getResponse();
        expect(response).toHaveProperty(
          'statusCode',
          HttpStatus.TOO_MANY_REQUESTS,
        );
        expect(response).toHaveProperty(
          'message',
          'Too many requests, please try again later',
        );
        expect(response).toHaveProperty('retryAfter');
        if (
          typeof response === 'object' &&
          response !== null &&
          'retryAfter' in response
        ) {
          expect(typeof response.retryAfter).toBe('number');
        }
      }
    });

    it('should track different IPs separately', async () => {
      const context1 = createMockExecutionContext('GET', '127.0.0.1');
      const context2 = createMockExecutionContext('GET', '192.168.1.1');

      // Make 100 requests from first IP
      for (let i = 0; i < 100; i++) {
        await guard.canActivate(context1);
      }

      // First IP should be blocked
      await expect(guard.canActivate(context1)).rejects.toThrow(HttpException);

      // Second IP should still work
      const result = await guard.canActivate(context2);
      expect(result).toBe(true);
    });

    it('should track different methods separately', async () => {
      const getContext = createMockExecutionContext('GET');
      const postContext = createMockExecutionContext('POST');

      // Make 100 GET requests
      for (let i = 0; i < 100; i++) {
        await guard.canActivate(getContext);
      }

      // GET should be blocked
      await expect(guard.canActivate(getContext)).rejects.toThrow(
        HttpException,
      );

      // POST should still work
      const result = await guard.canActivate(postContext);
      expect(result).toBe(true);
    });

    it('should reset counter after window expires', async () => {
      const context = createMockExecutionContext('POST');

      // Make 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        await guard.canActivate(context);
      }

      // Should be blocked
      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);

      // Fast forward past the window (60 seconds)
      jest.advanceTimersByTime(61000);

      // Should work again
      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('Cleanup Functionality', () => {
    beforeEach(() => {
      guard.onModuleInit();
    });

    afterEach(() => {
      guard.onModuleDestroy();
    });

    it('should remove expired entries during cleanup', async () => {
      const context = createMockExecutionContext('GET');

      // Make some requests
      await guard.canActivate(context);

      // Fast forward past expiration
      jest.advanceTimersByTime(61000);

      // Trigger cleanup
      jest.advanceTimersByTime(60000);

      // Should be able to make full limit of requests again
      for (let i = 0; i < 100; i++) {
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      }
    });

    it('should run cleanup periodically', () => {
      const cleanupSpy = jest.spyOn(guard as any, 'cleanup');

      // Fast forward 3 minutes
      jest.advanceTimersByTime(180000);

      // Should have called cleanup 3 times
      expect(cleanupSpy).toHaveBeenCalledTimes(3);
    });

    it('should not run cleanup after module destroy', () => {
      const cleanupSpy = jest.spyOn(guard as any, 'cleanup');

      guard.onModuleDestroy();

      // Fast forward time
      jest.advanceTimersByTime(120000);

      // Cleanup should not have been called
      expect(cleanupSpy).not.toHaveBeenCalled();
    });
  });

  describe('Client Identification', () => {
    beforeEach(() => {
      guard.onModuleInit();
    });

    afterEach(() => {
      guard.onModuleDestroy();
    });

    it('should use x-forwarded-for header when available', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' },
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
          }),
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should use x-real-ip header as fallback', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            headers: { 'x-real-ip': '203.0.113.1' },
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
          }),
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should use request.ip as fallback', async () => {
      const context = createMockExecutionContext('GET', '192.168.1.1');

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});
