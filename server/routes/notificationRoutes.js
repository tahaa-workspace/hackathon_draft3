import { Router } from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';

const router = Router();

router.get('/', protect, listNotifications);
router.get('/unread-count', protect, unreadNotificationCount);
router.patch('/read-all', protect, markAllNotificationsRead);
router.patch('/:id/read', protect, markNotificationRead);

export default router;
