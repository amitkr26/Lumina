import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma, MediaType, Visibility } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { uploadRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.js';
import { uploadImage, uploadVideo } from '../services/upload.js';
import { generateCaption, suggestHashtags, moderateContent, categorizeContent } from '../services/ai.js';
import { createNotification } from '../services/notification.js';
import { redisClient } from '../index.js';

export const postRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const createPostSchema = z.object({
  caption: z.string().max(2200).optional(),
  visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']).optional(),
  location: z.string().max(100).optional(),
  scheduledAt: z.string().datetime().optional(),
  altText: z.string().max(500).optional(),
  aiCaption: z.boolean().optional(),
  aiHashtags: z.boolean().optional(),
});

postRouter.post('/', authenticate, upload.array('media', 10), uploadRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new AppError('At least one media file is required', 400);
  }

  const body = createPostSchema.parse(req.body);

  const mediaResults: Array<{ type: MediaType; url: string; thumbnailUrl?: string; width?: number; height?: number; size?: number; mimeType?: string; order: number }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isVideo = file.mimetype.startsWith('video');

    let result;
    if (isVideo) {
      result = await uploadVideo(file.buffer, 'posts');
    } else {
      result = await uploadImage(file.buffer, 'posts');
    }

    mediaResults.push({
      type: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
      url: result.url,
      width: result.width,
      height: result.height,
      size: result.bytes,
      mimeType: file.mimetype,
      order: i,
    });
  }

  let caption = body.caption || '';
  let aiHashtags: string[] = [];
  let aiCategories: string[] = [];

  if (body.aiCaption && caption) {
    const aiResult = await generateCaption(caption);
    caption = aiResult.caption;
    aiHashtags = aiResult.hashtags;
    aiCategories = aiResult.categories;
  }

  if (body.aiHashtags && caption) {
    aiHashtags = await suggestHashtags(caption);
  }

  const moderation = await moderateContent(caption);
  if (!moderation.isSafe) {
    throw new AppError('Content violates community guidelines', 400);
  }

  const isDraft = req.body.isDraft === 'true';

  const post = await prisma.post.create({
    data: {
      authorId: req.user!.id,
      caption,
      visibility: (body.visibility as Visibility) || Visibility.PUBLIC,
      location: body.location,
      isDraft,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      publishedAt: isDraft ? null : new Date(),
      altText: body.altText,
      aiCaption: body.aiCaption ? caption : null,
      aiHashtags,
      aiCategories,
      media: { create: mediaResults },
    },
    include: {
      media: { orderBy: { order: 'asc' } },
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
    },
  });

  if (!isDraft) {
    await extractAndSaveHashtags(post.id, null, caption);
    await extractAndSaveMentions(post.id, null, null, caption);
  }

  res.status(201).json({ success: true, data: post });
}));

postRouter.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const posts = await prisma.post.findMany({
    where: {
      isDraft: false,
      visibility: 'PUBLIC',
      publishedAt: { lte: new Date() },
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

  const likedIds = req.user
    ? (await prisma.like.findMany({
        where: { userId: req.user.id, postId: { in: posts.map(p => p.id) } },
        select: { postId: true },
      })).map(l => l.postId)
    : [];

  const savedIds = req.user
    ? (await prisma.bookmark.findMany({
        where: { userId: req.user.id, postId: { in: posts.map(p => p.id) } },
        select: { postId: true },
      })).map(b => b.postId)
    : [];

  res.json({
    success: true,
    data: {
      posts: posts.map(p => ({
        ...p,
        isLiked: likedIds.includes(p.id),
        isSaved: savedIds.includes(p.id),
      })),
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    },
  });
}));

