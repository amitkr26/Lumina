import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma, MediaType } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';
import { uploadImage, uploadVideo } from '../services/upload.js';

export const storyRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const createStorySchema = z.object({
  caption: z.string().max(500).optional(),
  stickers: z.record(z.unknown()).optional(),
  isHighlight: z.boolean().optional(),
  highlightName: z.string().max(50).optional(),
});

storyRouter.post('/', authenticate, upload.single('media'), uploadRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const file = req.file;
  if (!file) throw new AppError('Media file is required', 400);

  const body = createStorySchema.parse(req.body);
  const isVideo = file.mimetype.startsWith('video');

  const result = isVideo
    ? await uploadVideo(file.buffer, 'stories')
    : await uploadImage(file.buffer, 'stories');

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const story = await prisma.story.create({
    data: {
      authorId: req.user!.id,
      type: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
      mediaUrl: result.url,
      thumbnailUrl: isVideo ? result.url + '#t=0.1' : null,
      duration: isVideo ? 15 : 5,
      width: result.width,
      height: result.height,
      caption: body.caption,
      stickers: body.stickers ? JSON.parse(JSON.stringify(body.stickers)) : null,
      expiresAt,
      isHighlight: body.isHighlight || false,
      highlightName: body.highlightName,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
    },
  });

  res.status(201).json({ success: true, data: story });
}));

storyRouter.get('/feed', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const following = await prisma.follow.findMany({
    where: { followerId: req.user!.id },
    select: { followingId: true },
  });

  const followingIds = following.map(f => f.followingId);
  followingIds.push(req.user!.id);

  const stories = await prisma.story.findMany({
    where: {
      authorId: { in: followingIds },
      expiresAt: { gt: new Date() },
    },
    orderBy: [{ authorId: 'asc' }, { createdAt: 'desc' }],
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      views: { where: { viewerId: req.user!.id } },
    },
  });

  const grouped = stories.reduce((acc, story) => {
    const authorId = story.authorId;
    if (!acc[authorId]) {
      acc[authorId] = {
        user: story.author,
        stories: [],
        seen: story.views.length > 0,
      };
    }
    acc[authorId].stories.push(story);
    return acc;
  }, {} as Record<string, { user: any; stories: any[]; seen: boolean }>);

  const sorted = Object.values(grouped).sort((a, b) => {
    if (a.seen && !b.seen) return 1;
    if (!a.seen && b.seen) return -1;
    return 0;
  });

  res.json({ success: true, data: sorted });
}));

storyRouter.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const story = await prisma.story.findUnique({
    where: { id: req.params.id },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
    },
  });

  if (!story) throw new AppError('Story not found', 404);
  if (story.expiresAt < new Date()) throw new AppError('Story expired', 404);

  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: story.id, viewerId: req.user!.id } },
    create: { storyId: story.id, viewerId: req.user!.id },
    update: { viewedAt: new Date() },
  });

  await prisma.story.update({
    where: { id: story.id },
    data: { viewCount: { increment: 1 } },
  });

  res.json({ success: true, data: story });
}));

storyRouter.post('/:id/reaction', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { emoji } = z.object({ emoji: z.string() }).parse(req.body);
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) throw new AppError('Story not found', 404);

  await prisma.storyReaction.upsert({
    where: { storyId_userId: { storyId: story.id, userId: req.user!.id } },
    create: { storyId: story.id, userId: req.user!.id, emoji },
    update: { emoji },
  });

  res.json({ success: true });
}));

storyRouter.post('/:id/reply', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const { content } = z.object({ content: z.string().min(1).max(500) }).parse(req.body);
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) throw new AppError('Story not found', 404);

  const reply = await prisma.storyReply.create({
    data: { storyId: story.id, userId: req.user!.id, content },
  });

  await prisma.story.update({
    where: { id: story.id },
    data: { replyCount: { increment: 1 } },
  });

  res.status(201).json({ success: true, data: reply });
}));

storyRouter.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const story = await prisma.story.findUnique({ where: { id: req.params.id } });
  if (!story) throw new AppError('Story not found', 404);
  if (story.authorId !== req.user!.id) throw new AppError('Unauthorized', 403);

  await prisma.story.delete({ where: { id: story.id } });
  res.json({ success: true, message: 'Story deleted' });
}));

storyRouter.get('/highlights/:username', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { username: req.params.username } });
  if (!user) throw new AppError('User not found', 404);

  const highlights = await prisma.story.findMany({
    where: { authorId: user.id, isHighlight: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      mediaUrl: true,
      thumbnailUrl: true,
      highlightName: true,
      createdAt: true,
      _count: { select: { views: true } },
    },
  });

  const grouped = highlights.reduce((acc, h) => {
    const name = h.highlightName || 'Untitled';
    if (!acc[name]) {
      acc[name] = { name, cover: h.thumbnailUrl || h.mediaUrl, stories: [] };
    }
    acc[name].stories.push(h);
    return acc;
  }, {} as Record<string, { name: string; cover: string; stories: any[] }>);

  res.json({ success: true, data: Object.values(grouped) });
}));
