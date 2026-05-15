import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const bookmarkRouter = Router();

bookmarkRouter.post('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { postId, reelId, collectionId } = z.object({
    postId: z.string().optional(),
    reelId: z.string().optional(),
    collectionId: z.string().optional(),
  }).parse(req.body);

  if (!postId && !reelId) {
    throw new AppError('Post ID or Reel ID is required', 400);
  }

  const existing = postId
    ? await prisma.bookmark.findUnique({ where: { userId_postId: { userId: req.user!.id, postId } } })
    : await prisma.bookmark.findUnique({ where: { userId_reelId: { userId: req.user!.id, reelId: reelId! } } });

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });

    if (postId) {
      await prisma.post.update({ where: { id: postId }, data: { saveCount: { decrement: 1 } } });
    }
    if (reelId) {
      await prisma.reel.update({ where: { id: reelId }, data: { saveCount: { decrement: 1 } } });
    }

    res.json({ success: true, data: { saved: false } });
    return;
  }

  const bookmark = await prisma.bookmark.create({
    data: {
      userId: req.user!.id,
      postId: postId || null,
      reelId: reelId || null,
      collectionId: collectionId || null,
    },
  });

  if (postId) {
    await prisma.post.update({ where: { id: postId }, data: { saveCount: { increment: 1 } } });
  }
  if (reelId) {
    await prisma.reel.update({ where: { id: reelId }, data: { saveCount: { increment: 1 } } });
  }

  res.status(201).json({ success: true, data: { saved: true, bookmark } });
}));

bookmarkRouter.get('/', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;
  const collectionId = req.query.collectionId as string | undefined;

  const bookmarks = await prisma.bookmark.findMany({
    where: {
      userId: req.user!.id,
      collectionId: collectionId || null,
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      post: {
        include: {
          media: { take: 1 },
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      },
      reel: {
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      bookmarks,
      nextCursor: bookmarks.length === limit ? bookmarks[bookmarks.length - 1].id : null,
    },
  });
}));

bookmarkRouter.post('/collections', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { name, description, isPrivate, coverImage } = z.object({
    name: z.string().min(1).max(50),
    description: z.string().max(200).optional(),
    isPrivate: z.boolean().optional(),
    coverImage: z.string().optional(),
  }).parse(req.body);

  const collection = await prisma.collection.create({
    data: {
      userId: req.user!.id,
      name,
      description,
      isPrivate: isPrivate || false,
      coverImage,
    },
  });

  res.status(201).json({ success: true, data: collection });
}));

bookmarkRouter.get('/collections', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const collections = await prisma.collection.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { bookmarks: true } },
    },
  });

  res.json({ success: true, data: collections });
}));

bookmarkRouter.patch('/collections/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!collection) throw new AppError('Collection not found', 404);
  if (collection.userId !== req.user!.id) throw new AppError('Unauthorized', 403);

  const { name, description, isPrivate } = z.object({
    name: z.string().min(1).max(50).optional(),
    description: z.string().max(200).optional(),
    isPrivate: z.boolean().optional(),
  }).parse(req.body);

  const updated = await prisma.collection.update({
    where: { id: collection.id },
    data: { name, description, isPrivate },
  });

  res.json({ success: true, data: updated });
}));

bookmarkRouter.delete('/collections/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const collection = await prisma.collection.findUnique({ where: { id: req.params.id } });
  if (!collection) throw new AppError('Collection not found', 404);
  if (collection.userId !== req.user!.id) throw new AppError('Unauthorized', 403);

  await prisma.collection.delete({ where: { id: collection.id } });
  res.json({ success: true, message: 'Collection deleted' });
}));
