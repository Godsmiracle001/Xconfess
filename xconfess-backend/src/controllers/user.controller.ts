import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { calculateUserStats } from '../services/userStats.service';

export const getProfile = (req: AuthenticatedRequest, res: Response) => {
  res.json({
    id: req.user!.id,
    username: 'Anonymous',
    isAnonymous: true,
    avatarUrl: null,
  });
};

export const getPublicProfile = (req: AuthenticatedRequest, res: Response) => {
  res.json({
    username: 'Anonymous',
  });
};

export const updateProfile = (req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true });
};

export const getStats = (req: AuthenticatedRequest, res: Response) => {
  const mockConfessions = [
    { id: '1', createdAt: new Date(), reactionCount: 120 },
  ];

  const stats = calculateUserStats(mockConfessions);
  res.json(stats);
};
