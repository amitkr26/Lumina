import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma, Visibility } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { uploadRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.js';
import { uploadVideo, generateThumbnail } from '../services/upload.js';
import { moderateContent, categorizeContent } from '../services/ai.js';
import { createNotification } from '../services/notification.js';
import { extractAndSaveHashtags, extractAndSaveMentions } from '../utils/hashtags.js';

export const reelRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

const createReelSchema = z.object({
  caption: z.string().max(2200).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']).optional(),
  musicTitle: z.string().max(100).optional(),
  musicArtist: z.string().max(100).optional(),
  aiHashtags: z.boolean().optional(),
});

reelRouter.post('/', authenticate, upload.single('video'), uploadRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const file = req.file;
  if (!file) throw new AppError('Video file is required', 400);

  const body = createReelSchema.parse(req.body);

  const videoResult = await uploadVideo(file.buffer, 'reels');

  let aiTags: string[] = [];
  if (body.aiHashtags && body.caption) {
    const { suggestHashtags } = await import('../services/ai.js');
    aiTags = await suggestHashtags(body.caption);
  }

  const moderation = await moderateContent(body.caption || '');
  if (!moderation.isSafe) {
    throw new AppError('Content violates community guidelines', 400);
  }

  const aiCategories = await categorizeContent(body.caption || '');

  const reel = await prisma.reel.create({
    data: {
      authorId: req.user!.id,
      caption: body.caption,
      videoUrl: videoResult.url,
      thumbnailUrl: videoResult.url + '#t=0.1',
      duration: 0,
      width: videoResult.width || 1080,
      height: videoResult.height || 1920,
      visibility: (body.visibility as Visibility) || Visibility.PUBLIC,
      musicTitle: body.musicTitle,
      musicArtist: body.musicArtist,
      aiTags,
      aiCategories,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
    },
  });

  if (body.caption) {
    await extractAndSaveHashtags(null, reel.id, body.caption);
    await extractAndSaveMentions(null, reel.id, null, body.caption);
  }

  res.status(201).json({ success: true, data: reel });
}));

reelRouter.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const reels = await prisma.reel.findMany({
    where: { visibility: 'PUBLIC' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ createdAt: 'desc' }, { playCount: 'desc' }],
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const likedIds = req.user
    ? (await prisma.like.findMany({
        where: { userId: req.user.id, reelId: { in: reels.map(r => r.id) } },
        select: { reelId: true },
      })).map(l => l.reelId)
    : [];

  res.json({
    success: true,
    data: {
      reels: reels.map(r => ({ ...r, isLiked: likedIds.includes(r.id) })),
      nextCursor: reels.length === limit ? reels[reels.length - 1].id : null,
    },
  });
}));

reelRouter.get('/trending', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

  const reels = await prisma.reel.findMany({
    where: { visibility: 'PUBLIC', isTrending: true },
    take: limit,
    orderBy: [{ trendingScore: 'desc' }, { playCount: 'desc' }],
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.json({ success: true, data: reels });
}));

reelRouter.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const reel = await prisma.reel.findUnique({
    where: { id: req.params.id },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!reel) throw new AppError('Reel not found', 404);

  await prisma.reel.update({
    where: { id: reel.id },
    data: { viewCount: { increment: 1 }, playCount: { increment: 1 } },
  });

  const isLiked = req.user
    ? !!(await prisma.like.findUnique({ where: { userId_reelId: { userId: req.user.id, reelId: reel.id } } }))
    : false;

  res.json({ success: true, data: { ...reel, isLiked } });
}));

reelRouter.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const reel = await prisma.reel.findUnique({ where: { id: req.params.id } });
  if (!reel) throw new AppError('Reel not found', 404);
  if (reel.authorId !== req.user!.id && req.user!.role !== 'ADMIN') throw new AppError('Unauthorized', 403);

  await prisma.reel.delete({ where: { id: reel.id } });
  res.json({ success: true, message: 'Reel deleted' });
}));

reelRouter.post('/:id/like', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const reel = await prisma.reel.findUnique({ where: { id: req.params.id } });
  if (!reel) throw new AppError('Reel not found', 404);

  const existing = await prisma.like.findUnique({
    where: { userId_reelId: { userId: req.user!.id, reelId: reel.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.reel.update({ where: { id: reel.id }, data: { likeCount: { decrement: 1 } } });
    res.json({ success: true, data: { liked: false } });
    return;
  }

  await prisma.like.create({ data: { userId: req.user!.id, reelId: reel.id } });
  await prisma.reel.update({ where: { id: reel.id }, data: { likeCount: { increment: 1 } } });

  if (reel.authorId !== req.user!.id) {
    await createNotification({
      userId: reel.authorId,
      senderId: req.user!.id,
      type: 'LIKE',
      reelId: reel.id,
    });
  }

  res.json({ success: true, data: { liked: true } });
}));

reelRouter.post('/:id/view', asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.reel.update({
    where: { id },
    data: { playCount: { increment: 1 } },
  });
  res.json({ success: true });
}));
