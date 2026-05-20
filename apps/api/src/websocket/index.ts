import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '@lumina/database';
import { logger } from '../index.js';
import { createNotification } from '../services/notification.js';

interface SocketUser {
  id: string;
  username: string;
}

const userSockets = new Map<string, Set<string>>();

export const setupSocketIO = (io: Server) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token as string, config.jwt.secret) as {
        id: string;
        username: string;
      };

      socket.data.user = { id: decoded.id, username: decoded.username };
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    logger.info(`User connected: ${user.username} (${socket.id})`);

    if (!userSockets.has(user.id)) {
      userSockets.set(user.id, new Set());
    }
    userSockets.get(user.id)!.add(socket.id);

    socket.join(user.id);

    socket.data.user = user;

    socket.on('join-conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('send-message', async (data: {
      conversationId: string;
      content: string;
      type?: string;
      mediaUrl?: string;
      replyToId?: string;
    }) => {
      try {
        const message = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: user.id,
            content: data.content,
            type: (data.type as any) || 'TEXT',
            mediaUrl: data.mediaUrl,
            replyToId: data.replyToId,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        });

        await prisma.conversation.update({
          where: { id: data.conversationId },
          data: {
            lastMessage: data.content,
            lastMessageAt: new Date(),
          },
        });

        io.to(`conversation:${data.conversationId}`).emit('new-message', {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          sender: message.sender,
          content: message.content,
          type: message.type,
          mediaUrl: message.mediaUrl,
          replyToId: message.replyToId,
          createdAt: message.createdAt,
        });

        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId: data.conversationId },
          select: { userId: true },
        });

        for (const participant of participants) {
          if (participant.userId !== user.id) {
            await createNotification({
              userId: participant.userId,
              senderId: user.id,
              type: 'MESSAGE',
              content: data.content?.substring(0, 100),
            });
          }
        }
      } catch (error) {
        logger.error('Failed to send message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
        userId: user.id,
        username: user.username,
        conversationId: data.conversationId,
      });
    });

    socket.on('stop-typing', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user-stop-typing', {
        userId: user.id,
        conversationId: data.conversationId,
      });
    });

    socket.on('mark-read', async (data: { messageId: string; conversationId: string }) => {
      try {
        await prisma.readReceipt.upsert({
          where: {
            messageId_userId: {
              messageId: data.messageId,
              userId: user.id,
            },
          },
          create: {
            messageId: data.messageId,
            userId: user.id,
          },
          update: { readAt: new Date() },
        });

        socket.to(`conversation:${data.conversationId}`).emit('message-read', {
          messageId: data.messageId,
          userId: user.id,
        });
      } catch (error) {
        logger.error('Failed to mark message as read:', error);
      }
    });

    socket.on('message-reaction', async (data: { messageId: string; emoji: string }) => {
      try {
        const reaction = await prisma.messageReaction.upsert({
          where: {
            messageId_userId_emoji: {
              messageId: data.messageId,
              userId: user.id,
              emoji: data.emoji,
            },
          },
          create: {
            messageId: data.messageId,
            userId: user.id,
            emoji: data.emoji,
          },
          update: {},
        });

        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { conversationId: true },
        });

        if (message) {
          io.to(`conversation:${message.conversationId}`).emit('message-reaction', {
            messageId: data.messageId,
            userId: user.id,
            emoji: data.emoji,
          });
        }
      } catch (error) {
        logger.error('Failed to add reaction:', error);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${user.username} (${socket.id})`);

      const sockets = userSockets.get(user.id);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(user.id);
          io.emit('user-offline', { userId: user.id });
        }
      }
    });
  });

  /* setInterval(async () => {
    try {
      const now = new Date();
      await prisma.story.deleteMany({
        where: {
          expiresAt: { lte: now },
          isHighlight: false,
        },
      });
    } catch (err) {
      logger.error('Failed to cleanup stories:', err);
    }
  }, 60000); */
};

export const getOnlineUsers = (): string[] => {
  return Array.from(userSockets.keys());
};

export const isUserOnline = (userId: string): boolean => {
  return userSockets.has(userId);
};
