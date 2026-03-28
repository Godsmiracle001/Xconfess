import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../user/entities/user.entity';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    role?: UserRole;
  };
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Check if user is authenticated
    if (!request.user) {
      throw new ForbiddenException('User is not authenticated');
    }

    const userRole = String(request.user.role || '').toLowerCase();
    const isAdmin = userRole === UserRole.ADMIN || userRole === 'admin';

    // Check if user has admin role
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can access this endpoint');
    }

    return true;
  }
}
