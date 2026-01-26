# Admin Guard with Role-Based Access Control (RBAC)

## Overview

This implementation introduces role-based access control (RBAC) to the Xconfess backend, distinguishing between admin and regular users. The system secures privileged endpoints such as moderation tools and comment approvals.

## Architecture

### 1. User Entity Update

The `User` entity now includes a `role` field with an enum type:

```typescript
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
role: UserRole;
```

**Migration**: The `isAdmin` boolean field has been replaced with the `role` enum field. A migration file (`20250122-add-role-to-user.ts`) handles the database schema update and data migration.

### 2. AdminGuard Implementation

The `AdminGuard` is a NestJS `CanActivate` guard that enforces role-based access restrictions:

**File**: `src/auth/admin.guard.ts`

```typescript
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    if (!request.user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (request.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can access this endpoint');
    }

    return true;
  }
}
```

**Features**:
- Checks for authenticated user
- Verifies user has `ADMIN` role
- Throws `ForbiddenException` if access is denied
- Works in conjunction with `JwtAuthGuard` for complete authentication chain

### 3. JWT Strategy Update

The `JwtStrategy` now includes the user's role in the validated payload:

```typescript
async validate(payload: any) {
  const user = await this.userService.findById(payload.sub);
  return { userId: payload.sub, username: payload.username, role: user?.role || UserRole.USER };
}
```

This ensures the role information is available in `request.user` for guard evaluation.

### 4. Protected Endpoints

#### Moderation Endpoints (Reorganized)

All moderation endpoints are now under `/admin/moderation` and require both JWT authentication and admin role:

```typescript
@Controller('admin/moderation')
export class ModerationController {
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('pending')
  async getPendingReviews(...) { ... }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('review/:id')
  async reviewModeration(...) { ... }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('stats')
  async getStats(...) { ... }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('accuracy')
  async getAccuracyMetrics(...) { ... }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('config')
  getConfiguration() { ... }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('config/thresholds')
  updateThresholds(...) { ... }
}
```

#### Comment Moderation Endpoints

Admin comment approval/rejection endpoints are now protected:

```typescript
@Controller('comments')
export class CommentController {
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('/admin/comments/:id/approve')
  async approveComment(...) { ... }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('/admin/comments/:id/reject')
  async rejectComment(...) { ... }
}
```

### 5. UserService Role Management

New methods added to `UserService`:

- **`setUserRole(userId: number, role: UserRole): Promise<User>`** - Sets a user's role
- **`saveUser(user: User): Promise<User>`** - Saves user changes to database

## API Endpoints

### Admin Moderation Endpoints

All endpoints require: `Authorization: Bearer <token>` header with admin user token

| Endpoint | Method | Description | Role Required |
|----------|--------|-------------|----------------|
| `/admin/moderation/pending` | GET | Get pending reviews | Admin |
| `/admin/moderation/review/:id` | POST | Review moderation item | Admin |
| `/admin/moderation/stats` | GET | Get moderation statistics | Admin |
| `/admin/moderation/accuracy` | GET | Get accuracy metrics | Admin |
| `/admin/moderation/config` | GET | Get moderation configuration | Admin |
| `/admin/moderation/config/thresholds` | POST | Update moderation thresholds | Admin |
| `/admin/moderation/test` | POST | Test moderation content | Admin |
| `/admin/moderation/confession/:confessionId` | GET | Get confession logs | Admin |
| `/admin/moderation/user/:userId` | GET | Get user logs | Admin |

### Admin Comment Endpoints

| Endpoint | Method | Description | Role Required |
|----------|--------|-------------|----------------|
| `/comments/admin/comments/:id/approve` | POST | Approve comment | Admin |
| `/comments/admin/comments/:id/reject` | POST | Reject comment | Admin |

## Testing

### Unit Tests

File: `src/auth/admin.guard.spec.ts`

Tests cover:
- Admin users can access protected endpoints
- Regular users are denied access
- Unauthenticated users are denied access
- Missing user object is handled properly

### Integration Tests

