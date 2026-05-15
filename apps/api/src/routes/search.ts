import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { cacheMiddleware } from '../middleware/security.js';

export const searchRouter = Router();

searchRouter.get('/', optionalAuth, cacheMiddleware(60), asyncHandler(async (req: AuthRequest, res) => {
  const { q, type } = z.object({
    q: z.string().min(1).max(100),
    type: z.enum(['all', 'users', 'hashtags', 'posts', 'reels']).optional(),
  }).parse(req.query);

  const query = q.toLowerCase();
  const results: any = {};

  if (!type || type === 'all' || type === 'users') {
    results.users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
        isBanned: false,
      },
      take: 10,
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isVerified: true,
        isCreator: true,
        _count: { select: { followers: true } },
      },
    });
  }

  if (!type || type === 'all' || type === 'hashtags') {
    results.hashtags = await prisma.hashtag.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: 10,
      orderBy: [{ isTrending: 'desc' }, { postCount: 'desc' }],
    });
  }

  if (!type || type === 'all' || type === 'posts') {
    results.posts = await prisma.post.findMany({
      where: {
        caption: { contains: query, mode: 'insensitive' },
        isDraft: false,
        visibility: 'PUBLIC',
      },
      take: 10,
      orderBy: { publishedAt: 'desc' },
      include: {
        media: { take: 1 },
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });
  }

  if (!type || type === 'all' || type === 'reels') {
    results.reels = await prisma.reel.findMany({
      where: {
        caption: { contains: query, mode: 'insensitive' },
        visibility: 'PUBLIC',
      },
      take: 10,
      orderBy: [{ isTrending: 'desc' }, { playCount: 'desc' }],
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });
  }

  if (req.user) {
    await prisma.searchQuery.create({
      data: {
        userId: req.user.id,
        query: q,
        results: (results.users?.length || 0) + (results.hashtags?.length || 0) + (results.posts?.length || 0) + (results.reels?.length || 0),
      },
    });
  }

  res.json({ success: true, data: results });
}));

searchRouter.get('/trending', cacheMiddleware(300), asyncHandler(async (_req, res) => {
  const trendingHashtags = await prisma.hashtag.findMany({
    where: { isTrending: true },
    take: 20,
    orderBy: { trendingScore: 'desc' },
  });

  const trendingReels = await prisma.reel.findMany({
    where: { isTrending: true, visibility: 'PUBLIC' },
    take: 10,
    orderBy: { trendingScore: 'desc' },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
    },
  });

  res.json({ success: true, data: { trendingHashtags, trendingReels } });
}));

searchRouter.get('/recent', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const recent = await prisma.searchQuery.findMany({
    where: { userId: req.user!.id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { query: true, createdAt: true },
  });

  res.json({ success: true, data: recent });
}));

searchRouter.delete('/recent', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  await prisma.searchQuery.deleteMany({ where: { userId: req.user!.id } });
  res.json({ success: true });
}));

searchRouter.get('/explore', optionalAuth, cacheMiddleware(120), asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);
  const cursor = req.query.cursor as string | undefined;

  const posts = await prisma.post.findMany({
    where: { isDraft: false, visibility: 'PUBLIC' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ likeCount: 'desc' }, { publishedAt: 'desc' }],
    include: {
      media: { take: 1 },
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
