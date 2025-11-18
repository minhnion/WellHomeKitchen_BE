import express from 'express';
import { authenticate, authorizeRoles } from '../middlewares/auth.middleware.js';
import notificationController from '../controllers/notification.controller.js';

const router = express.Router();

// Admin routes
router.get(
  '/',
  authenticate,
  authorizeRoles('admin', 'product-manager', 'content-creator'),
  notificationController.getNotifications
);

router.put(
  '/mark-all-read',
  authenticate,
  authorizeRoles('admin', 'product-manager', 'content-creator'),
  notificationController.markAllNotificationsAsRead
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('admin', 'product-manager', 'content-creator'),
  notificationController.markNotificationAsRead
);


export default router;