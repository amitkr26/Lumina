import { prisma, NotificationType } from '@lumina/database';
import { io, logger } from '../index.js';

export const createNotification = async (data: {
  userId: string;
  senderId?: string;
  type: NotificationType;
  content?: string;
  postId?: string;
  reelId?: string;
  commentId?: string;
  storyId?: string;
}) => {
  try {
    const notification = await prisma.notification.create({ data });

    io.to(data.userId).emit('notification', {
      id: notification.id,
      type: notification.type,
      content: notification.content,
      senderId: notification.senderId,
      postId: notification.postId,
      reelId: notification.reelId,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    return null;
  }
};

export const markNotificationRead = async (notificationId: string, userId: string) => {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
};

export const markAllNotificationsRead = async (userId: string) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

export const getNotifications = async (userId: string, limit: number = 20, cursor?: string) => {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
        },
      },
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return { notifications, unreadCount };
};
