import { Router } from 'express';
import { z } from 'zod';
import { prisma, ReportStatus, ModerationActionType } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { authorize } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.get('/dashboard', authenticate, authorize('ADMIN', 'MODERATOR'), asyncHandler(async (_req, res) => {
  const [userCount, postCount, reelCount, reportCount, activeUsers] = await Promise.all([
    prisma.user.count(),
    prisma.post.count({ where: { isDraft: false } }),
    prisma.reel.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { lastActiveAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
  ]);

  const recentReports = await prisma.report.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, username: true } },
      reportedUser: { select: { id: true, username: true } },
    },
  });

  res.json({
    success: true,
    data: {
      stats: { userCount, postCount, reelCount, pendingReports: reportCount, activeUsers },
      recentReports,
    },
  });
}));

adminRouter.get('/users', authenticate, authorize('ADMIN'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;
  const search = req.query.search as string | undefined;

  const users = await prisma.user.findMany({
    where: search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    } : undefined,
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatar: true,
      isVerified: true,
      isCreator: true,
      isBanned: true,
      isShadowBanned: true,
      role: true,
      createdAt: true,
      _count: { select: { followers: true, posts: true, reels: true } },
    },
  });

  res.json({
    success: true,
    data: {
      users,
      nextCursor: users.length === limit ? users[users.length - 1].id : null,
    },
  });
}));

adminRouter.patch('/users/:id', authenticate, authorize('ADMIN'), asyncHandler(async (req: AuthRequest, res) => {
  const { action } = z.object({
    action: z.enum(['ban', 'unban', 'shadowban', 'unshadowban', 'verify', 'unverify', 'makeAdmin', 'makeModerator', 'makeUser']),
    reason: z.string().optional(),
  }).parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError('User not found', 404);

  const updates: any = {};
  const moderationActionType: ModerationActionType | null = null;

  switch (action) {
    case 'ban':
      updates.isBanned = true;
      break;
    case 'unban':
      updates.isBanned = false;
      break;
    case 'shadowban':
      updates.isShadowBanned = true;
      break;
    case 'unshadowban':
      updates.isShadowBanned = false;
      break;
    case 'verify':
      updates.isVerified = true;
      break;
    case 'unverify':
      updates.isVerified = false;
      break;
    case 'makeAdmin':
      updates.role = 'ADMIN';
      break;
    case 'makeModerator':
      updates.role = 'MODERATOR';
      break;
    case 'makeUser':
      updates.role = 'USER';
      break;
  }

  await prisma.user.update({ where: { id: req.params.id }, data: updates });

  res.json({ success: true, message: `User ${action} successfully` });
}));

adminRouter.get('/reports', authenticate, authorize('ADMIN', 'MODERATOR'), asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const status = req.query.status as ReportStatus | undefined;

  const reports = await prisma.report.findMany({
    where: status ? { status } : undefined,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: { select: { id: true, username: true } },
      reportedUser: { select: { id: true, username: true, avatar: true } },
      moderator: { select: { id: true, username: true } },
    },
  });

  res.json({ success: true, data: reports });
}));

adminRouter.patch('/reports/:id', authenticate, authorize('ADMIN', 'MODERATOR'), asyncHandler(async (req: AuthRequest, res) => {
  const { status, action } = z.object({
    status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'DISMISSED']),
    action: z.enum(['none', 'ban', 'shadowban', 'removeContent']).optional(),
  }).parse(req.body);

  const report = await prisma.report.update({
    where: { id: req.params.id },
    data: { status, moderatorId: req.user!.id, resolvedAt: status !== 'UNDER_REVIEW' ? new Date() : undefined },
  });

  if (action === 'ban' && report.userId) {
    await prisma.user.update({ where: { id: report.userId }, data: { isBanned: true } });
  }
  if (action === 'shadowban' && report.userId) {
    await prisma.user.update({ where: { id: report.userId }, data: { isShadowBanned: true } });
  }

  res.json({ success: true, data: report });
}));

adminRouter.post('/reports', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { userId, postId, reelId, storyId, commentId, reason, description } = z.object({
    userId: z.string().optional(),
    postId: z.string().optional(),
    reelId: z.string().optional(),
    storyId: z.string().optional(),
    commentId: z.string().optional(),
    reason: z.enum(['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'NUDITY', 'MISINFORMATION', 'COPYRIGHT', 'IMPERSONATION', 'SELF_HARM', 'OTHER']),
    description: z.string().max(1000).optional(),
  }).parse(req.body);

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      userId,
      postId,
      reelId,
      storyId,
      commentId,
      reason,
      description,
    },
  });

  res.status(201).json({ success: true, data: report });
}));

adminRouter.get('/moderation-actions', authenticate, authorize('ADMIN', 'MODERATOR'), asyncHandler(async (_req, res) => {
  const actions = await prisma.moderationAction.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      moderator: { select: { id: true, username: true } },
      user: { select: { id: true, username: true } },
    },
  });

  res.json({ success: true, data: actions });
}));

adminRouter.post('/moderation-actions', authenticate, authorize('ADMIN', 'MODERATOR'), asyncHandler(async (req: AuthRequest, res) => {
  const { userId, action, reason, duration } = z.object({
    userId: z.string(),
    action: z.enum(['WARNING', 'TEMP_BAN', 'PERMANENT_BAN', 'CONTENT_REMOVAL', 'SHADOW_BAN', 'FEATURE_RESTRICTION']),
    reason: z.string(),
    duration: z.number().optional(),
  }).parse(req.body);

  await prisma.moderationAction.create({
    data: {
      moderatorId: req.user!.id,
      userId,
      action: action as ModerationActionType,
      reason,
      duration,
    },
  });

  const updates: any = {};
  if (action === 'PERMANENT_BAN') updates.isBanned = true;
  if (action === 'SHADOW_BAN') updates.isShadowBanned = true;

  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { id: userId }, data: updates });
  }

  res.json({ success: true, message: 'Moderation action applied' });
}));
