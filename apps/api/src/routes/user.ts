import { Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { strictRateLimiter } from '../middleware/rateLimiter.js';
import { createNotification } from '../services/notification.js';

export const userRouter = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(150).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().length(2).optional(),
  settings: z.record(z.unknown()).optional(),
});

userRouter.get('/:username', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      coverImage: true,
      bio: true,
      website: true,
      location: true,
      isVerified: true,
      isCreator: true,
      creatorBadge: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          posts: { where: { isDraft: false, visibility: 'PUBLIC' } },
          reels: { where: { visibility: 'PUBLIC' } },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isFollowing = req.user
    ? await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
      })
    : null;

  res.json({
    success: true,
    data: {
      ...user,
      isFollowing: !!isFollowing,
      isSelf: req.user?.id === user.id,
    },
  });
}));

userRouter.get('/:username/posts', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw new AppError('User not found', 404);

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const posts = await prisma.post.findMany({
    where: {
      authorId: user.id,
      isDraft: false,
      visibility: req.user?.id === user.id ? undefined : 'PUBLIC',
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { publishedAt: 'desc' },
    include: {
      media: { orderBy: { order: 'asc' } },
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.json({
    success: true,
    data: {
      posts,
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    },
  });
}));

userRouter.get('/:username/reels', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw new AppError('User not found', 404);

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const reels = await prisma.reel.findMany({
    where: {
      authorId: user.id,
      visibility: req.user?.id === user.id ? undefined : 'PUBLIC',
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.json({
    success: true,
    data: {
      reels,
      nextCursor: reels.length === limit ? reels[reels.length - 1].id : null,
    },
  });
}));

userRouter.get('/:username/stories', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw new AppError('User not found', 404);

  const stories = await prisma.story.findMany({
    where: {
      authorId: user.id,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
      _count: { select: { views: true } },
    },
  });

  res.json({ success: true, data: stories });
}));

userRouter.get('/:username/followers', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw new AppError('User not found', 404);

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const followers = await prisma.follow.findMany({
    where: { followingId: user.id },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      follower: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
    },
  });

  res.json({
    success: true,
    data: {
      followers: followers.map(f => f.follower),
      nextCursor: followers.length === limit ? followers[followers.length - 1].id : null,
    },
  });
}));

userRouter.get('/:username/following', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw new AppError('User not found', 404);

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      following: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
    },
  });

  res.json({
    success: true,
    data: {
      following: following.map(f => f.following),
      nextCursor: following.length === limit ? following[following.length - 1].id : null,
    },
  });
}));

userRouter.patch('/profile', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = updateProfileSchema.parse(req.body);

  if (data.website === '') {
    data.website = undefined;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      website: true,
      location: true,
      avatar: true,
      coverImage: true,
      theme: true,
      language: true,
      settings: true,
    },
  });

  res.json({ success: true, data: user });
}));

userRouter.post('/follow/:username', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user!.username === req.params.username) {
    throw new AppError('Cannot follow yourself', 400);
  }

  const targetUser = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!targetUser) throw new AppError('User not found', 404);

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: req.user!.id, followingId: targetUser.id },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    res.json({ success: true, data: { following: false } });
    return;
  }

  await prisma.follow.create({
    data: { followerId: req.user!.id, followingId: targetUser.id },
  });

  await createNotification({
    userId: targetUser.id,
    senderId: req.user!.id,
    type: 'FOLLOW',
  });

  res.json({ success: true, data: { following: true } });
}));

userRouter.post('/avatar', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { avatarUrl } = z.object({ avatarUrl: z.string().url() }).parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatar: avatarUrl },
    select: { id: true, avatar: true },
  });

  res.json({ success: true, data: user });
}));

userRouter.post('/cover', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { coverUrl } = z.object({ coverUrl: z.string().url() }).parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { coverImage: coverUrl },
    select: { id: true, coverImage: true },
  });

  res.json({ success: true, data: user });
}));

userRouter.get('/suggestions', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

  const followingIds = await prisma.follow.findMany({
    where: { followerId: req.user!.id },
    select: { followingId: true },
  });

  const excludedIds = [...followingIds.map(f => f.followingId), req.user!.id];

  const suggestions = await prisma.user.findMany({
    where: { id: { notIn: excludedIds } },
    take: limit,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      isVerified: true,
      isCreator: true,
      _count: { select: { followers: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: suggestions });
}));
