import { Router } from 'express';
import { notificationController } from '../controllers/NotificationController';
import { authMiddleware } from '../../../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', notificationController.getNotifications.bind(notificationController));
router.get('/unread-count', notificationController.getUnreadCount.bind(notificationController));
router.patch('/read-all', notificationController.markAllAsRead.bind(notificationController));
router.patch('/:id/read', notificationController.markAsRead.bind(notificationController));

export default router;
