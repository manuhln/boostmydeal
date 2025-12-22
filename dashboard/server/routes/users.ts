import { Router } from 'express';
import { UserController } from '../modules/user/UserController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all user routes
router.use(authMiddleware);

// User routes
router.get('/me', UserController.getCurrentUser);
router.get('/profile', UserController.getUserProfile);
router.put('/profile', UserController.updateUserProfile);

// Organization routes (handled through user context)
router.put('/organization', UserController.updateOrganization);

export default router;