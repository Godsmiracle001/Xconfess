import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Mock auth (replace with real auth later)
  const userId = req.headers['x-user-id'];

  if (!userId || typeof userId !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = { id: userId };
  next();
};