File: `test/admin-rbac.e2e-spec.ts`

Tests cover:
- Admin access to moderation endpoints
- Regular user denial scenarios
- Unauthenticated user denial
- Both positive and negative test cases

#### Running Tests

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

## Usage Examples

### Promote User to Admin

```typescript
// In your admin management controller/service
const user = await userService.findById(userId);
user.role = UserRole.ADMIN;
await userService.saveUser(user);

// Or use the dedicated method
await userService.setUserRole(userId, UserRole.ADMIN);
```

### Check User Role in Code

```typescript
import { UserRole } from './user/entities/user.entity';

if (user.role === UserRole.ADMIN) {
  // Admin-only logic
}
```

### Making Admin API Calls

```bash
# Get admin token (after login)
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Use token to access admin endpoint
curl -X GET http://localhost:3000/admin/moderation/stats \
  -H "Authorization: Bearer <token>"
```

## Database Migration

To apply the role-based changes to your database:

```bash
# Using TypeORM CLI
npm run typeorm migration:run

# Or with specific migration
npm run typeorm migration:run -- migrations/20250122-add-role-to-user.ts
```

The migration:
1. Adds the `role` column with enum type ('user', 'admin')
2. Migrates existing `isAdmin` boolean data to the role enum
3. Drops the deprecated `isAdmin` column

## Security Considerations

1. **Guard Chain**: Always use `@UseGuards(JwtAuthGuard, AdminGuard)` together - JWT authentication verifies the token, then AdminGuard checks the role
2. **Role Verification**: The JWT strategy fetches the user from the database each request to ensure role changes take immediate effect
3. **Error Messages**: Clear error messages indicate whether access was denied due to authentication or authorization
4. **Logging**: All role-based access decisions are logged for audit trails

## Error Responses

### Unauthorized (No Token)
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### Forbidden (Not Admin)
```json
{
  "statusCode": 403,
  "message": "Only admins can access this endpoint"
}
```

### Forbidden (Not Authenticated)
```json
{
  "statusCode": 403,
  "message": "User is not authenticated"
}
```

## Files Modified/Created

### Created
- `src/auth/admin.guard.ts` - AdminGuard implementation
- `src/auth/admin.guard.spec.ts` - AdminGuard unit tests
- `test/admin-rbac.e2e-spec.ts` - Integration tests
- `migrations/20250122-add-role-to-user.ts` - Database migration
- `ADMIN_GUARD_DOCUMENTATION.md` - This file

### Modified
- `src/user/entities/user.entity.ts` - Added UserRole enum and role field
- `src/auth/jwt.strategy.ts` - Updated to include role in JWT payload
- `src/user/user.service.ts` - Added role management methods
- `src/comment/comment.controller.ts` - Applied AdminGuard with JwtAuthGuard
- `src/moderation/moderation.controller.ts` - Reorganized endpoints and applied guards

## Future Enhancements

1. **Role-Based Decorators**: Create custom `@Admin()` and `@Roles(UserRole.ADMIN)` decorators for cleaner syntax
2. **Multiple Roles**: Extend to support additional roles like 'moderator', 'analyst'
3. **Permission System**: Implement granular permissions beyond role-based access
4. **Audit Logging**: Enhanced logging of all admin actions for compliance
5. **Role History**: Track role changes over time for audit purposes

## Troubleshooting

### "Only admins can access this endpoint" error
- Verify user has admin role: `SELECT role FROM "user" WHERE id = <userId>;`
- Check JWT token is valid and not expired
- Ensure `JwtAuthGuard` is applied before `AdminGuard`

### Migrations not applying
- Ensure database connection is configured correctly
- Check migration files are in `migrations/` directory
- Run: `npm run typeorm migration:show` to see migration status

### Role not updating immediately
- Role is fetched from database on each request by JwtStrategy
- Check database update was successful
- Clear any API client caches if using cached responses

## Support

For issues or questions, refer to:
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [TypeORM Migrations](https://typeorm.io/migrations)
- Project issue tracker
