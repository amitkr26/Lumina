import { Router } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '@lumina/database';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const analytics = await prisma.userAnalytics.findUnique({
    where: { userId: req.user!.id },
  });

  if (!analytics) {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const newAnalytics = await prisma.userAnalytics.create({
      data: {
        userId: req.user!.id,
        totalFollowers: user?._count?.followers || 0,
        totalFollowing: user?._count?.following || 0,
      },
    });
    return res.json({ success: true, data: newAnalytics });
  }

  res.json({ success: true, data: analytics });
}));

analyticsRouter.get('/posts', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const posts = await prisma.post.findMany({
    where: { authorId: req.user!.id, isDraft: false },
    take: 30,
    orderBy: { publishedAt: 'desc' },
    include: {
      analytics: true,
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.json({ success: true, data: posts });
}));

analyticsRouter.get('/reels', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const reels = await prisma.reel.findMany({
    where: { authorId: req.user!.id },
    take: 30,
    orderBy: { createdAt: 'desc' },
    include: {
      analytics: true,
      _count: { select: { likes: true, comments: true } },
    },
  });

  res.json({ success: true, data: reels });
}));

analyticsRouter.get('/post/:postId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const post = await prisma.post.findUnique({
    where: { id: req.params.postId },
    include: { analytics: true },
  });

  if (!post) throw new AppError('Post not found', 404);
  if (post.authorId !== req.user!.id) throw new AppError('Unauthorized', 403);

  let postAnalytics = post.analytics;
  if (!postAnalytics) {
    postAnalytics = await prisma.postAnalytics.create({
      data: {
        postId: post.id,
        impressions: post.viewCount,
        reach: post.viewCount,
        engagements: post.likeCount + post.commentCount + post.saveCount + post.shareCount,
        saves: post.saveCount,
        shares: post.shareCount,
      },
    });
  }

  res.json({ success: true, data: postAnalytics });
}));

analyticsRouter.get('/reel/:reelId', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const reel = await prisma.reel.findUnique({
    where: { id: req.params.reelId },
    include: { analytics: true },
  });

  if (!reel) throw new AppError('Reel not found', 404);
  if (reel.authorId !== req.user!.id) throw new AppError('Unauthorized', 403);

  let reelAnalytics = reel.analytics;
  if (!reelAnalytics) {
    const avgWatchTime = reel.duration > 0 ? reel.duration * 0.6 : 0;
    reelAnalytics = await prisma.reelAnalytics.create({
      data: {
        reelId: reel.id,
        plays: reel.playCount,
        uniquePlays: reel.viewCount,
        avgWatchTime,
        completionRate: reel.duration > 0 ? (avgWatchTime / reel.duration) * 100 : 0,
        impressions: reel.viewCount,
        reach: reel.viewCount,
        engagements: reel.likeCount + reel.commentCount + reel.saveCount + reel.shareCount,
        saves: reel.saveCount,
        shares: reel.shareCount,
      },
    });
  }

  res.json({ success: true, data: reelAnalytics });
}));

analyticsRouter.get('/audience', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const analytics = await prisma.userAnalytics.findUnique({
    where: { userId: req.user!.id },
    select: {
      topCountries: true,
      topCities: true,
      ageDemographics: true,
      genderDemographics: true,
      activeHours: true,
    },
  });

  res.json({ success: true, data: analytics || {} });
}));
