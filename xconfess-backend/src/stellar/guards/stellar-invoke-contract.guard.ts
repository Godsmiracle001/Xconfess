import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: {
    scopes?: string[];
  };
};

const REQUIRED_SCOPE = 'stellar:invoke-contract';

@Injectable()
export class StellarInvokeContractGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const scopes = request.user?.scopes ?? [];

    if (!Array.isArray(scopes) || !scopes.includes(REQUIRED_SCOPE)) {
      throw new ForbiddenException(`Missing required scope: ${REQUIRED_SCOPE}`);
    }

    return true;
  }
}
