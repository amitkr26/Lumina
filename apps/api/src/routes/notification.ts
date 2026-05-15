import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notification.js';
import { prisma } from '@lumina/database';

export const notificationRouter = Router();

notificationRouter.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const { notifications, unreadCount } = await getNotifications(req.user!.id, limit, cursor);

  res.json({
    success: true,
    data: { notifications, unreadCount },
  });
}));

notificationRouter.post('/:id/read', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  await markNotificationRead(req.params.id, req.user!.id);
  res.json({ success: true });
}));

notificationRouter.post('/read-all', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  await markAllNotificationsRead(req.user!.id);
  res.json({ success: true });
}));

notificationRouter.get('/unread-count', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.id, isRead: false },
  });
  res.json({ success: true, data: { count } });
}));
