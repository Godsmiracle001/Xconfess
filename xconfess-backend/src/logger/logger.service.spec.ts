import { AppLogger } from './logger.service';

describe('AppLogger', () => {
  let service: AppLogger;

  beforeEach(() => {
    service = new AppLogger();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should mask user ids inside object payloads', () => {
    const payload = { userId: '1234567890abcdef', action: 'test' };
    const sanitized = (service as any).sanitize(payload);

    expect(sanitized).toEqual(
      expect.objectContaining({
        userId: expect.any(String),
        action: 'test',
      }),
    );
    expect(sanitized.userId).not.toBe(payload.userId);
  });
});
