# RateLimitGuard Interval Leak Fix

## Summary
Fixed a memory leak in `RateLimitGuard` where the cleanup interval was created in the constructor but never cleared, causing intervals to persist after application shutdown and accumulate across restarts.

## Changes Made

### 1. Updated `src/auth/guard/rate-limit.guard.ts`

#### Before:
```typescript
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.config = getRateLimitConfig(configService);
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
}
```

#### After:
```typescript
@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleInit, OnModuleDestroy {
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.config = getRateLimitConfig(configService);
  }

  onModuleInit() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}
```

### Key Improvements:
1. **Lifecycle Management**: Interval is now created in `onModuleInit()` instead of constructor
2. **Proper Cleanup**: Interval is cleared in `onModuleDestroy()` hook
3. **Memory Safety**: Interval reference is stored and nullified after cleanup
4. **No Breaking Changes**: Rate limiting behavior remains identical

### 2. Created Comprehensive Tests

#### `src/auth/guard/rate-limit.guard.spec.ts`
- Tests lifecycle management (init/destroy)
- Tests rate limiting behavior (GET/POST limits)
- Tests cleanup functionality
- Tests client identification (IP headers)
- Tests interval cleanup after module destroy

#### `src/auth/guard/rate-limit.guard.lifecycle.spec.ts`
- Integration tests for module lifecycle
- Tests for interval leak prevention
- Tests for rapid start/stop cycles

## Acceptance Criteria Met

✅ Cleanup interval is started using lifecycle hook (`onModuleInit`)
✅ Cleanup interval is cleared during shutdown (`onModuleDestroy`)
✅ No duplicate intervals created across restarts (each instance manages its own)
✅ No orphaned intervals after app shutdown (cleared in destroy hook)
✅ Rate limiting continues to function as before (all existing logic preserved)

## Testing

The fix can be verified by:

1. **Manual Testing**:
   ```bash
   # Start the application
   npm run start:dev
   
   # Stop the application (Ctrl+C)
   # Verify no cleanup logs appear after shutdown
   
   # Restart multiple times
   # Verify cleanup runs once per instance
   ```

2. **Unit Tests**:
   ```bash
   npm test -- rate-limit.guard.spec.ts
   npm test -- rate-limit.guard.lifecycle.spec.ts
   ```

3. **Functional Testing**:
   - Send rapid requests exceeding rate limit → should be blocked
   - Send valid requests → should pass
   - Verify expired entries are removed over time

## Risk Mitigation

- **Guard Scope**: NestJS guards are singleton-scoped by default, ensuring single instance per application
- **Lifecycle Hooks**: NestJS guarantees `onModuleInit` and `onModuleDestroy` are called exactly once per module lifecycle
- **Backward Compatibility**: No changes to public API or rate limiting logic

## Performance Impact

- **No additional CPU overhead**: Same cleanup logic, just properly managed
- **Memory improvement**: Intervals are now properly cleaned up, preventing memory leaks
- **Stability improvement**: Handles dev hot-reload and test environments correctly
