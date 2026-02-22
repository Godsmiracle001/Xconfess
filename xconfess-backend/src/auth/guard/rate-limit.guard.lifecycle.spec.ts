import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard - Lifecycle Integration', () => {
  let module: TestingModule;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        RATE_LIMIT_GET_LIMIT: '100',
        RATE_LIMIT_GET_WINDOW: '60',
        RATE_LIMIT_POST_LIMIT: '20',
        RATE_LIMIT_POST_WINDOW: '60',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        Reflector,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should properly initialize and cleanup on module lifecycle', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // Initialize module (triggers OnModuleInit)
    await module.init();
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);

    // Close module (triggers OnModuleDestroy)
    await module.close();
    expect(clearIntervalSpy).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should not leak intervals across multiple module initializations', async () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    // First lifecycle
    await module.init();
    const firstIntervalCount = setIntervalSpy.mock.calls.length;
    await module.close();
    const firstClearCount = clearIntervalSpy.mock.calls.length;

    // Create new module instance
    const module2 = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        Reflector,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    // Second lifecycle
    await module2.init();
    const secondIntervalCount = setIntervalSpy.mock.calls.length;
    await module2.close();
    const secondClearCount = clearIntervalSpy.mock.calls.length;

    // Verify intervals are properly managed
    expect(secondIntervalCount).toBeGreaterThan(firstIntervalCount);
    expect(secondClearCount).toBeGreaterThan(firstClearCount);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should handle rapid start/stop cycles without leaking', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    for (let i = 0; i < 5; i++) {
      const testModule = await Test.createTestingModule({
        providers: [
          RateLimitGuard,
          Reflector,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      await testModule.init();
      await testModule.close();
    }

    // Should have cleared interval for each cycle
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(5);

    clearIntervalSpy.mockRestore();
  });
});
