import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getProfile,
  getPublicProfile,
  updateProfile,
  getStats,
} from '../controllers/user.controller';

const router: Router = Router();

router.get('/profile', requireAuth, getProfile);
router.get('/:id/public-profile', getPublicProfile);
router.patch('/profile', requireAuth, updateProfile);
router.get('/stats', requireAuth, getStats);

export default router;
