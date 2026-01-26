import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnonymousContextMiddleware implements NestMiddleware {
  private readonly ANONYMOUS_CONTEXT_HEADER = 'x-anonymous-context-id';
  private readonly ANONYMOUS_CONTEXT_PREFIX = 'anon_';

  use(req: Request, res: Response, next: NextFunction) {
    // Only add anonymous context for authenticated users
    if ((req as any).user) {
      // Generate a unique anonymous context ID
      const anonymousContextId = this.generateAnonymousContextId();
      
      // Add the header to the request
      req.headers[this.ANONYMOUS_CONTEXT_HEADER] = anonymousContextId;
      
      // Store the anonymous context ID in the request object for later use
      req['anonymousContextId'] = anonymousContextId;
    }
    
    next();
  }

  private generateAnonymousContextId(): string {
    // Generate a UUID and prefix it with 'anon_' to make it easily identifiable
    return `${this.ANONYMOUS_CONTEXT_PREFIX}${uuidv4()}`;
  }
}