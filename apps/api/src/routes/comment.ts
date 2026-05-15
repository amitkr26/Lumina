import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@lumina/database';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest, optionalAuth } from '../middleware/auth.js';
import { strictRateLimiter } from '../middleware/rateLimiter.js';
import { moderateContent } from '../services/ai.js';
import { createNotification } from '../services/notification.js';

export const commentRouter = Router();

const createCommentSchema = z.object({
  content: z.string().min(1).max(2200),
  parentId: z.string().optional(),
});

commentRouter.post('/', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const { content, parentId } = createCommentSchema.parse(req.body);
  const { postId, reelId } = req.body;

  if (!postId && !reelId) {
    throw new AppError('Post ID or Reel ID is required', 400);
  }

  const moderation = await moderateContent(content);
  const isFlagged = moderation.score < 0.5;

  if (moderation.score < 0.2) {
    throw new AppError('Comment violates community guidelines', 400);
  }

  const comment = await prisma.comment.create({
    data: {
      authorId: req.user!.id,
      postId: postId || null,
      reelId: reelId || null,
      parentId: parentId || null,
      content,
      aiSpamScore: 1 - moderation.score,
      isFlagged,
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, replies: true } },
    },
  });

  if (postId) {
    await prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.authorId !== req.user!.id) {
      await createNotification({
        userId: post.authorId,
        senderId: req.user!.id,
        type: 'COMMENT',
        content: content.substring(0, 100),
        postId,
        commentId: comment.id,
      });
    }
  }

  if (reelId) {
    await prisma.reel.update({ where: { id: reelId }, data: { commentCount: { increment: 1 } } });
    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (reel && reel.authorId !== req.user!.id) {
      await createNotification({
        userId: reel.authorId,
        senderId: req.user!.id,
        type: 'COMMENT',
        content: content.substring(0, 100),
        reelId,
        commentId: comment.id,
      });
    }
  }

  if (parentId) {
    await prisma.comment.update({ where: { id: parentId }, data: { replyCount: { increment: 1 } } });
    const parent = await prisma.comment.findUnique({ where: { id: parentId } });
    if (parent && parent.authorId !== req.user!.id) {
      await createNotification({
        userId: parent.authorId,
        senderId: req.user!.id,
        type: 'REPLY',
        content: content.substring(0, 100),
        postId: postId || undefined,
        reelId: reelId || undefined,
        commentId: comment.id,
      });
    }
  }

  res.status(201).json({ success: true, data: comment });
}));

commentRouter.get('/post/:postId', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const comments = await prisma.comment.findMany({
    where: { postId: req.params.postId, parentId: null, isFlagged: false },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ isPinned: 'desc' }, { likeCount: 'desc' }, { createdAt: 'desc' }],
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, replies: true } },
    },
  });

  const likedIds = req.user
    ? (await prisma.like.findMany({
        where: { userId: req.user.id, commentId: { in: comments.map(c => c.id) } },
        select: { commentId: true },
      })).map(l => l.commentId)
    : [];

  res.json({
    success: true,
    data: {
      comments: comments.map(c => ({ ...c, isLiked: likedIds.includes(c.id) })),
      nextCursor: comments.length === limit ? comments[comments.length - 1].id : null,
    },
  });
}));

commentRouter.get('/reel/:reelId', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const comments = await prisma.comment.findMany({
    where: { reelId: req.params.reelId, parentId: null, isFlagged: false },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: [{ isPinned: 'desc' }, { likeCount: 'desc' }, { createdAt: 'desc' }],
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, replies: true } },
    },
  });

  const likedIds = req.user
    ? (await prisma.like.findMany({
        where: { userId: req.user.id, commentId: { in: comments.map(c => c.id) } },
        select: { commentId: true },
      })).map(l => l.commentId)
    : [];

  res.json({
    success: true,
    data: {
      comments: comments.map(c => ({ ...c, isLiked: likedIds.includes(c.id) })),
      nextCursor: comments.length === limit ? comments[comments.length - 1].id : null,
    },
  });
}));

commentRouter.get('/:id/replies', optionalAuth, asyncHandler(async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const cursor = req.query.cursor as string | undefined;

  const replies = await prisma.comment.findMany({
    where: { parentId: req.params.id, isFlagged: false },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true, isVerified: true } },
      _count: { select: { likes: true, replies: true } },
    },
  });

  res.json({ success: true, data: replies });
}));

commentRouter.post('/:id/like', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) throw new AppError('Comment not found', 404);

  const existing = await prisma.like.findUnique({
    where: { userId_commentId: { userId: req.user!.id, commentId: comment.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.comment.update({ where: { id: comment.id }, data: { likeCount: { decrement: 1 } } });
    res.json({ success: true, data: { liked: false } });
    return;
  }

  await prisma.like.create({ data: { userId: req.user!.id, commentId: comment.id } });
  await prisma.comment.update({ where: { id: comment.id }, data: { likeCount: { increment: 1 } } });

  res.json({ success: true, data: { liked: true } });
}));

commentRouter.patch('/:id', authenticate, strictRateLimiter, asyncHandler(async (req: AuthRequest, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.authorId !== req.user!.id) throw new AppError('Unauthorized', 403);

  const { content } = z.object({ content: z.string().min(1).max(2200) }).parse(req.body);

  const moderation = await moderateContent(content);
  if (moderation.score < 0.2) {
    throw new AppError('Comment violates community guidelines', 400);
  }

  const updated = await prisma.comment.update({
    where: { id: comment.id },
    data: { content, isEdited: true, aiSpamScore: 1 - moderation.score },
    include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } },
  });

  res.json({ success: true, data: updated });
}));

commentRouter.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
  if (!comment) throw new AppError('Comment not found', 404);
  if (comment.authorId !== req.user!.id && req.user!.role !== 'ADMIN') throw new AppError('Unauthorized', 403);

  if (comment.postId) {
    await prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } });
  }
  if (comment.reelId) {
    await prisma.reel.update({ where: { id: comment.reelId }, data: { commentCount: { decrement: 1 } } });
  }

  await prisma.comment.delete({ where: { id: comment.id } });
  res.json({ success: true, message: 'Comment deleted' });
}));