postRouter.get('/feed', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const following = await prisma.follow.findMany({
    where: { followerId: req.user!.id },
    select: { followingId: true },
  });

  const followingIds = following.map(f => f.followingId);

  const cacheKey = `feed:${req.user!.id}:${cursor || 'first'}:${limit}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch { /* Redis unavailable */ }

  const posts = await prisma.post.findMany({
    where: {
      isDraft: false,
      visibility: 'PUBLIC',
      publishedAt: { lte: new Date() },
      authorId: { in: followingIds.length > 0 ? followingIds : [''] },
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [
      { publishedAt: 'desc' },
      { likeCount: 'desc' },
    ],
    include: {
      media: { orderBy: { order: 'asc' } },
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (posts.length === 0) {
    const explorePosts = await prisma.post.findMany({
      where: { isDraft: false, visibility: 'PUBLIC', publishedAt: { lte: new Date() } },
      take: limit,
      orderBy: [{ publishedAt: 'desc' }, { likeCount: 'desc' }],
      include: {
        media: { orderBy: { order: 'asc' } },
        author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return res.json({
      success: true,
      data: {
        posts: explorePosts,
        nextCursor: explorePosts.length === limit ? explorePosts[explorePosts.length - 1].id : null,
        isExplore: true,
      },
    });
  }

  const likedIds = (await prisma.like.findMany({
    where: { userId: req.user!.id, postId: { in: posts.map(p => p.id) } },
    select: { postId: true },
  })).map(l => l.postId);

  const savedIds = (await prisma.bookmark.findMany({
    where: { userId: req.user!.id, postId: { in: posts.map(p => p.id) } },
    select: { postId: true },
  })).map(b => b.postId);

  const result = {
    success: true,
    data: {
      posts: posts.map(p => ({
        ...p,
        isLiked: likedIds.includes(p.id),
        isSaved: savedIds.includes(p.id),
      })),
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    },
  };

  try {
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
  } catch { /* Redis unavailable */ }

  res.json(result);
}));

postRouter.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.id },
    include: {
      media: { orderBy: { order: 'asc' } },
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  if (!post) throw new AppError('Post not found', 404);

  await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });

  const isLiked = req.user
    ? !!(await prisma.like.findUnique({ where: { userId_postId: { userId: req.user.id, postId: post.id } } }))
    : false;

  const isSaved = req.user
    ? !!(await prisma.bookmark.findUnique({ where: { userId_postId: { userId: req.user.id, postId: post.id } } }))
    : false;

  res.json({ success: true, data: { ...post, isLiked, isSaved } });
}));

postRouter.patch('/:id', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw new AppError('Post not found', 404);
  if (post.authorId !== req.user!.id) throw new AppError('Unauthorized', 403);

  const { caption, visibility, location, altText } = z.object({
    caption: z.string().max(2200).optional(),
    visibility: z.enum(['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE']).optional(),
    location: z.string().max(100).optional(),
    altText: z.string().max(500).optional(),
  }).parse(req.body);

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: { caption, visibility, location, altText, isEdited: true },
    include: { media: { orderBy: { order: 'asc' } }, author: { select: { id: true, username: true, displayName: true, avatar: true } } },
  });

  res.json({ success: true, data: updated });
}));

postRouter.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw new AppError('Post not found', 404);
  if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') throw new AppError('Unauthorized', 403);

  await prisma.post.delete({ where: { id: post.id } });

  res.json({ success: true, message: 'Post deleted' });
}));

postRouter.post('/:id/like', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw new AppError('Post not found', 404);

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: req.user!.id, postId: post.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.post.update({ where: { id: post.id }, data: { likeCount: { decrement: 1 } } });
    res.json({ success: true, data: { liked: false } });
    return;
  }

  await prisma.like.create({ data: { userId: req.user!.id, postId: post.id } });
  await prisma.post.update({ where: { id: post.id }, data: { likeCount: { increment: 1 } } });

  if (post.authorId !== req.user!.id) {
    await createNotification({
      userId: post.authorId,
      senderId: req.user!.id,
      type: 'LIKE',
      postId: post.id,
    });
  }

  res.json({ success: true, data: { liked: true } });
}));

postRouter.get('/drafts', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const drafts = await prisma.post.findMany({
    where: { authorId: req.user!.id, isDraft: true },
    orderBy: { updatedAt: 'desc' },
    include: { media: { orderBy: { order: 'asc' } } },
  });

  res.json({ success: true, data: drafts });
}));

async function extractAndSaveHashtags(postId: string | null, reelId: string | null, text: string) {
  const hashtagRegex = /#(\w+)/g;
  const matches = text.match(hashtagRegex) || [];
  const tagNames = matches.map(m => m.slice(1).toLowerCase());

  for (const name of tagNames) {
    const hashtag = await prisma.hashtag.upsert({
      where: { name },
      create: { name },
      update: { postCount: { increment: postId ? 1 : 0 }, reelCount: { increment: reelId ? 1 : 0 } },
    });

    if (postId) {
      await prisma.postHashtag.create({ data: { postId, hashtagId: hashtag.id } }).catch(() => {});
    }
    if (reelId) {
      await prisma.reelHashtag.create({ data: { reelId, hashtagId: hashtag.id } }).catch(() => {});
    }
  }
}

async function extractAndSaveMentions(postId: string | null, reelId: string | null, storyId: string | null, text: string) {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex) || [];
  const usernames = matches.map(m => m.slice(1));

  for (const username of usernames) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (user) {
      await prisma.mention.create({
        data: {
          userId: user.id,
          postId,
          reelId,
          storyId,
        },
      }).catch(() => {});

      if (postId) {
        await createNotification({
          userId: user.id,
          senderId: (await prisma.post.findUnique({ where: { id: postId } }))?.authorId,
          type: 'MENTION',
          postId,
        });
      }
    }
  }
}
