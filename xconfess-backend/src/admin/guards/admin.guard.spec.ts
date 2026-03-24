import { AdminGuard } from './admin.guard';
import { ForbiddenException } from '@nestjs/common';

describe('AdminGuard', () => {
  it('throws if no user', () => {
    const guard = new AdminGuard({} as any);
    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
      }),
    };
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws if not admin', () => {
    const guard = new AdminGuard({} as any);
    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { isAdmin: false } }),
      }),
    };
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows admin', () => {
    const guard = new AdminGuard({} as any);
    const ctx: any = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { isAdmin: true } }),
      }),
    };
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
