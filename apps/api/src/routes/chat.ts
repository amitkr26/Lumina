import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { strictRateLimiter } from '../middleware/rateLimiter.js';

export const chatRouter = Router();

const createConversationSchema = z.object({
  userId: z.string(),
});

chatRouter.post('/conversations', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const { userId } = createConversationSchema.parse(req.body);

  const existing = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      participants: { every: { userId: { in: [req.user!.id, userId] } } },
    },
    include: { participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } } },
  });

  if (existing) {
    return res.json({ success: true, data: existing, existing: true });
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      participants: {
        create: [
          { userId: req.user!.id, role: 'ADMIN' },
          { userId, role: 'MEMBER' },
        ],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } } },
    },
  });

  res.status(201).json({ success: true, data: conversation });
}));

chatRouter.get('/conversations', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: req.user!.id } } },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      participants: {
        include: { user: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } } },
      },
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
  });

  const enriched = conversations.map(conv => {
    const otherParticipants = conv.participants.filter(p => p.userId !== req.user!.id);
    return {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      avatar: conv.avatar,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      participants: otherParticipants.map(p => p.user),
      unreadCount: 0,
      isMuted: conv.participants.find(p => p.userId === req.user!.id)?.isMuted || false,
    };
  });

  res.json({ success: true, data: enriched });
}));

chatRouter.get('/conversations/:id/messages', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const cursor = req.query.cursor as string | undefined;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.id } },
  });

  if (!participant) throw new AppError('Not a participant', 403);

  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id, isDeleted: false },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatar: true } },
      reactions: { select: { emoji: true, userId: true } },
      replyTo: { select: { id: true, content: true, sender: { select: { username: true } } } },
    },
  });

  await prisma.readReceipt.createMany({
    data: messages
      .filter(m => m.senderId !== req.user!.id)
      .map(m => ({ messageId: m.id, userId: req.user!.id })),
    skipDuplicates: true,
  });

  res.json({
    success: true,
    data: {
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0].id : null,
    },
  });
}));

chatRouter.post('/conversations/:id/messages', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const { content, type, mediaUrl, replyToId } = z.object({
    content: z.string().max(5000).optional(),
    type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE', 'EMOJI']).optional(),
    mediaUrl: z.string().optional(),
    replyToId: z.string().optional(),
  }).parse(req.body);

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.id } },
  });

  if (!participant) throw new AppError('Not a participant', 403);

  const message = await prisma.message.create({
    data: {
      conversationId: req.params.id,
      senderId: req.user!.id,
      content,
      type: (type as any) || 'TEXT',
      mediaUrl,
      replyToId,
    },
    include: {
      sender: { select: { id: true, username: true, displayName: true, avatar: true } },
    },
  });

  await prisma.conversation.update({
    where: { id: req.params.id },
    data: { lastMessage: content, lastMessageAt: new Date() },
  });

  res.status(201).json({ success: true, data: message });
}));

chatRouter.patch('/conversations/:id/messages/:messageId/reaction', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { emoji } = z.object({ emoji: z.string() }).parse(req.body);

  const reaction = await prisma.messageReaction.upsert({
    where: {
      messageId_userId_emoji: { messageId: req.params.messageId, userId: req.user!.id, emoji },
    },
    create: { messageId: req.params.messageId, userId: req.user!.id, emoji },
    update: {},
  });

  res.json({ success: true, data: reaction });
}));

chatRouter.post('/conversations/:id/mute', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.id } },
    data: { isMuted: true },
  });
  res.json({ success: true });
}));

chatRouter.post('/conversations/:id/unmute', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: req.params.id, userId: req.user!.id } },
    data: { isMuted: false },
  });
  res.json({ success: true });
}));

chatRouter.delete('/conversations/:id/messages/:messageId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const message = await prisma.message.findUnique({ where: { id: req.params.messageId } });
  if (!message) throw new AppError('Message not found', 404);
  if (message.senderId !== req.user!.id) throw new AppError('Unauthorized', 403);

  await prisma.message.update({
    where: { id: message.id },
    data: { isDeleted: true, content: 'This message was deleted' },
  });

  res.json({ success: true, message: 'Message deleted' });
}));
